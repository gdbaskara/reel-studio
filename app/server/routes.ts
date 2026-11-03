import { existsSync } from "node:fs";
import express, { Router, type Request } from "express";
import { z } from "zod";
import { CreateRequestSchema, GENERATORS, UpdateRequestSchema, VOICEBOX_PROFILE, type Clip, type Project } from "../shared/project";
import { sceneIdsOf } from "../shared/toReel";
import { loadEnv } from "../../scripts/env.mjs";
import { listVoiceboxProfiles, voiceboxRunning } from "../../scripts/providers.mjs";
import { retimeWords } from "./captions/timeWords";
import { whisperSetup } from "./captions/whisper";
import { manualPlan, planWithAi } from "./planner";
import { isRendering, startRender, videoPath } from "./render";
import { withProjectLock } from "./lock";
import { getProject, listProjects, newProjectId, saveProject, writeRender } from "./store";
import { DEFAULT_VOICEBOX_URL, generateVoice, importUpload, pruneAudio, releasePending } from "./voice";
import { HttpError, ROOT, audioDir, checkProjectId, checkSceneId } from "./paths";

const ProviderSchema = z.object({ provider: z.enum(GENERATORS), voiceboxProfile: z.string().regex(VOICEBOX_PROFILE).optional() });
const AUDIO_FILE = /^(title|step-[1-9]|outro)-\d+\.wav$/;

const parse = <T>(schema: z.ZodType<T>, value: unknown): T => {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new HttpError(400, `${issue?.path.join(".") || "body"}: ${issue?.message}`);
  }
  return result.data;
};

const params = (req: Request) => ({
  id: checkProjectId(String(req.params.id)),
  sceneId: req.params.sceneId ? checkSceneId(String(req.params.sceneId)) : "",
});

// Old audio is only cleaned up when no render is reading it.
const prune = async (project: Project) => {
  if (!isRendering(project.id)) await pruneAudio(project.id, Object.values(project.voice));
};

// Read-modify-write under the project lock, so slow voice work never overwrites newer edits.
const mutate = (id: string, change: (project: Project) => Project) =>
  withProjectLock(id, async () => {
    const saved = await saveProject(change(await getProject(id)));
    await prune(saved);
    return saved;
  });

const attachClip = async (id: string, sceneId: string, clip: Clip) => {
  try {
    return await mutate(id, (project) => ({ ...project, voice: { ...project.voice, [sceneId]: clip } }));
  } finally {
    releasePending(clip);
  }
};

export const apiRouter = (): Router => {
  const api = Router();
  api.use(express.json({ limit: "200kb" }));

  api.get("/status", async (_req, res) => {
    const env = loadEnv(ROOT);
    const whisper = whisperSetup();
    res.json({
      planner: env.ANTHROPIC_API_KEY ? "anthropic-api" : "claude-cli",
      elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
      voicebox: await voiceboxRunning(env.VOICEBOX_URL || DEFAULT_VOICEBOX_URL),
      whisper: Boolean(whisper.bin && whisper.model),
    });
  });

  api.get("/voicebox/profiles", async (_req, res) => {
    const env = loadEnv(ROOT);
    try {
      res.json(await listVoiceboxProfiles(env.VOICEBOX_URL || DEFAULT_VOICEBOX_URL));
    } catch (error) {
      throw new HttpError(503, error instanceof Error ? error.message : String(error));
    }
  });

  api.get("/projects", async (_req, res) => {
    res.json(await listProjects());
  });

  api.post("/projects", async (req, res) => {
    const { prompt, options } = parse(CreateRequestSchema, req.body);
    const plan = options.planMode === "ai" ? await planWithAi(prompt, options) : manualPlan(prompt, options);
    const now = new Date().toISOString();
    const id = newProjectId();
    const project = await saveProject({
      id,
      name: plan.name,
      prompt,
      createdAt: now,
      updatedAt: now,
      options,
      plan,
      voice: {},
      render: { status: "idle", progress: 0, updatedAt: now },
    });
    res.status(201).json(project);
  });

  api.get("/projects/:id", async (req, res) => {
    res.json(await getProject(params(req).id));
  });

  api.put("/projects/:id", async (req, res) => {
    const { id } = params(req);
    const { plan, captions, palette, sceneMap } = parse(UpdateRequestSchema, req.body);
    const ids = sceneIdsOf(plan);
    const remap = (project: Project) => Object.fromEntries(
      ids.flatMap((newId) => {
        // With a map, only mapped scenes keep a voice; new scenes start without one.
        const from = sceneMap ? sceneMap[newId] : newId;
        const clip = from ? project.voice[from] : undefined;
        if (!clip) return [];
        // Uploaded recordings follow edits to their transcript; captions are re-aligned to what Whisper heard.
        const text = plan.narration[newId] ?? "";
        const refreshed = clip.source === "upload" && clip.text !== text ? { ...clip, text, ...retimeWords(clip, text, project.options.language) } : clip;
        return [[newId, refreshed]];
      }),
    );
    res.json(
      await mutate(id, (project) => ({
        ...project,
        name: plan.name,
        plan,
        voice: remap(project),
        options: { ...project.options, captions, palette },
      })),
    );
  });

  api.post("/projects/:id/scenes/:sceneId/voice", async (req, res) => {
    const { id, sceneId } = params(req);
    const { provider, voiceboxProfile } = parse(ProviderSchema, req.body);
    const project = await getProject(id);
    const text = project.plan.narration[sceneId] ?? "";
    const profile = voiceboxProfile ?? project.options.voiceboxProfile;
    res.json(await attachClip(id, sceneId, await generateVoice(id, sceneId, text, provider, project.options.language, profile)));
  });

  api.put(
    "/projects/:id/scenes/:sceneId/voice",
    express.raw({ type: () => true, limit: "60mb" }),
    async (req, res) => {
      const { id, sceneId } = params(req);
      const project = await getProject(id);
      const text = project.plan.narration[sceneId] ?? "";
      res.json(await attachClip(id, sceneId, await importUpload(id, sceneId, req.body as Buffer, text, project.options.language)));
    },
  );

  api.delete("/projects/:id/scenes/:sceneId/voice", async (req, res) => {
    const { id, sceneId } = params(req);
    res.json(
      await mutate(id, (project) => {
        const { [sceneId]: _removed, ...voice } = project.voice;
        return { ...project, voice };
      }),
    );
  });

  api.get("/projects/:id/audio/:file", (req, res) => {
    const { id } = params(req);
    const file = String(req.params.file);
    if (!AUDIO_FILE.test(file)) throw new HttpError(400, "Invalid audio file name");
    res.sendFile(file, { root: audioDir(id) });
  });

  api.post("/projects/:id/render", async (req, res) => {
    const { id } = params(req);
    await startRender(id);
    res.status(202).json(await getProject(id));
  });

  api.get("/projects/:id/video", (req, res) => {
    const { id } = params(req);
    if (!existsSync(videoPath(id))) throw new HttpError(404, "No video rendered yet");
    res.download(videoPath(id), `${id}.mp4`);
  });

  api.post("/projects/:id/render/reset", async (req, res) => {
    const { id } = params(req);
    await writeRender(id, { status: "idle", progress: 0 });
    res.json(await getProject(id));
  });

  return api;
};

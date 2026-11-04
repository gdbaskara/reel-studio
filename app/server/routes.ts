import { existsSync } from "node:fs";
import express, { Router, type Request } from "express";
import { z } from "zod";
import { CreateRequestSchema, GENERATORS, OMNIVOICE_VOICE, UpdateRequestSchema, musicSettings, type Clip, type Project } from "../shared/project";
import { blankScenes } from "../shared/blanks";
import { sceneIdsOf } from "../shared/toReel";
import { loadEnv } from "../../scripts/env.mjs";
import { listOmnivoiceVoices, omnivoiceRunning } from "../../scripts/providers.mjs";
import { retimeWords } from "./captions/timeWords";
import { whisperSetup } from "./captions/whisper";
import { manualPlan, planWithAi } from "./planner";
import { isRendering, startRender, videoPath } from "./render";
import { withProjectLock } from "./lock";
import { getProject, listProjects, newProjectId, saveProject, writeRender } from "./store";
import { DEFAULT_OMNIVOICE_URL, generateVoice, importUpload, withDefaultVoice } from "./voice";
import { audioInUse, pruneAudio, releasePending } from "./audioFiles";
import { importMusic, musicFileName } from "./music";
import { HttpError, ROOT, audioDir, checkProjectId, checkSceneId } from "./paths";

const ProviderSchema = z.object({
  provider: z.enum(GENERATORS),
  omnivoiceVoice: z.string().regex(OMNIVOICE_VOICE).optional(),
});
const MUSIC_UPLOAD_LIMIT = "60mb";
const AUDIO_FILE = /^((title|step-[1-9]|outro)-\d+\.wav|music-\d+\.m4a)$/;

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
  if (isRendering(project.id)) return;
  await pruneAudio(project.id, audioInUse(project));
};

const uploadBody = (req: Request): Buffer => (Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0));

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
    const omnivoice = await omnivoiceRunning(env.OMNIVOICE_URL || DEFAULT_OMNIVOICE_URL);
    res.json({
      planner: env.ANTHROPIC_API_KEY ? "anthropic-api" : "claude-cli",
      elevenlabs: Boolean(env.ELEVENLABS_API_KEY),
      omnivoice,
      whisper: Boolean(whisper.bin && whisper.model),
    });
  });

  api.get("/omnivoice/voices", async (_req, res) => {
    const env = loadEnv(ROOT);
    try {
      res.json(withDefaultVoice(await listOmnivoiceVoices(env.OMNIVOICE_URL || DEFAULT_OMNIVOICE_URL), env.OMNIVOICE_VOICE));
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
    const { plan, captions, palette, look, progressBar, music, sceneMap } = parse(UpdateRequestSchema, req.body);
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
        options: {
          ...project.options,
          captions,
          palette,
          ...(look ? { look } : {}),
          ...(progressBar === undefined ? {} : { progressBar }),
          ...(music ? { music } : {}),
        },
      })),
    );
  });

  api.post("/projects/:id/scenes/:sceneId/voice", async (req, res) => {
    const { id, sceneId } = params(req);
    const { provider, omnivoiceVoice } = parse(ProviderSchema, req.body);
    const project = await getProject(id);
    const text = project.plan.narration[sceneId] ?? "";
    const choice = { omnivoiceVoice: omnivoiceVoice ?? project.options.omnivoiceVoice };
    res.json(await attachClip(id, sceneId, await generateVoice(id, sceneId, text, provider, project.options.language, choice)));
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

  // One music track per project; uploading again replaces it and keeps the volume settings.
  // The limit fits a 5-minute WAV, the longest the server keeps.
  api.put("/projects/:id/music", express.raw({ type: () => true, limit: MUSIC_UPLOAD_LIMIT }), async (req, res) => {
    const { id } = params(req);
    await getProject(id);
    const music = await importMusic(id, uploadBody(req), musicFileName(req.get("x-file-name")));
    try {
      res.json(await mutate(id, (project) => ({ ...project, music, options: { ...project.options, music: musicSettings(project.options) } })));
    } finally {
      releasePending(music);
    }
  });

  api.delete("/projects/:id/music", async (req, res) => {
    const { id } = params(req);
    res.json(
      await mutate(id, (project) => {
        const { music: _removed, ...rest } = project;
        return rest;
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
    const blank = blankScenes((await getProject(id)).plan);
    if (blank.length) throw new HttpError(400, `Fill in the on-screen text first: ${blank.join(", ")}.`);
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

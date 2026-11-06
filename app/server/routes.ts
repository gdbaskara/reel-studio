import { existsSync } from "node:fs";
import express, { Router, type Request } from "express";
import { z } from "zod";
import { CreateRequestSchema, DEFAULT_BACKDROP_DIM, DrawArtRequestSchema, GENERATORS, OMNIVOICE_VOICE, UpdateRequestSchema, musicSettings, type Clip, type Project } from "../shared/project";
import { blankScenes } from "../shared/blanks";
import { sceneIdsOf } from "../shared/toReel";
import { loadEnv } from "../../scripts/env.mjs";
import { listOmnivoiceVoices, omnivoiceRunning } from "../../scripts/providers.mjs";
import { retimeWords } from "./captions/timeWords";
import { whisperSetup } from "./captions/whisper";
import { manualPlan, planWithAi, type PlannerReply } from "./planner";
import { isRendering, startRender, videoPath } from "./render";
import { withProjectLock } from "./lock";
import { getProject, listProjects, newProjectId, saveProject, writeRender, deleteProject } from "./store";
import { DEFAULT_OMNIVOICE_URL, generateVoice, importUpload, withDefaultVoice } from "./voice";
import { audioInUse, pruneAudio, releasePending } from "./audioFiles";
import { importMusic, musicFileName } from "./music";
import { HttpError, ROOT, audioDir, checkProjectId, checkSceneId } from "./paths";
import { LOGO_UPLOAD_LIMIT, importLogo } from "./logo";
import { saveStepImage } from "./stepImage";
import { suggestRestyle } from "./restyle";
import { RestyleRequestSchema } from "../shared/restyle";
import { lookChoice } from "../../src/looks";
import { IMAGE_UPLOAD_LIMIT } from "./images";
import { duplicateProject } from "./duplicate";
import { withRhythm } from "../shared/rhythm";
import { drawIllustrations, withIllustrations } from "./illustrate";
import { newStyleId, savedStyles } from "./styleStore";
import { ApplyStyleRequestSchema, SaveStyleRequestSchema, optionsWithSavedStyle, styleFromProject, withSavedStyle } from "../shared/savedStyle";
import { firstPaletteOf } from "../../src/looks";
import { STYLE_ID, type CreateOptions } from "../shared/project";

const ProviderSchema = z.object({
  provider: z.enum(GENERATORS),
  omnivoiceVoice: z.string().regex(OMNIVOICE_VOICE).optional(),
});
const MUSIC_UPLOAD_LIMIT = "60mb";
const AUDIO_FILE = /^((title|step-[1-9]|outro)-\d+\.wav|music-\d+\.m4a|image-\d+\.png)$/;

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

  // A saved style wins over the AI's look; the AI only picks a look for an AI plan.
  api.post("/projects", async (req, res) => {
    const { prompt, options: chosen, autoLook, styleId } = parse(CreateRequestSchema, req.body);
    const style = styleId ? await savedStyles.get(styleId) : undefined;
    const pickLook = Boolean(autoLook) && !style && chosen.planMode === "ai";
    const { plan: planned, look: suggested }: PlannerReply =
      chosen.planMode === "ai" ? await planWithAi(prompt, chosen, pickLook) : { plan: manualPlan(prompt, chosen) };
    // New reels vary their step layouts, so neighbouring steps never look the same.
    // An AI plan also gets an illustration per step; a manual plan has no text to draw yet.
    const plan = chosen.planMode === "ai" ? await withIllustrations(prompt, withRhythm(planned)) : withRhythm(planned);
    // The captions checkbox on the create page starts from the style but the user's last choice wins.
    const options: CreateOptions = style
      ? { ...optionsWithSavedStyle(chosen, style), captions: chosen.captions }
      : pickLook && suggested
        ? { ...chosen, look: suggested, palette: firstPaletteOf(suggested) }
        : chosen;
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
      ...(style?.logo ? { logo: style.logo } : {}),
      render: { status: "idle", progress: 0, updatedAt: now },
    });
    res.status(201).json(project);
  });

  api.get("/projects/:id", async (req, res) => {
    res.json(await getProject(params(req).id));
  });

  api.put("/projects/:id", async (req, res) => {
    const { id } = params(req);
    const { plan, captions, palette, look, progressBar, brand, transition, tune, music, backdrop, sceneMap } = parse(UpdateRequestSchema, req.body);
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
      await mutate(id, (project) => {
        // An absent transition keeps the saved one; null clears it so the look's own applies.
        const { transition: _saved, ...rest } = project.options;
        const base = transition === undefined ? project.options : rest;
        return {
          ...project,
          name: plan.name,
          plan,
          voice: remap(project),
          options: {
            ...base,
            captions,
            palette,
            ...(look ? { look } : {}),
            ...(progressBar === undefined ? {} : { progressBar }),
            ...(brand ? { brand } : {}),
            ...(transition ? { transition } : {}),
            ...(tune ? { tune } : {}),
            ...(music ? { music } : {}),
            ...(backdrop ? { backdrop } : {}),
          },
        };
      }),
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

  // A picture for a step, saved into the project's media folder and set on that step.
  api.put("/projects/:id/scenes/:sceneId/image", express.raw({ type: () => true, limit: IMAGE_UPLOAD_LIMIT }), async (req, res) => {
    const { id, sceneId } = params(req);
    if (!sceneId.startsWith("step-")) throw new HttpError(400, "Only steps can have a picture.");
    const index = Number(sceneId.slice(5)) - 1;
    if (!(await getProject(id)).plan.steps[index]) throw new HttpError(404, "Step not found");
    const image = await saveStepImage(id, uploadBody(req));
    try {
      res.json(
        await mutate(id, (project) => ({
          ...project,
          plan: { ...project.plan, steps: project.plan.steps.map((step, i) => (i === index ? { ...step, image } : step)) },
        })),
      );
    } finally {
      releasePending(image);
    }
  });

  // A background picture, saved into the project's media folder and set as the reel's backdrop,
  // dimmed under the paper colour so text on top stays readable.
  api.put("/projects/:id/backdrop", express.raw({ type: () => true, limit: IMAGE_UPLOAD_LIMIT }), async (req, res) => {
    const { id } = params(req);
    await getProject(id);
    const image = await saveStepImage(id, uploadBody(req));
    try {
      res.json(await mutate(id, (project) => ({ ...project, options: { ...project.options, backdrop: { kind: "image", image, dim: DEFAULT_BACKDROP_DIM } } })));
    } finally {
      releasePending(image);
    }
  });

  // The logo is shrunk to a small PNG and kept inside project.json; see LogoSchema.
  api.put("/projects/:id/logo", express.raw({ type: () => true, limit: LOGO_UPLOAD_LIMIT }), async (req, res) => {
    const { id } = params(req);
    await getProject(id);
    const logo = await importLogo(uploadBody(req));
    res.json(await mutate(id, (project) => ({ ...project, logo })));
  });

  api.delete("/projects/:id/logo", async (req, res) => {
    const { id } = params(req);
    res.json(
      await mutate(id, (project) => {
        const { logo: _removed, ...rest } = project;
        return rest;
      }),
    );
  });

  api.post("/projects/:id/duplicate", async (req, res) => {
    const { id } = params(req);
    res.status(201).json(await withProjectLock(id, () => duplicateProject(id)));
  });

  // Deletes a reel for good. A reel that is rendering is left alone until the render ends.
  api.delete("/projects/:id", async (req, res) => {
    const { id } = params(req);
    if (isRendering(id)) throw new HttpError(409, "This reel is rendering. Delete it once the render is done.");
    await withProjectLock(id, () => deleteProject(id));
    res.status(204).end();
  });

  // Draws a new illustration for one step from the text the editor sends. Nothing is saved:
  // the editor sets it as an edit, so it can be undone like any other change.
  api.post("/projects/:id/scenes/:sceneId/art", async (req, res) => {
    const { id, sceneId } = params(req);
    if (!sceneId.startsWith("step-")) throw new HttpError(400, "Only steps have an illustration.");
    const step = parse(DrawArtRequestSchema, req.body);
    if (!step.title.trim() && !step.note.trim()) throw new HttpError(400, "Write the step title first, so there is something to draw.");
    const { prompt } = await getProject(id);
    const drawn = await drawIllustrations(prompt, [step]).catch((error: unknown) => {
      throw new HttpError(502, error instanceof Error ? error.message : "Claude could not draw this step.");
    });
    if (!drawn[0]) throw new HttpError(502, "Claude's drawing was not usable. Try Redraw.");
    res.json({ art: drawn[0] });
  });

  // Asks the AI for a style change. Nothing is saved: the editor previews it and applies it as an edit.
  api.post("/projects/:id/restyle", async (req, res) => {
    const { id } = params(req);
    const { request } = parse(RestyleRequestSchema, req.body);
    const { options } = await getProject(id);
    const { id: look, paletteName } = lookChoice(options.look, options.palette);
    try {
      res.json(await suggestRestyle(request, { look, palette: paletteName }));
    } catch (error) {
      throw new HttpError(502, error instanceof Error ? error.message : "The AI could not suggest a style.");
    }
  });

  api.get("/styles", async (_req, res) => {
    res.json(await savedStyles.list());
  });

  // Saves the project's look as it is stored, so the editor saves its draft first.
  api.post("/projects/:id/styles", async (req, res) => {
    const { id } = params(req);
    const { name } = parse(SaveStyleRequestSchema, req.body);
    const style = styleFromProject(await getProject(id), newStyleId(), name, new Date().toISOString());
    res.status(201).json(await savedStyles.add(style));
  });

  api.delete("/styles/:styleId", async (req, res) => {
    const styleId = String(req.params.styleId);
    if (!STYLE_ID.test(styleId)) throw new HttpError(400, "Invalid style id");
    await savedStyles.remove(styleId);
    res.json(await savedStyles.list());
  });

  api.post("/projects/:id/style", async (req, res) => {
    const { id } = params(req);
    const { styleId } = parse(ApplyStyleRequestSchema, req.body);
    const style = await savedStyles.get(styleId);
    res.json(await mutate(id, (project) => withSavedStyle(project, style)));
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

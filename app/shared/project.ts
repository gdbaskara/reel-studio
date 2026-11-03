import { z } from "zod";

export const DRAWINGS = ["arrow", "circle", "zigzag", "check", "star"] as const;
export const PALETTE_NAMES = ["warm", "green", "blue"] as const;
// "voicebox" and "mac" are kept only so clips made with those removed voices still open and play.
export const VOICE_SOURCES = ["eleven", "omnivoice", "upload", "voicebox", "mac"] as const;
export const GENERATORS = ["eleven", "omnivoice"] as const;
export const CAPTION_TIMINGS = ["provider", "whisper", "estimate"] as const;

export const SCENE_ID = /^(title|step-[1-9]|outro)$/;
export const PROJECT_ID = /^[a-z0-9-]{6,40}$/;
// Same rule the local OmniVoice server applies to voice ids (they are file names there).
export const OMNIVOICE_VOICE = /^[a-z0-9-]{1,40}$/;

const text = (max: number) => z.string().trim().max(max);

// Choices made on the create screen. They set defaults; every scene can still be changed later.
// Background music level away from the voice (0..1), and whether it dips under the voice.
export const MusicSettingsSchema = z.object({
  volume: z.number().min(0).max(1),
  duck: z.boolean(),
});
export const DEFAULT_MUSIC_SETTINGS = { volume: 0.3, duck: true } as const;

// An uploaded music track; it plays under the whole reel.
export const MusicSchema = z.object({
  src: z.string(),
  duration: z.number().positive(),
  name: text(120),
});

export const CreateOptionsSchema = z.object({
  language: z.enum(["id", "en"]),
  stepCount: z.number().int().min(2).max(7),
  planMode: z.enum(["ai", "manual"]),
  // "eleven" | "omnivoice": generate every scene's voice right after planning.
  // "upload": leave voices empty so you can upload your own recordings.
  // "mixed": leave voices empty and choose generate or upload per scene.
  // Older projects saved "mac" or "voicebox", voices that were removed; they open as "mixed".
  voiceMode: z.preprocess((v) => (v === "mac" || v === "voicebox" ? "mixed" : v), z.enum(["eleven", "omnivoice", "upload", "mixed"])),
  omnivoiceVoice: z.string().regex(OMNIVOICE_VOICE).optional(),
  captions: z.boolean(),
  palette: z.enum(PALETTE_NAMES),
  // Set once music settings are first saved; older projects have none.
  music: MusicSettingsSchema.optional(),
});

export const CreateRequestSchema = z.object({
  prompt: text(1500).min(3),
  options: CreateOptionsSchema,
});

export const StepSchema = z.object({
  title: text(60),
  note: text(120),
  drawing: z.enum(DRAWINGS),
});

export const PlanSchema = z.object({
  name: text(80).min(1),
  title: z.object({ lead: text(40), main: text(40) }),
  steps: z.array(StepSchema).min(1).max(7),
  outro: z.object({ main: text(40), sub: text(60) }),
  narration: z.record(z.string().regex(SCENE_ID), text(600)),
});

const WordSchema = z.object({ text: z.string(), start: z.number(), end: z.number() });

export const ClipSchema = z.object({
  duration: z.number().positive(),
  text: z.string(),
  words: z.array(WordSchema),
  src: z.string(),
  source: z.enum(VOICE_SOURCES),
  // How the caption timings were made; older clips have none.
  timing: z.enum(CAPTION_TIMINGS).optional(),
  // Words Whisper heard in the audio, kept so narration edits can be re-aligned without re-running it.
  heard: z.array(WordSchema).optional(),
});

export const RenderStateSchema = z.object({
  status: z.enum(["idle", "rendering", "done", "error"]),
  progress: z.number().min(0).max(1),
  error: z.string().optional(),
  updatedAt: z.string(),
});

export const ProjectSchema = z.object({
  id: z.string().regex(PROJECT_ID),
  name: text(80),
  prompt: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
  options: CreateOptionsSchema,
  plan: PlanSchema,
  voice: z.record(z.string().regex(SCENE_ID), ClipSchema),
  music: MusicSchema.optional(),
  render: RenderStateSchema,
});

// What the editor may send back when saving: the plan, the caption/palette toggles and music settings.
// sceneMap maps each new scene id to the old one whose voice it keeps (after adding or removing steps).
export const UpdateRequestSchema = z.object({
  plan: PlanSchema,
  captions: z.boolean(),
  palette: z.enum(PALETTE_NAMES),
  music: MusicSettingsSchema.optional(),
  sceneMap: z.record(z.string().regex(SCENE_ID), z.string().regex(SCENE_ID)).optional(),
});

export type CreateOptions = z.infer<typeof CreateOptionsSchema>;
export type MusicSettings = z.infer<typeof MusicSettingsSchema>;
export type Music = z.infer<typeof MusicSchema>;
export type CreateRequest = z.infer<typeof CreateRequestSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;
export type VoiceSource = (typeof VOICE_SOURCES)[number];
export type Generator = (typeof GENERATORS)[number];

export const musicSettings = (options: CreateOptions): MusicSettings => options.music ?? DEFAULT_MUSIC_SETTINGS;

import { z } from "zod";

export const DRAWINGS = ["arrow", "circle", "zigzag", "check", "star"] as const;
export const PALETTE_NAMES = ["warm", "green", "blue"] as const;
export const VOICE_SOURCES = ["eleven", "mac", "upload"] as const;

export const SCENE_ID = /^(title|step-[1-9]|outro)$/;
export const PROJECT_ID = /^[a-z0-9-]{6,40}$/;

const text = (max: number) => z.string().trim().max(max);

// Choices made on the create screen. They set defaults; every scene can still be changed later.
export const CreateOptionsSchema = z.object({
  language: z.enum(["id", "en"]),
  stepCount: z.number().int().min(2).max(7),
  planMode: z.enum(["ai", "manual"]),
  // "eleven" | "mac": generate every scene's voice right after planning.
  // "upload": leave voices empty so you can upload your own recordings.
  // "mixed": leave voices empty and choose generate or upload per scene.
  voiceMode: z.enum(["eleven", "mac", "upload", "mixed"]),
  captions: z.boolean(),
  palette: z.enum(PALETTE_NAMES),
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

export const ClipSchema = z.object({
  duration: z.number().positive(),
  text: z.string(),
  words: z.array(z.object({ text: z.string(), start: z.number(), end: z.number() })),
  src: z.string(),
  source: z.enum(VOICE_SOURCES),
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
  render: RenderStateSchema,
});

// What the editor may send back when saving: the plan and the caption/palette toggles.
// sceneMap maps each new scene id to the old one whose voice it keeps (after adding or removing steps).
export const UpdateRequestSchema = z.object({
  plan: PlanSchema,
  captions: z.boolean(),
  palette: z.enum(PALETTE_NAMES),
  sceneMap: z.record(z.string().regex(SCENE_ID), z.string().regex(SCENE_ID)).optional(),
});

export type CreateOptions = z.infer<typeof CreateOptionsSchema>;
export type CreateRequest = z.infer<typeof CreateRequestSchema>;
export type Plan = z.infer<typeof PlanSchema>;
export type Clip = z.infer<typeof ClipSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type UpdateRequest = z.infer<typeof UpdateRequestSchema>;
export type VoiceSource = (typeof VOICE_SOURCES)[number];

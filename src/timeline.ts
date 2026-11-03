import type { ReelSpec, Step, VoiceClip, Voiceover } from "./types";

export const FPS = 30;
// Voice starts this many frames into each scene, after the first words pop in.
export const VOICE_DELAY = 4;
// Breathing room after the voice ends before the cut.
const TAIL_SECONDS = 0.6;

export const MIN_SECONDS = { title: 2.5, step: 4, outro: 2.5 } as const;

type SceneBase = { readonly voiceId: string; readonly frames: number; readonly clip?: VoiceClip };

export type Scene =
  | (SceneBase & { readonly kind: "title" })
  | (SceneBase & { readonly kind: "step"; readonly step: Step; readonly number: number })
  | (SceneBase & { readonly kind: "outro" });

// A scene lasts as long as its voice clip plus a short tail, never shorter than its minimum.
// Scenes without a clip yet fall back to the minimum so they can still be previewed.
export const sceneFrames = (clip: VoiceClip | undefined, minSeconds: number): number => {
  const min = Math.ceil(minSeconds * FPS);
  return clip ? Math.max(min, VOICE_DELAY + Math.ceil((clip.duration + TAIL_SECONDS) * FPS)) : min;
};

export const sceneIds = (spec: ReelSpec): readonly string[] => [
  "title",
  ...spec.steps.map((_, i) => `step-${i + 1}`),
  "outro",
];

export const buildScenes = (spec: ReelSpec, voice: Voiceover): readonly Scene[] => {
  const withClip = (voiceId: string, minSeconds: number) => {
    const clip = voice[voiceId];
    return { voiceId, clip, frames: sceneFrames(clip, minSeconds) };
  };
  return [
    { kind: "title", ...withClip("title", MIN_SECONDS.title) },
    ...spec.steps.map(
      (step, i): Scene => ({ kind: "step", ...withClip(`step-${i + 1}`, MIN_SECONDS.step), step, number: i + 1 }),
    ),
    { kind: "outro", ...withClip("outro", MIN_SECONDS.outro) },
  ];
};

export const totalFrames = (scenes: readonly Scene[]): number => scenes.reduce((sum, s) => sum + s.frames, 0);

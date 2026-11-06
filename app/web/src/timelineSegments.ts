import { FPS } from "../../../src/timeline";

export type Segment = { readonly id: string; readonly start: number; readonly frames: number; readonly share: number; readonly seconds: number };

// Each scene's place on the reel's timeline: where it starts, how long it lasts and its share of the whole.
export const timelineSegments = (scenes: readonly { readonly id: string; readonly frames: number }[]): readonly Segment[] => {
  const total = Math.max(1, scenes.reduce((sum, s) => sum + s.frames, 0));
  return scenes.reduce<readonly Segment[]>((acc, scene) => {
    const last = acc[acc.length - 1];
    const start = last ? last.start + last.frames : 0;
    return [...acc, { id: scene.id, start, frames: scene.frames, share: scene.frames / total, seconds: Math.round((scene.frames / FPS) * 10) / 10 }];
  }, []);
};

// The scene on screen at a frame of the whole reel; past the end it is the last scene.
export const sceneAtFrame = (segments: readonly Segment[], frame: number): number => {
  const index = segments.findIndex((s) => frame >= s.start && frame < s.start + s.frames);
  return index >= 0 ? index : Math.max(0, segments.length - 1);
};

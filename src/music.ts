import { FPS, VOICE_DELAY, type Scene } from "./timeline";

// Under the voice, music drops to this share of its normal volume.
export const DUCK_RATIO = 0.3;
// Frames to slide down before a voice starts and back up after it ends.
const DUCK_RAMP = 8;
// Fade in at the start of the reel and out at the end.
export const FADE_FRAMES = 15;

export type VoiceWindow = { readonly start: number; readonly end: number };

export type MusicMix = {
  readonly volume: number;
  readonly duck: boolean;
  readonly windows: readonly VoiceWindow[];
  readonly total: number;
};

export const sceneStart = (scenes: readonly Scene[], index: number): number =>
  scenes.slice(0, index).reduce((sum, s) => sum + s.frames, 0);

// Frames on the reel timeline where a voice clip is playing.
export const voiceWindows = (scenes: readonly Scene[]): readonly VoiceWindow[] =>
  scenes.flatMap((scene, i) => {
    if (!scene.clip) return [];
    const start = sceneStart(scenes, i) + VOICE_DELAY;
    return [{ start, end: start + Math.ceil(scene.clip.duration * FPS) }];
  });

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

// 1 inside a voice window, sliding to 0 over DUCK_RAMP frames either side of it.
const voiceNearness = (frame: number, windows: readonly VoiceWindow[]): number =>
  windows.reduce((most, { start, end }) => {
    const distance = frame < start ? start - frame : frame > end ? frame - end : 0;
    return Math.max(most, clamp01(1 - distance / DUCK_RAMP));
  }, 0);

const fade = (frame: number, total: number): number => clamp01(Math.min((frame + 1) / FADE_FRAMES, (total - frame) / FADE_FRAMES));

// Music volume at a frame of the reel.
export const musicVolume = (frame: number, { volume, duck, windows, total }: MusicMix): number => {
  const ducked = duck ? 1 - (1 - DUCK_RATIO) * voiceNearness(frame, windows) : 1;
  return volume * fade(frame, total) * ducked;
};

// One back-to-back copy of the song. from and duration are in the player's frames (starting at
// offset on the reel), trim is how far into the song the copy starts, reelStart is where it
// becomes audible on the reel.
export type MusicCopy = { readonly from: number; readonly duration: number; readonly trim: number; readonly reelStart: number };

// Copies of a song `length` frames long that fill the reel from frame `offset` to `total`.
// A scene preview passes its start as offset, so it hears the same part of the song as the render.
export const musicCopies = (total: number, length: number, offset: number): readonly MusicCopy[] =>
  Array.from({ length: Math.ceil(total / length) }, (_, i) => {
    const copyStart = i * length;
    const reelStart = Math.max(copyStart, offset);
    const end = Math.min(copyStart + length, total);
    return { from: reelStart - offset, duration: end - reelStart, trim: reelStart - copyStart, reelStart };
  }).filter((copy) => copy.duration > 0);

import type { CaptionWord } from "./types";

// Small, continuous motion that keeps a scene alive after its entrances, while the voice talks.

// The whole scene grows slowly, about 3.5% across its length, so the frame never sits still.
export const DRIFT = 0.035;
export const drift = (frame: number, duration: number): number => 1 + DRIFT * Math.min(1, Math.max(0, frame / Math.max(1, duration)));

// A drawn doodle floats up and down by a few pixels, once every 2.4 seconds.
const BOB_PX = 6;
const BOB_SECONDS = 2.4;
export const bob = (frame: number, start: number, fps: number): number =>
  frame < start ? 0 : Math.sin(((frame - start) / fps / BOB_SECONDS) * 2 * Math.PI) * BOB_PX;

// Compares words the way they sound: no case, no punctuation, no *emphasis* markers.
export const wordKey = (text: string): string => text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export type Spoken = { readonly key: string; readonly t: number };

// The word being said at this moment (seconds into the clip), with how far through it the voice is.
export const spokenWord = (words: readonly CaptionWord[], seconds: number): Spoken | null => {
  const word = words.find((w) => seconds >= w.start && seconds < w.end);
  return word ? { key: wordKey(word.text), t: (seconds - word.start) / Math.max(0.01, word.end - word.start) } : null;
};

// How strongly an on-screen word echoes the voice: 0 to 1, peaking mid-word. Short words such as
// "the" are skipped, so only the words that carry meaning pulse.
const MIN_ECHO_LETTERS = 4;
export const echoAmount = (text: string, spoken: Spoken | null): number => {
  const key = wordKey(text);
  if (!spoken || key.length < MIN_ECHO_LETTERS || key !== spoken.key) return 0;
  return Math.sin(Math.PI * Math.min(1, Math.max(0, spoken.t)));
};

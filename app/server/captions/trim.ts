import type { TimedWord } from "./align";

// Generated voices (Chatterbox especially) sometimes keep talking after the script ends,
// e.g. an invented "Sama-sama." Once Whisper has placed the last scripted word, cut there.
const PAD_SECONDS = 0.35;
// Only trim when the tail is long enough to matter.
const MIN_TAIL_SECONDS = 0.6;

// Returns where to cut the clip, or null to keep it whole.
export const speechEnd = (words: readonly TimedWord[], duration: number): number | null => {
  const last = words[words.length - 1];
  if (!last) return null;
  const cut = last.end + PAD_SECONDS;
  return duration - cut >= MIN_TAIL_SECONDS ? cut : null;
};

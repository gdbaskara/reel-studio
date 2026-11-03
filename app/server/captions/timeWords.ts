import { estimateWords } from "../../../scripts/providers.mjs";
import { alignToScript, type Language, type TimedWord } from "./align";
import { transcribeWithWhisper } from "./whisper";

export type Timing = "whisper" | "estimate";
export type TimedCaptions = { readonly words: TimedWord[]; readonly timing: Timing; readonly heard?: TimedWord[] };
export type Transcribe = (wav: string, language: Language) => Promise<TimedWord[] | null>;

// Below this share of script words found in the audio, the recording probably says something else.
const MIN_MATCH = 0.5;

const fromHeard = (text: string, duration: number, language: Language, heard: TimedWord[] | undefined): TimedCaptions => {
  if (heard?.length) {
    const aligned = alignToScript(text, heard, duration, language);
    if (aligned.matched >= MIN_MATCH) return { words: [...aligned.words], timing: "whisper", heard };
  }
  return { words: estimateWords(text, duration), timing: "estimate", ...(heard ? { heard } : {}) };
};

export const timeWords = async (
  wav: string,
  text: string,
  duration: number,
  language: Language,
  transcribe: Transcribe = transcribeWithWhisper,
): Promise<TimedCaptions> => {
  if (!text.trim()) return { words: [], timing: "estimate" };
  const heard = await transcribe(wav, language).catch((error: unknown) => {
    console.warn(`Whisper failed, using estimated captions: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
  return fromHeard(text, duration, language, heard ?? undefined);
};

// Narration edits re-use the stored recognition, so no audio processing is needed.
export const retimeWords = (
  clip: { readonly duration: number; readonly heard?: TimedWord[] },
  text: string,
  language: Language,
): TimedCaptions => (text.trim() ? fromHeard(text, clip.duration, language, clip.heard) : { words: [], timing: "estimate" });

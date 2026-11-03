import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { Clip, CreateOptions, Generator } from "../shared/project";
import { loadEnv } from "../../scripts/env.mjs";
import { DEFAULT_OMNIVOICE_URL, DEFAULT_VOICEBOX_URL, durationSeconds, elevenLabs, omnivoice, toWav, voicebox } from "../../scripts/providers.mjs";
import { timeWords, type TimedCaptions } from "./captions/timeWords";
import { speechEnd } from "./captions/trim";
import { HttpError, ROOT, audioDir, audioUrl, checkSceneId } from "./paths";
import { dropPending, markPending, withTemp } from "./audioFiles";

const MAX_UPLOAD_SECONDS = 90;
export { DEFAULT_OMNIVOICE_URL, DEFAULT_VOICEBOX_URL };
const DEFAULT_OMNIVOICE_VOICE = "wanita";
type Language = CreateOptions["language"];

type Take = {
  readonly projectId: string;
  readonly sceneId: string;
  readonly raw: string;
  readonly text: string;
  readonly source: Clip["source"];
  readonly language: Language;
  // Word timings from the voice provider; null means Whisper (or an estimate) times the captions.
  readonly words: Clip["words"] | null;
};

// Cuts speech a generated voice added after the script ends; returns the clip's new length.
const trimTail = async (wav: string, timed: TimedCaptions, duration: number): Promise<{ duration: number; timed: TimedCaptions }> => {
  const cut = timed.timing === "whisper" ? speechEnd(timed.words, duration) : null;
  if (cut === null) return { duration, timed };
  const trimmed = `${wav}.trim.wav`;
  toWav(wav, trimmed, cut);
  await rename(trimmed, wav);
  const length = durationSeconds(wav);
  return { duration: length, timed: { ...timed, heard: timed.heard?.filter((w) => w.start < length) } };
};

// Each new take gets its own file name, so a clip can move between scenes without renaming.
const finishClip = async ({ projectId, sceneId, raw, text, source, language, words }: Take): Promise<Clip> => {
  const dir = audioDir(projectId);
  await mkdir(dir, { recursive: true });
  const file = `${checkSceneId(sceneId)}-${Date.now()}.wav`;
  const wav = join(dir, file);
  markPending(file);
  try {
    toWav(raw, wav, MAX_UPLOAD_SECONDS + 1);
  } catch {
    dropPending(file);
    throw new HttpError(400, "Could not read that audio file. Try MP3, M4A or WAV.");
  }
  const duration = durationSeconds(wav);
  // ffmpeg stops reading just past the limit, so anything at the limit was longer.
  if (duration >= MAX_UPLOAD_SECONDS) {
    dropPending(file);
    await unlink(wav);
    throw new HttpError(400, `Keep each scene's audio under ${MAX_UPLOAD_SECONDS}s.`);
  }
  const src = audioUrl(projectId, file);
  if (words) return { duration, text, words, src, source, timing: "provider" };
  try {
    const timed = await timeWords(wav, text, duration, language);
    // Generated clips without provider timings may run past the script; uploads are the user's own takes and are never cut.
    const final = source !== "upload" ? await trimTail(wav, timed, duration) : { duration, timed };
    return { duration: final.duration, text, src, source, ...final.timed };
  } catch (error) {
    dropPending(file);
    await unlink(wav).catch(() => undefined);
    throw error;
  }
};

const providerError = (error: unknown) => new HttpError(502, error instanceof Error ? error.message : String(error));

// Per-request voice choices; each falls back to the project option, then .env.local.
export type VoiceChoice = { readonly voiceboxProfile?: string; readonly omnivoiceVoice?: string };

export const generateVoice = (
  projectId: string,
  sceneId: string,
  text: string,
  provider: Generator,
  language: Language,
  { voiceboxProfile, omnivoiceVoice }: VoiceChoice = {},
): Promise<Clip> => {
  if (!text.trim()) throw new HttpError(400, "This scene has no narration text to speak.");
  const env = loadEnv(ROOT);
  return withTemp(async (dir) => {
    if (provider === "eleven") {
      if (!env.ELEVENLABS_API_KEY) throw new HttpError(400, "Missing ELEVENLABS_API_KEY in .env.local");
      const synth = elevenLabs({
        apiKey: env.ELEVENLABS_API_KEY,
        voiceId: env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9",
        modelId: env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
      });
      const raw = join(dir, "voice.mp3");
      const words = await synth(text, raw).catch((error: unknown) => {
        throw providerError(error);
      });
      return finishClip({ projectId, sceneId, raw, text, source: "eleven", language, words });
    }
    if (provider === "omnivoice") {
      const voice = omnivoiceVoice || env.OMNIVOICE_VOICE || DEFAULT_OMNIVOICE_VOICE;
      const raw = join(dir, "voice.wav");
      await omnivoice({ baseUrl: env.OMNIVOICE_URL || DEFAULT_OMNIVOICE_URL, voice, language })(text, raw).catch((error: unknown) => {
        throw providerError(error);
      });
      return finishClip({ projectId, sceneId, raw, text, source: "omnivoice", language, words: null });
    }
    const profileId = voiceboxProfile || (language === "id" ? env.VOICEBOX_PROFILE_ID : env.VOICEBOX_PROFILE_EN) || env.VOICEBOX_PROFILE;
    if (!profileId) throw new HttpError(400, "Pick a Voicebox voice profile, or set VOICEBOX_PROFILE in .env.local.");
    const raw = join(dir, "voice.wav");
    await voicebox({ baseUrl: env.VOICEBOX_URL || DEFAULT_VOICEBOX_URL, profileId, language })(text, raw).catch((error: unknown) => {
      throw providerError(error);
    });
    return finishClip({ projectId, sceneId, raw, text, source: "voicebox", language, words: null });
  });
};

// Uploaded recordings have no word timings; Whisper times the captions, or they are estimated.
export const importUpload = (projectId: string, sceneId: string, body: Buffer, text: string, language: Language): Promise<Clip> => {
  if (!body.length) throw new HttpError(400, "The upload was empty.");
  return withTemp(async (dir) => {
    const raw = join(dir, "upload.bin");
    await writeFile(raw, body);
    return finishClip({ projectId, sceneId, raw, text, source: "upload", language, words: null });
  });
};

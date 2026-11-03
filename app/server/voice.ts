import { mkdtemp, mkdir, readdir, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Clip, CreateOptions } from "../shared/project";
import { loadEnv } from "../../scripts/env.mjs";
import { durationSeconds, elevenLabs, estimateWords, macSay, toWav } from "../../scripts/providers.mjs";
import { HttpError, ROOT, audioDir, audioUrl, checkSceneId } from "./paths";

const MAX_UPLOAD_SECONDS = 90;
const MAC_VOICES = { id: "Damayanti", en: "Samantha" } as const;

// Audio files written but not yet saved into project.json; pruning must leave them alone.
const pending = new Set<string>();
export const releasePending = (clip: Clip) => pending.delete(clip.src.split("/").pop() ?? "");

const withTemp = async <T>(fn: (dir: string) => Promise<T>): Promise<T> => {
  const dir = await mkdtemp(join(tmpdir(), "reel-"));
  try {
    return await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// Each new take gets its own file name, so a clip can move between scenes without renaming.
const finishClip = async (
  projectId: string,
  sceneId: string,
  raw: string,
  text: string,
  source: Clip["source"],
  words: Clip["words"] | null,
): Promise<Clip> => {
  const dir = audioDir(projectId);
  await mkdir(dir, { recursive: true });
  const file = `${checkSceneId(sceneId)}-${Date.now()}.wav`;
  const wav = join(dir, file);
  pending.add(file);
  try {
    toWav(raw, wav, MAX_UPLOAD_SECONDS + 1);
  } catch {
    pending.delete(file);
    throw new HttpError(400, "Could not read that audio file. Try MP3, M4A or WAV.");
  }
  const duration = durationSeconds(wav);
  // ffmpeg stops reading just past the limit, so anything at the limit was longer.
  if (duration >= MAX_UPLOAD_SECONDS) {
    pending.delete(file);
    await unlink(wav);
    throw new HttpError(400, `Keep each scene's audio under ${MAX_UPLOAD_SECONDS}s.`);
  }
  return { duration, text, words: words ?? (text.trim() ? estimateWords(text, duration) : []), src: audioUrl(projectId, file), source };
};

export const generateVoice = (
  projectId: string,
  sceneId: string,
  text: string,
  provider: "eleven" | "mac",
  language: CreateOptions["language"],
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
      const words = await synth(text, raw);
      return finishClip(projectId, sceneId, raw, text, "eleven", words);
    }
    const raw = join(dir, "voice.aiff");
    await macSay({ voice: MAC_VOICES[language], rate: env.MAC_RATE || 185 })(text, raw);
    return finishClip(projectId, sceneId, raw, text, "mac", null);
  });
};

// Uploaded recordings have no word timings, so captions are spread over the clip by word length.
export const importUpload = (projectId: string, sceneId: string, body: Buffer, text: string): Promise<Clip> => {
  if (!body.length) throw new HttpError(400, "The upload was empty.");
  return withTemp(async (dir) => {
    const raw = join(dir, "upload.bin");
    await writeFile(raw, body);
    return finishClip(projectId, sceneId, raw, text, "upload", null);
  });
};

// Deletes audio files no longer referenced by any scene.
export const pruneAudio = async (projectId: string, keep: readonly Clip[]) => {
  const dir = audioDir(projectId);
  const used = new Set(keep.map((clip) => clip.src.split("/").pop()));
  const files = await readdir(dir).catch(() => [] as string[]);
  const stale = files.filter((f) => !used.has(f) && !pending.has(f));
  await Promise.all(stale.map((f) => unlink(join(dir, f)).catch(() => undefined)));
};

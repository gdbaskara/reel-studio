import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { loadEnv } from "../../../scripts/env.mjs";
import { ROOT } from "../paths";
import type { Language, TimedWord } from "./align";
import { parseWhisperJson } from "./whisperJson";

const run = promisify(execFile);
const TIMEOUT_MS = 60_000;
export const DEFAULT_MODEL = join(homedir(), ".cache", "reel-studio", "ggml-large-v3-turbo-q5_0.bin");
const BINARIES = ["/opt/homebrew/bin/whisper-cli", "/usr/local/bin/whisper-cli"];

export const whisperSetup = () => {
  const env = loadEnv(ROOT);
  const bin = [env.WHISPER_BIN, ...BINARIES].find((p): p is string => Boolean(p) && existsSync(p as string)) ?? null;
  const model = env.WHISPER_MODEL || DEFAULT_MODEL;
  return { bin, model: existsSync(model) ? model : null };
};

// Returns the words Whisper heard, or null when whisper.cpp or its model is not installed.
export const transcribeWithWhisper = async (wav: string, language: Language): Promise<TimedWord[] | null> => {
  const { bin, model } = whisperSetup();
  if (!bin || !model) return null;
  const dir = await mkdtemp(join(tmpdir(), "whisper-"));
  try {
    const mono = join(dir, "audio.wav");
    await run("ffmpeg", ["-loglevel", "error", "-y", "-i", wav, "-ar", "16000", "-ac", "1", "-c:a", "pcm_s16le", mono], { timeout: TIMEOUT_MS });
    const prefix = join(dir, "out");
    await run(bin, ["-m", model, "-f", mono, "-l", language, "-ojf", "-ml", "1", "-sow", "-np", "-of", prefix], { timeout: TIMEOUT_MS });
    return parseWhisperJson(JSON.parse(await readFile(`${prefix}.json`, "utf8")));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
};

// Usage: node scripts/voiceover.mjs <reel> [--provider=eleven|omnivoice] [--lang=id|en]
// Reads voiceover/<reel>.txt (id|text per line), writes public/vo/<reel>/<id>.wav
// and src/voiceover/<reel>.json with durations and word timings for captions.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "./env.mjs";
import { DEFAULT_OMNIVOICE_URL, durationSeconds, elevenLabs, estimateWords, omnivoice, toWav } from "./providers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const [reel, ...flags] = process.argv.slice(2);
const flag = (name, fallback) => (flags.find((f) => f.startsWith(`--${name}=`)) ?? `--${name}=${fallback}`).split("=")[1];
const provider = flag("provider", "eleven");
const language = flag("lang", "id");

if (!reel || !/^[a-z0-9-]+$/.test(reel)) {
  console.error("Usage: node scripts/voiceover.mjs <reel> [--provider=eleven|omnivoice] [--lang=id|en]");
  process.exit(1);
}

const env = loadEnv(ROOT);
const synth = (() => {
  if (provider === "omnivoice") {
    const voice = env.OMNIVOICE_VOICE || "wanita";
    return { run: omnivoice({ baseUrl: env.OMNIVOICE_URL || DEFAULT_OMNIVOICE_URL, voice, language }), ext: "wav" };
  }
  if (provider !== "eleven") throw new Error(`Unknown provider "${provider}"`);
  if (!env.ELEVENLABS_API_KEY) throw new Error("Missing ELEVENLABS_API_KEY. Add it to .env.local");
  const run = elevenLabs({
    apiKey: env.ELEVENLABS_API_KEY,
    voiceId: env.ELEVENLABS_VOICE_ID || "cgSgspJ2msm6clMCkdW9",
    modelId: env.ELEVENLABS_MODEL_ID || "eleven_multilingual_v2",
  });
  return { run, ext: "mp3" };
})();

const lines = readFileSync(join(ROOT, "voiceover", `${reel}.txt`), "utf8")
  .split("\n")
  .filter((line) => line.includes("|"))
  .map((line) => {
    const at = line.indexOf("|");
    return { id: line.slice(0, at).trim(), text: line.slice(at + 1).trim() };
  });

const outDir = join(ROOT, "public", "vo", reel);
mkdirSync(outDir, { recursive: true });
mkdirSync(join(ROOT, "src", "voiceover"), { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "vo-"));

try {
  const clips = {};
  for (const { id, text } of lines) {
    const raw = join(tmp, `${id}.${synth.ext}`);
    const wav = join(outDir, `${id}.wav`);
    const timed = await synth.run(text, raw);
    toWav(raw, wav);
    const duration = durationSeconds(wav);
    clips[id] = { duration, text, words: timed ?? estimateWords(text, duration) };
    console.log(`${id}: ${duration.toFixed(2)}s, ${clips[id].words.length} words`);
  }
  writeFileSync(join(ROOT, "src", "voiceover", `${reel}.json`), `${JSON.stringify(clips, null, 2)}\n`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const finishWords = (state) => (state.current ? [...state.words, state.current] : state.words);

export const elevenLabs = ({ apiKey, voiceId, modelId }) => async (text, mp3Path) => {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      model_id: modelId,
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.3, use_speaker_boost: true },
    }),
  });
  if (!res.ok) throw new Error(`ElevenLabs returned ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const { audio_base64: audio, alignment } = await res.json();
  writeFileSync(mp3Path, Buffer.from(audio, "base64"));
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
  const state = characters.reduce(
    (acc, ch, i) => {
      if (/\s/.test(ch)) return { words: acc.current ? [...acc.words, acc.current] : acc.words, current: null };
      const current = acc.current
        ? { ...acc.current, text: acc.current.text + ch, end: ends[i] }
        : { text: ch, start: starts[i], end: ends[i] };
      return { words: acc.words, current };
    },
    { words: [], current: null },
  );
  return finishWords(state);
};

// Voicebox (github.com/jamiepine/voicebox) runs locally. Qwen3-TTS has no Indonesian,
// so Indonesian narration goes to Chatterbox with Malay, the closest supported language.
export const voiceboxEngine = (language) =>
  language === "id" ? { language: "ms", engine: "chatterbox" } : { language: "en", engine: "qwen" };

// Shared by the local TTS servers (Voicebox, OmniVoice): a refused connection becomes a
// "start it like this" hint, and FastAPI's {"detail": ...} error bodies become readable messages.
const localServer = ({ name, notRunning, slow }) => ({
  fetch: async (url, init) => {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (error?.name === "TimeoutError") throw new Error(slow);
      throw new Error(notRunning);
    }
  },
  error: async (res) => {
    const body = await res.text();
    const detail = (() => {
      try {
        const parsed = JSON.parse(body).detail;
        return typeof parsed === "string" ? parsed : JSON.stringify(parsed);
      } catch {
        return body;
      }
    })();
    return new Error(`${name} returned ${res.status}: ${String(detail).slice(0, 300)}`);
  },
  running: (baseUrl) => fetch(`${baseUrl}/health`, { signal: AbortSignal.timeout(1_500) }).then((res) => res.ok, () => false),
});

export const DEFAULT_VOICEBOX_URL = "http://127.0.0.1:17493";
const VOICEBOX_TIMEOUT_MS = 180_000;
const voiceboxServer = localServer({
  name: "Voicebox",
  notRunning: "Voicebox is not reachable. Open Voicebox and turn on 'Keep server running', or set VOICEBOX_URL.",
  slow: "Voicebox took too long to answer. The first run may still be downloading its model.",
});

// Returns null: Voicebox gives no word timings, so captions are timed afterwards.
export const voicebox = ({ baseUrl, profileId, language }) => async (text, wavPath) => {
  if (!profileId) throw new Error("Pick a Voicebox voice profile (or set VOICEBOX_PROFILE in .env.local).");
  const res = await voiceboxServer.fetch(`${baseUrl}/generate/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_id: profileId, text, ...voiceboxEngine(language) }),
    signal: AbortSignal.timeout(VOICEBOX_TIMEOUT_MS),
  });
  if (!res.ok) throw await voiceboxServer.error(res);
  writeFileSync(wavPath, Buffer.from(await res.arrayBuffer()));
  return null;
};

export const listVoiceboxProfiles = async (baseUrl) => {
  const res = await voiceboxServer.fetch(`${baseUrl}/profiles`, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw await voiceboxServer.error(res);
  const list = await res.json();
  return (Array.isArray(list) ? list : [])
    .filter((p) => typeof p?.id === "string" && p.id)
    .map((p) => ({ id: p.id, name: String(p.name ?? p.id), language: String(p.language ?? "") }));
};

export const voiceboxRunning = (baseUrl) => voiceboxServer.running(baseUrl);

// OmniVoice (github.com/k2-fsa/OmniVoice) runs locally via tts/omnivoice (`npm run omnivoice`).
// It speaks Indonesian natively and clones every clip from one reference voice, so scenes match.
export const DEFAULT_OMNIVOICE_URL = "http://127.0.0.1:17600";
export const OMNIVOICE_VOICE_ID = /^[a-z0-9-]{1,40}$/;
const OMNIVOICE_TIMEOUT_MS = 300_000;
const omnivoiceServer = localServer({
  name: "OmniVoice",
  notRunning: "OmniVoice is not running. Start it with: npm run omnivoice",
  slow: "OmniVoice took too long to answer. The first run may still be loading its model.",
});

// Returns null: OmniVoice gives no word timings, so captions are timed afterwards.
export const omnivoice = ({ baseUrl, voice, language }) => async (text, wavPath) => {
  if (!OMNIVOICE_VOICE_ID.test(voice ?? "")) throw new Error(`Invalid OmniVoice voice "${voice}". Use lowercase letters, digits and dashes.`);
  const res = await omnivoiceServer.fetch(`${baseUrl}/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language, voice }),
    signal: AbortSignal.timeout(OMNIVOICE_TIMEOUT_MS),
  });
  if (!res.ok) throw await omnivoiceServer.error(res);
  writeFileSync(wavPath, Buffer.from(await res.arrayBuffer()));
  return null;
};

export const listOmnivoiceVoices = async (baseUrl) => {
  const res = await omnivoiceServer.fetch(`${baseUrl}/voices`, { signal: AbortSignal.timeout(5_000) });
  if (!res.ok) throw await omnivoiceServer.error(res);
  const list = await res.json();
  return (Array.isArray(list) ? list : [])
    .filter((v) => typeof v?.id === "string" && OMNIVOICE_VOICE_ID.test(v.id))
    .map((v) => ({ id: v.id, name: String(v.name ?? v.id), builtin: v.builtin === true }));
};

export const omnivoiceRunning = (baseUrl) => omnivoiceServer.running(baseUrl);

export const estimateWords = (text, duration) => {
  const tokens = text.split(/\s+/).filter(Boolean);
  const weights = tokens.map((t) => t.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  return tokens.map((t, i) => {
    const before = weights.slice(0, i).reduce((a, b) => a + b, 0);
    return { text: t, start: (before / total) * duration, end: ((before + weights[i]) / total) * duration };
  });
};

export const toWav = (input, wavPath, maxSeconds = 600) =>
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", input, "-t", String(maxSeconds), "-vn", "-ar", "48000", wavPath], {
    timeout: 120_000,
  });

export const durationSeconds = (wavPath) => {
  const match = execFileSync("afinfo", [wavPath], { encoding: "utf8" }).match(/estimated duration:\s*([\d.]+)/);
  if (!match) throw new Error(`Could not read duration of ${wavPath}`);
  return Number(match[1]);
};


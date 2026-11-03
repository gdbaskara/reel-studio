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

// macOS `say` gives no timings, so words are spread over the clip by length.
export const macSay = ({ voice, rate }) => async (text, aiffPath) => {
  // Text goes through a file so narration starting with "-" can never be read as an option.
  const textPath = `${aiffPath}.txt`;
  writeFileSync(textPath, text);
  execFileSync("say", ["-v", voice, "-r", String(rate), "-o", aiffPath, "-f", textPath]);
  return null;
};

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


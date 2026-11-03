import type { TimedWord } from "./align";

// Reads whisper.cpp `-ojf -ml 1 -sow` output, where each segment is (about) one word.
type Segment = { readonly offsets?: { readonly from?: unknown; readonly to?: unknown }; readonly text?: unknown };

const NON_SPEECH = /^[[(].*[\])]$/;

const segmentWords = (segment: Segment): TimedWord[] => {
  const from = segment.offsets?.from;
  const to = segment.offsets?.to;
  if (typeof from !== "number" || typeof to !== "number" || typeof segment.text !== "string") return [];
  const text = segment.text.trim();
  if (!text || NON_SPEECH.test(text)) return [];
  const parts = text.split(/\s+/);
  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const span = (to - from) / 1000;
  return parts.map((p, i) => {
    const before = parts.slice(0, i).reduce((sum, q) => sum + q.length, 0);
    return { text: p, start: from / 1000 + (before / total) * span, end: from / 1000 + ((before + p.length) / total) * span };
  });
};

export const parseWhisperJson = (json: unknown): TimedWord[] => {
  const segments = (json as { transcription?: unknown } | null)?.transcription;
  return Array.isArray(segments) ? segments.flatMap((s: Segment) => segmentWords(s)) : [];
};

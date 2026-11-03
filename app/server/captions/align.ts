// Maps words recognised by Whisper back onto the known narration script, so captions
// keep the script's spelling but take their timing from the real audio.

export type TimedWord = { readonly text: string; readonly start: number; readonly end: number };
export type Language = "id" | "en";
export type Alignment = { readonly words: readonly TimedWord[]; readonly matched: number };

const NUMBER_WORDS: Record<Language, readonly string[]> = {
  id: ["nol", "satu", "dua", "tiga", "empat", "lima", "enam", "tujuh", "delapan", "sembilan", "sepuluh"],
  en: ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"],
};

const MATCH = 2;
const GAP = -1;
const MISMATCH = -1;
const FUZZY_RATIO = 0.6;
// Shortest time a caption word stays highlighted; missed words would otherwise get zero length.
const MIN_WORD_SECONDS = 0.12;

export const normalizeToken = (token: string, language: Language): string => {
  const plain = token
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
  return /^\d+$/.test(plain) ? (NUMBER_WORDS[language][Number(plain)] ?? plain) : plain;
};

const editDistance = (a: string, b: string): number => {
  const row = Array.from({ length: b.length + 1 }, (_, j) => j);
  const final = [...a].reduce((prev, ca, i) => {
    const next = [i + 1];
    [...b].forEach((cb, j) => next.push(Math.min(prev[j + 1] + 1, next[j] + 1, prev[j] + (ca === cb ? 0 : 1))));
    return next;
  }, row);
  return final[b.length];
};

const similar = (a: string, b: string) =>
  a.length > 0 && b.length > 0 && (a === b || 1 - editDistance(a, b) / Math.max(a.length, b.length) >= FUZZY_RATIO);

// Needleman-Wunsch global alignment; returns, per script word, the index of the heard word it matched.
const matchIndexes = (script: readonly string[], heard: readonly string[]): readonly (number | null)[] => {
  const rows = script.length + 1;
  const cols = heard.length + 1;
  const score = Array.from({ length: rows }, (_, i) => Array.from({ length: cols }, (_, j) => (i === 0 ? j * GAP : j === 0 ? i * GAP : 0)));
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const pair = similar(script[i - 1], heard[j - 1]) ? MATCH : MISMATCH;
      score[i][j] = Math.max(score[i - 1][j - 1] + pair, score[i - 1][j] + GAP, score[i][j - 1] + GAP);
    }
  }
  const matches: (number | null)[] = script.map(() => null);
  let i = script.length;
  let j = heard.length;
  while (i > 0 && j > 0) {
    const isMatch = similar(script[i - 1], heard[j - 1]);
    if (score[i][j] === score[i - 1][j - 1] + (isMatch ? MATCH : MISMATCH)) {
      if (isMatch) matches[i - 1] = j - 1;
      i--;
      j--;
    } else if (score[i][j] === score[i - 1][j] + GAP) {
      i--;
    } else {
      j--;
    }
  }
  return matches;
};

// Spreads a run of unmatched words over [from, to] in proportion to their length.
const spread = (texts: readonly string[], from: number, to: number): TimedWord[] => {
  const weights = texts.map((t) => t.length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.max(0, to - from);
  return texts.map((text, k) => {
    const before = weights.slice(0, k).reduce((a, b) => a + b, 0);
    return { text, start: from + (before / total) * span, end: from + ((before + weights[k]) / total) * span };
  });
};

const clampOrdered = (words: readonly TimedWord[], duration: number): TimedWord[] =>
  words.reduce<TimedWord[]>((acc, w) => {
    const floor = acc.length ? acc[acc.length - 1].end : 0;
    const start = Math.min(Math.max(w.start, floor), duration);
    const end = Math.min(Math.max(w.end, start + MIN_WORD_SECONDS), duration);
    return [...acc, { text: w.text, start, end }];
  }, []);

export const alignToScript = (script: string, heard: readonly TimedWord[], duration: number, language: Language): Alignment => {
  const scriptWords = script.split(/\s+/).filter(Boolean);
  if (!scriptWords.length) return { words: [], matched: 1 };
  const usable = heard.filter((w) => normalizeToken(w.text, language));
  const matches = matchIndexes(
    scriptWords.map((w) => normalizeToken(w, language)),
    usable.map((w) => normalizeToken(w.text, language)),
  );

  const out: TimedWord[] = [];
  let k = 0;
  while (k < scriptWords.length) {
    const hit = matches[k];
    if (hit !== null) {
      out.push({ text: scriptWords[k], start: usable[hit].start, end: usable[hit].end });
      k++;
      continue;
    }
    const runEnd = matches.findIndex((m, idx) => idx > k && m !== null);
    const stop = runEnd === -1 ? scriptWords.length : runEnd;
    const from = out.length ? out[out.length - 1].end : 0;
    const nextHit = runEnd === -1 ? null : matches[runEnd];
    const to = nextHit === null ? duration : usable[nextHit].start;
    out.push(...spread(scriptWords.slice(k, stop), from, to));
    k = stop;
  }

  const matchedCount = matches.filter((m) => m !== null).length;
  return { words: clampOrdered(out, duration), matched: matchedCount / scriptWords.length };
};

import { describe, expect, it } from "vitest";
import { parseWhisperJson } from "../app/server/captions/whisperJson";

const segment = (from: number, to: number, text: string) => ({ offsets: { from, to }, text });

describe("parseWhisperJson", () => {
  it("turns one-word segments into timed words in seconds", () => {
    const words = parseWhisperJson({ transcription: [segment(0, 40, ""), segment(40, 380, " 1."), segment(380, 760, " Login")] });
    expect(words).toEqual([
      { text: "1.", start: 0.04, end: 0.38 },
      { text: "Login", start: 0.38, end: 0.76 },
    ]);
  });

  it("splits a multi-word segment by word length", () => {
    const words = parseWhisperJson({ transcription: [segment(0, 1000, " ab abcd")] });
    expect(words.map((w) => w.text)).toEqual(["ab", "abcd"]);
    expect(words[0].end).toBeCloseTo(words[1].start);
    expect(words[1].end).toBeCloseTo(1);
  });

  it("drops non-speech markers", () => {
    expect(parseWhisperJson({ transcription: [segment(0, 500, " [BLANK_AUDIO]"), segment(500, 900, " (music)")] })).toEqual([]);
  });

  it("returns nothing for malformed output", () => {
    expect(parseWhisperJson(null)).toEqual([]);
    expect(parseWhisperJson({ transcription: "nope" })).toEqual([]);
    expect(parseWhisperJson({ transcription: [{ text: " hi" }] })).toEqual([]);
  });
});

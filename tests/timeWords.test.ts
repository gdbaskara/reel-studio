import { describe, expect, it } from "vitest";
import { retimeWords, timeWords } from "../app/server/captions/timeWords";

const heard = [
  { text: "Login", start: 0.2, end: 0.6 },
  { text: "pakai", start: 0.6, end: 1.0 },
  { text: "akun", start: 1.0, end: 1.4 },
];

describe("timeWords", () => {
  it("uses whisper timings when enough of the script was heard", async () => {
    const result = await timeWords("x.wav", "Login pakai akun", 1.5, "id", async () => heard);
    expect(result.timing).toBe("whisper");
    expect(result.words[0]).toEqual({ text: "Login", start: 0.2, end: 0.6 });
    expect(result.heard).toEqual(heard);
  });

  it("falls back to estimated timings when whisper is unavailable", async () => {
    const result = await timeWords("x.wav", "Login pakai akun", 1.5, "id", async () => null);
    expect(result.timing).toBe("estimate");
    expect(result.words[0].start).toBe(0);
    expect(result.heard).toBeUndefined();
  });

  it("falls back when the audio does not match the script", async () => {
    const result = await timeWords("x.wav", "something else entirely here", 1.5, "en", async () => heard);
    expect(result.timing).toBe("estimate");
    expect(result.heard).toEqual(heard);
  });

  it("falls back when whisper throws", async () => {
    const result = await timeWords("x.wav", "Login", 1, "id", async () => {
      throw new Error("boom");
    });
    expect(result.timing).toBe("estimate");
  });

  it("returns no words for empty narration", async () => {
    expect((await timeWords("x.wav", "  ", 1, "id", async () => heard)).words).toEqual([]);
  });
});

describe("retimeWords", () => {
  it("re-aligns edited narration against what whisper heard, without re-running it", () => {
    const result = retimeWords({ duration: 1.5, heard }, "Login pakai akun", "id");
    expect(result.timing).toBe("whisper");
    expect(result.words[2]).toEqual({ text: "akun", start: 1.0, end: 1.4 });
  });

  it("estimates when there is no recognition to align against", () => {
    expect(retimeWords({ duration: 2 }, "a b", "en").timing).toBe("estimate");
  });
});

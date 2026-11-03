import { describe, expect, it } from "vitest";
import { alignToScript, normalizeToken } from "../app/server/captions/align";

const heard = (...items: [string, number, number][]) => items.map(([text, start, end]) => ({ text, start, end }));

const expectOrdered = (words: readonly { start: number; end: number }[], duration: number) => {
  words.forEach((w, i) => {
    expect(w.end).toBeGreaterThanOrEqual(w.start);
    expect(w.start).toBeGreaterThanOrEqual(i ? words[i - 1].end : 0);
    expect(w.end).toBeLessThanOrEqual(duration);
  });
};

describe("normalizeToken", () => {
  it("lowercases, strips punctuation and accents", () => {
    expect(normalizeToken("Kantor,", "id")).toBe("kantor");
    expect(normalizeToken("Café!", "en")).toBe("cafe");
  });

  it("spells out small numbers in the clip language", () => {
    expect(normalizeToken("1.", "id")).toBe("satu");
    expect(normalizeToken("3", "en")).toBe("three");
  });
});

describe("alignToScript", () => {
  it("uses the script spelling with whisper timings when every word matches", () => {
    const result = alignToScript(
      "Satu. Login pakai akun Microsoft kantor kamu.",
      heard(["1.", 0.04, 0.38], ["Login", 0.38, 0.76], ["pakai", 0.76, 1.01], ["akun", 1.01, 1.25], ["Microsoft", 1.25, 1.82], ["Kantor", 1.82, 2.19], ["kamu.", 2.19, 2.5]),
      2.6,
      "id",
    );
    expect(result.matched).toBe(1);
    expect(result.words.map((w) => w.text)).toEqual(["Satu.", "Login", "pakai", "akun", "Microsoft", "kantor", "kamu."]);
    expect(result.words[1]).toEqual({ text: "Login", start: 0.38, end: 0.76 });
  });

  it("accepts near-miss spellings from speech recognition", () => {
    const result = alignToScript("Buka Knowledge sekarang", heard(["Buka", 0, 0.3], ["Nolej", 0.3, 0.9], ["sekarang", 0.9, 1.4]), 1.5, "id");
    expect(result.matched).toBeCloseTo(2 / 3);
    expect(result.words[1].start).toBeCloseTo(0.3);
    expect(result.words[1].end).toBeCloseTo(0.9);
  });

  it("interpolates script words whisper missed between their neighbours", () => {
    const result = alignToScript("one two three four", heard(["one", 0, 0.5], ["four", 2, 2.5]), 3, "en");
    expect(result.matched).toBe(0.5);
    expect(result.words[1].start).toBeCloseTo(0.5);
    expect(result.words[2].end).toBeCloseTo(2);
    expectOrdered(result.words, 3);
  });

  it("ignores extra words whisper heard that are not in the script", () => {
    const result = alignToScript("hello world", heard(["um", 0, 0.2], ["hello", 0.2, 0.6], ["there", 0.6, 0.9], ["world", 0.9, 1.3]), 1.5, "en");
    expect(result.matched).toBe(1);
    expect(result.words).toEqual([
      { text: "hello", start: 0.2, end: 0.6 },
      { text: "world", start: 0.9, end: 1.3 },
    ]);
  });

  it("spreads trailing unmatched words up to the end of the clip", () => {
    const result = alignToScript("start and the rest", heard(["start", 0, 0.4]), 2, "en");
    expect(result.words[3].end).toBeCloseTo(2);
    expectOrdered(result.words, 2);
  });

  it("keeps times ordered and inside the clip even with overlapping input", () => {
    const result = alignToScript("a b c", heard(["a", 0.5, 1.2], ["b", 1.0, 1.1], ["c", 1.05, 9]), 2, "en");
    expectOrdered(result.words, 2);
  });

  it("gives a missed word a visible duration even when its neighbours touch", () => {
    const result = alignToScript("halo dunia indah", heard(["halo", 0.2, 0.7], ["indah", 0.7, 1.2]), 2, "id");
    expect(result.words[1].end - result.words[1].start).toBeGreaterThanOrEqual(0.1);
    expectOrdered(result.words, 2);
  });

  it("gives a missed first word a visible duration when speech starts at zero", () => {
    const result = alignToScript("ya ya ya", heard(["ya", 0, 0.9], ["ya", 1, 1.9]), 3, "id");
    result.words.forEach((w) => expect(w.end - w.start).toBeGreaterThanOrEqual(0.1));
    expectOrdered(result.words, 3);
  });

  it("reports zero matches when whisper heard nothing useful", () => {
    expect(alignToScript("alpha beta", [], 2, "en").matched).toBe(0);
    expect(alignToScript("", heard(["x", 0, 1]), 2, "en")).toEqual({ words: [], matched: 1 });
  });
});

import { describe, expect, it } from "vitest";
import { estimateWords } from "../scripts/providers.mjs";
import { toChunks } from "../src/components/Captions";

describe("estimateWords", () => {
  it("spreads words across the whole clip in order", () => {
    const words = estimateWords("Satu. Login pakai akun kantor.", 3);
    expect(words.map((w: { text: string }) => w.text)).toEqual(["Satu.", "Login", "pakai", "akun", "kantor."]);
    expect(words[0].start).toBe(0);
    expect(words[words.length - 1].end).toBeCloseTo(3);
    words.slice(1).forEach((w: { start: number }, i: number) => expect(w.start).toBeCloseTo(words[i].end));
  });
});

describe("toChunks", () => {
  const w = (text: string) => ({ text, start: 0, end: 0 });

  it("groups at most three words and breaks after punctuation", () => {
    const chunks = toChunks(["Dua.", "Ketik", "pertanyaan", "di", "kolom", "chat."].map(w));
    expect(chunks.map((c) => c.map((x) => x.text).join(" "))).toEqual(["Dua.", "Ketik pertanyaan di", "kolom chat."]);
  });
});

import { describe, expect, it } from "vitest";
import { speechEnd } from "../app/server/captions/trim";

const words = (end: number) => [
  { text: "Satu.", start: 0.1, end: 0.4 },
  { text: "kamu.", start: 2.7, end },
];

describe("speechEnd", () => {
  it("cuts after the last scripted word plus padding", () => {
    expect(speechEnd(words(3.1), 5.26)).toBeCloseTo(3.45);
  });

  it("keeps the clip when the tail is already short", () => {
    expect(speechEnd(words(3.1), 3.6)).toBeNull();
  });

  it("never extends past the clip and ignores empty captions", () => {
    expect(speechEnd(words(5.2), 5.26)).toBeNull();
    expect(speechEnd([], 5)).toBeNull();
  });
});

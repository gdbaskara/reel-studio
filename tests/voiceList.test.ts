import { describe, expect, it } from "vitest";
import { withDefaultVoice } from "../app/server/voice";

const voices = [
  { id: "wanita", name: "Wanita", builtin: true },
  { id: "pria", name: "Pria", builtin: true },
  { id: "saya", name: "Suara saya", builtin: false },
];

describe("withDefaultVoice", () => {
  it("marks Wanita as the default when nothing else is set", () => {
    expect(withDefaultVoice(voices, undefined).map((v) => [v.id, v.default])).toEqual([
      ["wanita", true],
      ["pria", false],
      ["saya", false],
    ]);
  });

  it("marks the voice named in OMNIVOICE_VOICE", () => {
    expect(withDefaultVoice(voices, "saya").filter((v) => v.default).map((v) => v.id)).toEqual(["saya"]);
  });

  it("falls back to Wanita, then the first voice, when the configured one does not exist", () => {
    const priaFirst = [voices[1], voices[2], voices[0]];
    expect(withDefaultVoice(priaFirst, "Pria").filter((v) => v.default).map((v) => v.id)).toEqual(["wanita"]);
    expect(withDefaultVoice(voices.slice(1), "hilang").filter((v) => v.default).map((v) => v.id)).toEqual(["pria"]);
    expect(withDefaultVoice([], "wanita")).toEqual([]);
  });

  it("keeps each voice's fields and does not change the input", () => {
    const marked = withDefaultVoice(voices, undefined);
    expect(marked[2]).toEqual({ id: "saya", name: "Suara saya", builtin: false, default: false });
    expect("default" in voices[0]).toBe(false);
  });
});

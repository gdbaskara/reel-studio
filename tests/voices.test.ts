import { describe, expect, it } from "vitest";
import { omnivoiceOptions, pickedVoice } from "../app/web/src/voices";

const voices = [
  { id: "wanita", name: "Wanita", builtin: true, default: false },
  { id: "pria", name: "Pria", builtin: true, default: true },
];

describe("pickedVoice", () => {
  it("shows the saved choice when it still exists", () => {
    expect(pickedVoice("wanita", voices)).toBe("wanita");
  });

  it("otherwise shows the server's default voice, then the first one", () => {
    expect(pickedVoice(undefined, voices)).toBe("pria");
    expect(pickedVoice("hilang", voices)).toBe("pria");
    expect(pickedVoice(undefined, voices.map((v) => ({ ...v, default: false })))).toBe("wanita");
    expect(pickedVoice(undefined, [])).toBeUndefined();
  });
});

describe("omnivoiceOptions", () => {
  it("lists each voice by its plain name", () => {
    expect(omnivoiceOptions(voices)).toEqual([
      { id: "wanita", label: "Wanita" },
      { id: "pria", label: "Pria" },
    ]);
  });
});

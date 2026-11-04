import { describe, expect, it } from "vitest";
import { LOOKS, lookChoice } from "../src/looks";
import { LOOK_IDS } from "../src/looks/types";
import { FONT_KEYS } from "../src/looks/fonts";
import { parseEmphasis, plainText, stripMarkers } from "../src/looks/emphasis";

describe("lookChoice", () => {
  it("defaults to Notebook with its green palette", () => {
    expect(lookChoice(undefined, undefined)).toMatchObject({ id: "notebook", paletteName: "green" });
  });

  it("keeps the three palettes older projects saved", () => {
    expect(lookChoice(undefined, "warm").palette.accent).toBe("#E8553D");
    expect(lookChoice("notebook", "blue").palette.accent).toBe("#2F6FEB");
  });

  it("falls back to the look's first palette when it has no palette by that name", () => {
    expect(lookChoice("notebook", "nope").paletteName).toBe("green");
    expect(lookChoice("bold-pop", "nope").paletteName).toBe(LOOKS["bold-pop"].palettes[0].name);
  });

  it("falls back to Notebook for an unknown look id", () => {
    expect(lookChoice("vaporwave" as never, undefined).id).toBe("notebook");
  });
});

describe("looks", () => {
  it("has one definition per id, each with a known font and readable palettes", () => {
    expect(Object.keys(LOOKS).sort()).toEqual([...LOOK_IDS].sort());
    for (const id of LOOK_IDS) {
      const look = LOOKS[id];
      expect(look.id).toBe(id);
      expect(FONT_KEYS).toContain(look.fonts.display.key);
      expect(FONT_KEYS).toContain(look.fonts.caption.key);
      expect(new Set(look.palettes.map((p) => p.name)).size).toBe(look.palettes.length);
      for (const p of look.palettes) {
        for (const color of Object.values(p.colors)) expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }
  });
});

describe("parseEmphasis", () => {
  it("splits text into words and marks the ones between asterisks", () => {
    expect(parseEmphasis("Login pakai *akun kantor* kamu")).toEqual([
      { text: "Login", strong: false },
      { text: "pakai", strong: false },
      { text: "akun", strong: true },
      { text: "kantor", strong: true },
      { text: "kamu", strong: false },
    ]);
  });

  it("keeps punctuation next to an emphasized word", () => {
    expect(parseEmphasis("Ini *penting*!")).toEqual([
      { text: "Ini", strong: false },
      { text: "penting!", strong: true },
    ]);
  });

  it("treats a lone or unmatched asterisk as plain text and drops empty words", () => {
    expect(parseEmphasis("5 * 3 =  15")).toEqual(["5", "*", "3", "=", "15"].map((text) => ({ text, strong: false })));
    expect(parseEmphasis("*tanpa penutup")).toEqual([
      { text: "*tanpa", strong: false },
      { text: "penutup", strong: false },
    ]);
    expect(parseEmphasis("")).toEqual([]);
  });

  it("handles quotes, brackets and doubled asterisks around a marked word", () => {
    expect(parseEmphasis('"*kutip*"')).toEqual([{ text: '"kutip"', strong: true }]);
    expect(parseEmphasis("(*catatan*)")).toEqual([{ text: "(catatan)", strong: true }]);
    expect(parseEmphasis("**tebal** teks")).toEqual([
      { text: "tebal", strong: true },
      { text: "teks", strong: false },
    ]);
  });

  it("gives plain text without the markers", () => {
    expect(plainText("Login pakai *akun kantor* kamu")).toBe("Login pakai akun kantor kamu");
    expect(plainText("5 * 3")).toBe("5 * 3");
  });
});

describe("stripMarkers", () => {
  it("removes only emphasis markers from one caption word", () => {
    expect(stripMarkers("*penting*")).toBe("penting");
    expect(stripMarkers("*akun")).toBe("akun");
    expect(stripMarkers("kantor*,")).toBe("kantor,");
    expect(stripMarkers('"*kutip*"')).toBe('"kutip"');
  });

  it("keeps asterisks that are not markers", () => {
    expect(stripMarkers("2*3=6")).toBe("2*3=6");
    expect(stripMarkers("*")).toBe("*");
  });
});

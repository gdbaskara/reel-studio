import { describe, expect, it } from "vitest";
import { CreateOptionsSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { LOOKS } from "../src/looks";
import { LOOK_IDS } from "../src/looks/types";
import { activePalette, applyStyle, firstPalette, styleOf, TILE_FRAME, titleTile, withLook } from "../app/web/src/style";

const options = { language: "en", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "warm" } as const;

const project = (extra: Partial<Project["options"]> = {}): Project => ({
  id: "p-editor-style-0",
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: CreateOptionsSchema.parse({ ...options, ...extra }),
  plan: manualPlan("x", { ...options }),
  voice: {},
  music: { src: "/m.mp3", duration: 30, name: "m" },
  render: { status: "idle", progress: 0, updatedAt: "" },
});

describe("styleOf", () => {
  it("reads older projects as Notebook with the progress bar on", () => {
    expect(styleOf(project().options)).toEqual({
      look: "notebook",
      palette: "warm",
      captions: true,
      progressBar: true,
      brand: { handle: "", position: "top-left" },
      transition: null,
      tune: { textScale: 1, speed: "normal" },
      music: { volume: 0.3, duck: true },
    });
  });

  it("keeps a saved look and progress bar", () => {
    expect(styleOf(project({ look: "neon", progressBar: false }).options)).toMatchObject({ look: "neon", progressBar: false });
  });

  it("is a valid save request once a plan is added", () => {
    const p = project();
    expect(UpdateRequestSchema.safeParse({ plan: p.plan, ...styleOf(p.options) }).success).toBe(true);
  });
});

describe("withLook", () => {
  it("switches to the new look's first palette and keeps the rest", () => {
    const before = styleOf(project({ captions: false }).options);
    const after = withLook(before, "bold-pop");
    expect(after).toEqual({ ...before, look: "bold-pop", palette: LOOKS["bold-pop"].palettes[0].name });
    expect(before.look).toBe("notebook");
  });
});

describe("activePalette", () => {
  it("falls back to the look's first palette for unknown names", () => {
    expect(activePalette({ look: "notebook", palette: "blue" })).toBe("blue");
    expect(activePalette({ look: "notebook", palette: "nope" })).toBe(firstPalette("notebook"));
  });
});

describe("applyStyle", () => {
  it("returns a new project with the style in its options", () => {
    const p = project();
    const next = applyStyle(p, withLook(styleOf(p.options), "minimal"));
    expect(next.options).toMatchObject({ look: "minimal", palette: firstPalette("minimal"), language: "en" });
    expect(p.options.look).toBeUndefined();
  });
});

describe("titleTile", () => {
  it("shows the title scene in each look with its first palette, without music", () => {
    for (const id of LOOK_IDS) {
      const tile = titleTile(project({ look: "notebook", palette: "blue" }), id);
      expect(tile.inputProps.spec.look).toBe(id);
      expect(tile.inputProps.spec.palette).toEqual(LOOKS[id].palettes[0].colors);
      expect(tile.inputProps.sceneIndex).toBe(0);
      expect(tile.inputProps).not.toHaveProperty("music");
      expect(tile.frame).toBe(TILE_FRAME);
      expect(tile.frame).toBeLessThan(tile.durationInFrames);
    }
  });

  it("shows the selected look in the palette the reel uses", () => {
    const tile = titleTile(project({ look: "notebook", palette: "blue" }), "notebook", "blue");
    expect(tile.inputProps.spec.palette).toEqual(LOOKS.notebook.palettes[2].colors);
  });
});

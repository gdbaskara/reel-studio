import { describe, expect, it } from "vitest";
import { ArtSchema, CreateOptionsSchema, StepSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { illustrationPrompt, parseIllustrations } from "../app/server/illustrate";
import { toReelProps } from "../app/shared/toReel";
import { artBox, fitArt, pathDelays } from "../src/components/Illustration";

const tile = { paths: ["M100 60 L300 60 L300 340 L100 340 Z", "M150 120 C 170 100, 230 100, 250 120"] };

describe("ArtSchema", () => {
  it("accepts a few stroke paths", () => {
    expect(ArtSchema.safeParse(tile).success).toBe(true);
    expect(StepSchema.safeParse({ title: "a", note: "", drawing: "star", art: tile }).success).toBe(true);
  });

  it("rejects anything that is not plain path data", () => {
    for (const bad of ['M0 0 L10 10" onload="x', "<script>", "M0 0 url(#a)", ""]) {
      expect(ArtSchema.safeParse({ paths: [bad] }).success).toBe(false);
    }
  });

  it("accepts colored areas next to the lines, with the same rules", () => {
    expect(ArtSchema.safeParse({ ...tile, fills: ["M100 60 L300 60 L300 340 Z"] }).success).toBe(true);
    expect(ArtSchema.safeParse({ ...tile, fills: ["<path>"] }).success).toBe(false);
    expect(ArtSchema.safeParse({ ...tile, fills: Array(9).fill("M0 0 L1 1 Z") }).success).toBe(false);
  });

  it("keeps drawings small", () => {
    expect(ArtSchema.safeParse({ paths: [] }).success).toBe(false);
    expect(ArtSchema.safeParse({ paths: Array(15).fill("M0 0 L1 1") }).success).toBe(false);
    expect(ArtSchema.safeParse({ paths: ["M0 0 " + "L1 1 ".repeat(400)] }).success).toBe(false);
  });
});

describe("drawing with Claude", () => {
  const options = CreateOptionsSchema.parse({ language: "en", stepCount: 2, planMode: "ai", voiceMode: "mixed", captions: true, palette: "green" });
  const steps = [
    { title: "Grab the tiles", note: "144 tiles in a set", drawing: "stack" as const },
    { title: "Call Mahjong", note: "", drawing: "chat" as const },
  ];

  it("asks for one concrete picture per step of this topic", () => {
    const prompt = illustrationPrompt("Mahjong for beginners", steps);
    expect(prompt).toContain("Mahjong for beginners");
    expect(prompt).toContain('"step-1": "Grab the tiles. 144 tiles in a set"');
    expect(prompt).toContain('"step-2": "Call Mahjong"');
    expect(prompt).toMatch(/0 0 400 400/);
    expect(prompt).toMatch(/"fills"/);
    expect(prompt).toMatch(/different/i);
    expect(manualPlan("x", options).steps).toHaveLength(2);
  });

  it("keeps the valid drawings of a reply and drops the rest", () => {
    const reply = `Here: {"step-1": ${JSON.stringify(tile)}, "step-2": {"paths": ["<svg>"]}, "step-9": ${JSON.stringify(tile)}}`;
    expect(parseIllustrations(reply, 2)).toEqual({ 0: tile });
  });

  it("fails when the reply has no JSON", () => {
    expect(() => parseIllustrations("sorry", 2)).toThrow(/no JSON/);
  });
});

describe("illustrations in the reel", () => {
  it("pass through to the render props", () => {
    const options = CreateOptionsSchema.parse({ language: "en", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" });
    const plan = manualPlan("x", options);
    const project: Project = {
      id: "p-art-000000",
      name: "x",
      prompt: "x",
      createdAt: "",
      updatedAt: "",
      options,
      plan: { ...plan, steps: plan.steps.map((s, i) => (i === 0 ? { ...s, art: tile } : s)) },
      voice: {},
      render: { status: "idle", progress: 0, updatedAt: "" },
    };
    expect(toReelProps(project).spec.steps[0].art).toEqual(tile);
  });

  it("crops to what was drawn, so small drawings still fill their space", () => {
    // The tile spans x 100..300 and y 60..340; padding adds 6% of the longer side all round.
    const box = artBox(tile.paths);
    const pad = 280 * 0.06;
    expect(box).toEqual({ x: 100 - pad, y: 60 - pad, w: 200 + 2 * pad, h: 280 + 2 * pad });
    expect(artBox(["M10 10 L10 10"]).w).toBeGreaterThan(0);
    // Filled areas count too.
    expect(artBox(tile.paths, ["M0 60 L20 60 L20 80 Z"]).x).toBeLessThan(0);
  });

  it("fits a drawing into the room it has, keeping its shape", () => {
    expect(fitArt({ x: 0, y: 0, w: 400, h: 100 }, 600, 440)).toEqual({ width: 600, height: 150 });
    expect(fitArt({ x: 0, y: 0, w: 100, h: 400 }, 600, 440)).toEqual({ width: 110, height: 440 });
  });

  it("only accepts absolute M, L, C, Q and Z, so the crop can read every point", () => {
    expect(ArtSchema.safeParse({ paths: ["M0 0 h10"] }).success).toBe(false);
    expect(ArtSchema.safeParse({ paths: ["m0 0 l10 10"] }).success).toBe(false);
  });

  it("draws the strokes one after another within the given time", () => {
    expect(pathDelays(3, 10, 30)).toEqual([
      { delay: 10, duration: 10 },
      { delay: 20, duration: 10 },
      { delay: 30, duration: 10 },
    ]);
    expect(pathDelays(1, 0, 30)).toEqual([{ delay: 0, duration: 30 }]);
  });
});

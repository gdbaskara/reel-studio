import { describe, expect, it } from "vitest";
import { LOOKS } from "../src/looks";
import { DEFAULT_TUNE, SPEEDS, isDefaultTune, tuneLook } from "../src/looks/tune";
import { CreateOptionsSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { toReelProps } from "../app/shared/toReel";

const look = LOOKS.notebook;

describe("tuneLook", () => {
  it("leaves the look untouched at the defaults", () => {
    expect(tuneLook(look, DEFAULT_TUNE)).toBe(look);
    expect(tuneLook(look, undefined)).toBe(look);
    expect(isDefaultTune({ textScale: 1, speed: "normal" })).toBe(true);
  });

  it("scales every text size but not spacing", () => {
    const big = tuneLook(look, { textScale: 1.2, speed: "normal" });
    expect(big.type.stepTitle).toBe(Math.round(look.type.stepTitle * 1.2));
    expect(big.type.note).toBe(Math.round(look.type.note * 1.2));
    expect(big.type.lineHeight).toBe(look.type.lineHeight);
  });

  it("makes fast looks start sooner and spring harder, calm ones the opposite", () => {
    const fast = tuneLook(look, { textScale: 1, speed: "fast" });
    const calm = tuneLook(look, { textScale: 1, speed: "calm" });
    expect(fast.motion.delays.stepNote).toBeLessThan(look.motion.delays.stepNote);
    expect(calm.motion.delays.stepNote).toBeGreaterThan(look.motion.delays.stepNote);
    expect(fast.motion.word.stiffness).toBeGreaterThan(look.motion.word.stiffness ?? 100);
    expect(calm.motion.stagger).toBeGreaterThan(look.motion.stagger);
    expect(SPEEDS).toEqual(["calm", "normal", "fast"]);
  });
});

describe("tune option", () => {
  const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;

  it("is validated and only reaches the reel when it changes something", () => {
    expect(CreateOptionsSchema.safeParse({ ...options, tune: { textScale: 1.1, speed: "fast" } }).success).toBe(true);
    expect(CreateOptionsSchema.safeParse({ ...options, tune: { textScale: 2, speed: "fast" } }).success).toBe(false);
    expect(CreateOptionsSchema.safeParse({ ...options, tune: { textScale: 1, speed: "turbo" } }).success).toBe(false);
    const plan = manualPlan("x", options);
    expect(UpdateRequestSchema.safeParse({ plan, captions: true, palette: "green", tune: { textScale: 0.9, speed: "calm" } }).success).toBe(true);
    const project = (tune?: { textScale: number; speed: "calm" | "normal" | "fast" }): Project => ({
      id: "p-tune-000000",
      name: "x",
      prompt: "x",
      createdAt: "",
      updatedAt: "",
      options: CreateOptionsSchema.parse({ ...options, ...(tune ? { tune } : {}) }),
      plan,
      voice: {},
      render: { status: "idle", progress: 0, updatedAt: "" },
    });
    expect(toReelProps(project({ textScale: 1.1, speed: "fast" })).spec.tune).toEqual({ textScale: 1.1, speed: "fast" });
    expect(toReelProps(project(DEFAULT_TUNE)).spec.tune).toBeUndefined();
    expect(toReelProps(project()).spec.tune).toBeUndefined();
  });
});

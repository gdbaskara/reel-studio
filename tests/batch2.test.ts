import { describe, expect, it } from "vitest";
import { DRAWINGS, CreateOptionsSchema } from "../app/shared/project";
import { DRAWINGS as SHAPES } from "../src/components/drawings";
import { manualPlan, plannerPrompt } from "../app/server/planner";
import { rhythmLayouts, withRhythm } from "../app/shared/rhythm";
import { bob, drift, echoAmount, spokenWord, wordKey } from "../src/life";

const options = CreateOptionsSchema.parse({ language: "en", stepCount: 5, planMode: "ai", voiceMode: "mixed", captions: true, palette: "green" });

describe("rhythmLayouts", () => {
  it("never repeats a layout on neighbouring steps and ends on the big number", () => {
    for (const n of [3, 4, 5, 7]) {
      const layouts = rhythmLayouts(n);
      expect(layouts).toHaveLength(n);
      layouts.slice(1).forEach((l, i) => expect(l).not.toBe(layouts[i]));
      expect(layouts[n - 1]).toBe("big-number");
    }
  });

  it("keeps short reels simple", () => {
    expect(rhythmLayouts(1)).toEqual(["center"]);
    expect(rhythmLayouts(2)).toEqual(["center", "left"]);
  });

  it("only fills layouts the plan does not set", () => {
    const plan = manualPlan("x", options);
    const set = { ...plan, steps: plan.steps.map((s, i) => (i === 0 ? { ...s, layout: "big-number" as const } : s)) };
    const next = withRhythm(set);
    expect(next.steps[0].layout).toBe("big-number");
    expect(next.steps.slice(1).map((s) => s.layout)).toEqual(rhythmLayouts(5).slice(1));
    expect(next.narration).toEqual(plan.narration);
  });
});

describe("doodles", () => {
  it("has a shape for every drawing the plan may name", () => {
    for (const name of DRAWINGS) expect(SHAPES[name].path.length).toBeGreaterThan(10);
  });

  it("tells the planner what each doodle means, so it picks one that fits", () => {
    const prompt = plannerPrompt("mahjong", options);
    for (const name of DRAWINGS) expect(prompt).toContain(`"${name}"`);
    expect(prompt).toMatch(/chat.*(talk|say)/i);
  });
});

describe("life after the entrance", () => {
  it("drifts slowly from 1 to a little larger over the scene", () => {
    expect(drift(0, 150)).toBe(1);
    expect(drift(150, 150)).toBeCloseTo(1.035);
    expect(drift(75, 150)).toBeGreaterThan(1);
    expect(drift(75, 150)).toBeLessThan(1.035);
  });

  it("bobs only once the doodle is drawn, and stays small", () => {
    expect(bob(10, 40, 30)).toBe(0);
    const values = Array.from({ length: 90 }, (_, i) => bob(40 + i, 40, 30));
    expect(Math.max(...values.map(Math.abs))).toBeLessThanOrEqual(6);
    expect(Math.max(...values)).toBeGreaterThan(3);
  });

  it("finds the word being spoken now, ignoring case and punctuation", () => {
    const words = [
      { text: "Call", start: 0, end: 0.4 },
      { text: "Mahjong,", start: 0.4, end: 1 },
    ];
    expect(spokenWord(words, 0.6)).toEqual({ key: "mahjong", t: (0.6 - 0.4) / 0.6 });
    expect(spokenWord(words, 2)).toBeNull();
    expect(wordKey("*Mahjong!*")).toBe("mahjong");
  });

  it("echoes only words of four letters or more, peaking mid-word", () => {
    expect(echoAmount("Mahjong", { key: "mahjong", t: 0.5 })).toBeCloseTo(1);
    expect(echoAmount("Mahjong", { key: "mahjong", t: 0 })).toBeCloseTo(0);
    expect(echoAmount("the", { key: "the", t: 0.5 })).toBe(0);
    expect(echoAmount("Tiles", { key: "mahjong", t: 0.5 })).toBe(0);
    expect(echoAmount("Tiles", null)).toBe(0);
  });
});

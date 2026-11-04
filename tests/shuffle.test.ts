import { describe, expect, it } from "vitest";
import { LOOKS } from "../src/looks";
import { DRAWINGS, OUTRO_LAYOUTS, STEP_LAYOUTS, TITLE_LAYOUTS } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { canShuffle, shuffleStyle, undoShuffle, type Locks } from "../app/web/src/shuffle";
import type { Style } from "../app/web/src/style";

const NONE: Locks = { look: false, palette: false, doodles: false, layouts: false };
const style: Style = { look: "notebook", palette: "green", captions: true, progressBar: true, brand: { handle: "", position: "top-left" }, transition: null, music: { volume: 0.3, duck: true } };
const plan = manualPlan("x", { language: "id", stepCount: 4, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" });

// Cycles through fixed values so every pick is predictable.
const seq = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe("shuffleStyle", () => {
  it("picks a different look, one of its palettes and new doodles", () => {
    const next = shuffleStyle(style, plan, NONE, seq(0.5, 0.1, 0.9));
    expect(next.style.look).not.toBe("notebook");
    expect(LOOKS[next.style.look].palettes.map((p) => p.name)).toContain(next.style.palette);
    next.plan.steps.forEach((step, i) => {
      expect(DRAWINGS).toContain(step.drawing);
      expect(step.drawing).not.toBe(plan.steps[i].drawing);
    });
  });

  it("keeps everything that is not about looks", () => {
    const next = shuffleStyle(style, plan, NONE, seq(0.3));
    expect(next.style).toMatchObject({ captions: true, progressBar: true, music: style.music });
    expect(next.plan.steps.map((s) => [s.title, s.note])).toEqual(plan.steps.map((s) => [s.title, s.note]));
    expect(next.plan.narration).toEqual(plan.narration);
  });

  it("only swaps the palette when the look is locked", () => {
    const next = shuffleStyle(style, plan, { ...NONE, look: true }, seq(0.99));
    expect(next.style.look).toBe("notebook");
    expect(next.style.palette).not.toBe("green");
  });

  it("leaves locked parts alone", () => {
    const next = shuffleStyle(style, plan, { look: true, palette: true, doodles: false, layouts: false }, seq(0.4));
    expect(next.style).toEqual(style);
    const doodlesLocked = shuffleStyle(style, plan, { ...NONE, doodles: true, layouts: true }, seq(0.4));
    expect(doodlesLocked.plan).toBe(plan);
    const layoutsLocked = shuffleStyle(style, plan, { ...NONE, layouts: true }, seq(0.4));
    expect(layoutsLocked.plan.steps.map((s) => s.layout)).toEqual(plan.steps.map((s) => s.layout));
  });

  it("ignores the palette lock while the look itself may change", () => {
    const next = shuffleStyle(style, plan, { ...NONE, palette: true }, seq(0.2));
    expect(next.style.look).not.toBe("notebook");
    expect(LOOKS[next.style.look].palettes.map((p) => p.name)).toContain(next.style.palette);
  });
});

describe("shuffled layouts", () => {
  it("gives steps a known layout, different from the one they had", () => {
    const next = shuffleStyle(style, plan, { ...NONE, doodles: true }, seq(0.7, 0.1));
    next.plan.steps.forEach((step) => {
      expect(STEP_LAYOUTS).toContain(step.layout);
      expect(step.layout).not.toBe("center");
    });
    expect(next.plan.steps.map((s) => s.drawing)).toEqual(plan.steps.map((s) => s.drawing));
  });

  it("also gives the title and outro a different layout, keeping their text", () => {
    const next = shuffleStyle(style, plan, { ...NONE, doodles: true }, seq(0.7, 0.1));
    expect(TITLE_LAYOUTS).toContain(next.plan.title.layout);
    expect(OUTRO_LAYOUTS).toContain(next.plan.outro.layout);
    expect(next.plan.title.layout).not.toBe("center");
    expect(next.plan.outro.layout).not.toBe("center");
    expect([next.plan.title.lead, next.plan.title.main, next.plan.outro.main]).toEqual([plan.title.lead, plan.title.main, plan.outro.main]);
    const locked = shuffleStyle(style, plan, { ...NONE, layouts: true }, seq(0.7));
    expect([locked.plan.title.layout, locked.plan.outro.layout]).toEqual([plan.title.layout, plan.outro.layout]);
  });
});

describe("canShuffle", () => {
  it("is false only when nothing is left to change", () => {
    expect(canShuffle(style, NONE)).toBe(true);
    expect(canShuffle(style, { look: true, palette: true, doodles: true, layouts: true })).toBe(false);
    expect(canShuffle(style, { look: true, palette: true, doodles: true, layouts: false })).toBe(true);
    expect(canShuffle(style, { look: true, palette: false, doodles: true, layouts: true })).toBe(true);
  });
});

describe("undoShuffle", () => {
  it("restores the earlier look and doodles without touching later text edits", () => {
    const shuffled = shuffleStyle(style, plan, NONE, seq(0.6, 0.2));
    const edited = { ...shuffled.plan, steps: shuffled.plan.steps.map((s, i) => (i === 0 ? { ...s, title: "Baru" } : s)) };
    const back = undoShuffle({ style, plan }, { style: { ...shuffled.style, captions: false }, plan: edited });
    expect(back.style).toEqual({ ...style, captions: false });
    expect(back.plan.steps.map((s) => s.drawing)).toEqual(plan.steps.map((s) => s.drawing));
    expect(back.plan.steps.map((s) => s.layout)).toEqual(plan.steps.map((s) => s.layout));
    expect([back.plan.title.layout, back.plan.outro.layout]).toEqual([plan.title.layout, plan.outro.layout]);
    expect(back.plan.steps[0].title).toBe("Baru");
  });

  it("keeps the current doodles of steps added after the shuffle", () => {
    const shuffled = shuffleStyle(style, plan, NONE, seq(0.6));
    const longer = { ...shuffled.plan, steps: [...shuffled.plan.steps, { title: "", note: "", drawing: "star" as const }] };
    const back = undoShuffle({ style, plan }, { style: shuffled.style, plan: longer });
    expect(back.plan.steps).toHaveLength(5);
    expect(back.plan.steps[4].drawing).toBe("star");
  });
});

import { describe, expect, it } from "vitest";
import { addStep, draftOf, rebaseOrigin, removeStep, sceneMapOf } from "../app/shared/editPlan";
import type { Plan } from "../app/shared/project";

const plan: Plan = {
  name: "Demo",
  title: { lead: "a", main: "b" },
  steps: [
    { title: "One", note: "", drawing: "arrow" },
    { title: "Two", note: "", drawing: "circle" },
    { title: "Three", note: "", drawing: "check" },
  ],
  outro: { main: "c", sub: "d" },
  narration: { title: "t", "step-1": "n1", "step-2": "n2", "step-3": "n3", outro: "o" },
};

describe("removeStep", () => {
  it("shifts later steps' narration down and keeps their voice mapping", () => {
    const next = removeStep(draftOf(plan), 0);
    expect(next.plan.steps.map((s) => s.title)).toEqual(["Two", "Three"]);
    expect(next.plan.narration).toEqual({ title: "t", "step-1": "n2", "step-2": "n3", outro: "o" });
    expect(sceneMapOf(next)).toEqual({ title: "title", "step-1": "step-2", "step-2": "step-3", outro: "outro" });
  });

  it("does not remove the last remaining step", () => {
    const single = { ...plan, steps: plan.steps.slice(0, 1) };
    expect(removeStep(draftOf(single), 0).plan.steps).toHaveLength(1);
  });

  it("does not mutate the original plan", () => {
    removeStep(draftOf(plan), 1);
    expect(plan.steps).toHaveLength(3);
  });
});

describe("addStep", () => {
  it("adds an empty step before the outro with no voice mapping", () => {
    const next = addStep(draftOf(plan), "id");
    expect(next.plan.steps).toHaveLength(4);
    expect(next.plan.steps[3].title).toBe("Langkah 4");
    expect(next.plan.narration["step-4"]).toBe("");
    expect(sceneMapOf(next)["step-4"]).toBeUndefined();
    expect(sceneMapOf(next).outro).toBe("outro");
  });

  it("stops at seven steps", () => {
    const full = Array.from({ length: 4 }).reduce((d) => addStep(d as ReturnType<typeof draftOf>, "en"), draftOf(plan));
    expect(addStep(full as ReturnType<typeof draftOf>, "en").plan.steps).toHaveLength(7);
  });
});

describe("rebaseOrigin", () => {
  it("translates edits made during a save to the ids the server now uses", () => {
    // Saved: step-1 removed, so server step-1 holds what was step-2.
    const sent = { title: "title", "step-1": "step-2", "step-2": "step-3", outro: "outro" };
    // Meanwhile the user added a step; its origin is null, the rest still reference pre-save ids.
    const during = addStep(removeStep(draftOf(plan), 0), "en");
    const rebased = rebaseOrigin(during, sent);
    expect(rebased.origin).toEqual(["title", "step-1", "step-2", null, "outro"]);
    expect(sceneMapOf(rebased)).toEqual({ title: "title", "step-1": "step-1", "step-2": "step-2", outro: "outro" });
  });

  it("drops references to scenes the server no longer has", () => {
    const rebased = rebaseOrigin(draftOf(plan), { title: "title", outro: "outro" });
    expect(rebased.origin).toEqual(["title", null, null, null, "outro"]);
  });
});

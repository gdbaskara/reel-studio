import { describe, expect, it } from "vitest";
import { draftOf, rebaseOrigin, removeStep } from "../app/shared/editPlan";
import { manualPlan } from "../app/server/planner";
import { COALESCE_MS, EMPTY_HISTORY, record, rebaseHistory, redo, restore, undo, type Snapshot } from "../app/web/src/history";
import type { Style } from "../app/web/src/style";

const options = { language: "id", stepCount: 3, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;
const style: Style = {
  look: "notebook",
  palette: "green",
  captions: true,
  progressBar: true,
  brand: { handle: "", position: "top-left" },
  transition: null,
  tune: { textScale: 1, speed: "normal" },
  music: { volume: 0.3, duck: true },
};
const snap = (name: string): Snapshot => ({ draft: draftOf({ ...manualPlan("x", options), name }), style });

describe("history", () => {
  it("undoes and redoes edits in order", () => {
    const h1 = record(EMPTY_HISTORY, snap("a"), "name", 0);
    const h2 = record(h1, snap("b"), "look", 10_000);
    const back = undo(h2, snap("c"));
    expect(back?.snapshot.draft.plan.name).toBe("b");
    const back2 = back && undo(back.history, back.snapshot);
    expect(back2?.snapshot.draft.plan.name).toBe("a");
    expect(back2 && undo(back2.history, back2.snapshot)).toBeNull();
    const fwd = back2 && redo(back2.history, back2.snapshot);
    expect(fwd?.snapshot.draft.plan.name).toBe("b");
  });

  it("merges quick edits of the same kind into one step", () => {
    const h1 = record(EMPTY_HISTORY, snap("a"), "name", 0);
    const h2 = record(h1, snap("ab"), "name", COALESCE_MS - 1);
    expect(h2.past).toHaveLength(1);
    expect(record(h2, snap("abc"), "name", COALESCE_MS * 3).past).toHaveLength(2);
    expect(record(h1, snap("x"), "look", 1).past).toHaveLength(2);
  });

  it("drops the redo list after a new edit", () => {
    const h = record(record(EMPTY_HISTORY, snap("a"), "name", 0), snap("b"), "look", 10_000);
    const back = undo(h, snap("c"));
    expect(back && redo(record(back.history, snap("b"), "look", 20_000), snap("d"))).toBeNull();
  });

  it("keeps saved scene ids in step after a save", () => {
    const before = snap("a");
    const removed = removeStep(before.draft, 0);
    const h = record(EMPTY_HISTORY, before, "steps", 0);
    const sent = { title: "title", "step-1": "step-2", "step-2": "step-3", outro: "outro" };
    const rebased = rebaseHistory(h, sent);
    expect(rebased.past[0].draft.origin).toEqual(rebaseOrigin(before.draft, sent).origin);
    expect(removed.plan.steps).toHaveLength(2);
  });
});

describe("restore", () => {
  it("brings back text and look but keeps the pictures the steps have now", () => {
    const image = { src: "/api/projects/p-x-000000/audio/image-1.png", width: 10, height: 10 };
    const current = snap("now");
    const withImage = { ...current, draft: { ...current.draft, plan: { ...current.draft.plan, steps: current.draft.plan.steps.map((s, i) => (i === 0 ? { ...s, image } : s)) } } };
    const restored = restore(snap("old"), withImage);
    expect(restored.draft.plan.name).toBe("old");
    expect(restored.draft.plan.steps[0].image).toEqual(image);
    expect(restored.draft.plan.steps[1].image).toBeUndefined();
  });
});

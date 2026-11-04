import { rebaseOrigin, type Draft } from "../../shared/editPlan";
import type { Style } from "./style";

// One state of the editor that Undo can go back to: the plan with its scene origins, and the style.
export type Snapshot = { readonly draft: Draft; readonly style: Style };

export type History = {
  readonly past: readonly Snapshot[];
  readonly future: readonly Snapshot[];
  // Kind and time of the last recorded edit, to merge typing into one step.
  readonly lastKey: string;
  readonly lastAt: number;
};

export const EMPTY_HISTORY: History = { past: [], future: [], lastKey: "", lastAt: -Infinity };
export const COALESCE_MS = 800;
const LIMIT = 100;

// Records the state from before an edit. Quick edits of the same kind (typing in one field) share a step.
export const record = (history: History, before: Snapshot, key: string, now: number): History => {
  const merge = key === history.lastKey && now - history.lastAt < COALESCE_MS && history.past.length > 0;
  return {
    past: merge ? history.past : [...history.past, before].slice(-LIMIT),
    future: [],
    lastKey: key,
    lastAt: now,
  };
};

type Step = { readonly history: History; readonly snapshot: Snapshot } | null;

export const undo = (history: History, current: Snapshot): Step => {
  const previous = history.past[history.past.length - 1];
  if (!previous) return null;
  return { snapshot: previous, history: { ...history, past: history.past.slice(0, -1), future: [current, ...history.future], lastKey: "" } };
};

export const redo = (history: History, current: Snapshot): Step => {
  const [next, ...rest] = history.future;
  if (!next) return null;
  return { snapshot: next, history: { ...history, past: [...history.past, current], future: rest, lastKey: "" } };
};

// After a save the server knows scenes by the ids that were sent; earlier states follow the same mapping.
export const rebaseHistory = (history: History, sent: Readonly<Record<string, string>>): History => {
  const move = (s: Snapshot): Snapshot => ({ ...s, draft: rebaseOrigin(s.draft, sent) });
  return { ...history, past: history.past.map(move), future: history.future.map(move) };
};

// The state to show after Undo or Redo. Pictures live on the server like voices and music, so the
// steps keep the pictures they have now instead of pointing at files that may have been removed.
export const restore = (target: Snapshot, current: Snapshot): Snapshot => {
  const steps = target.draft.plan.steps.map((step, i) => {
    const { image: _old, ...rest } = step;
    const image = current.draft.plan.steps[i]?.image;
    return image ? { ...rest, image } : rest;
  });
  return { ...target, draft: { ...target.draft, plan: { ...target.draft.plan, steps } } };
};

import { DRAWINGS, type Plan } from "./project";

// origin[i] is the saved scene id that scene i came from, or null for a new scene.
// It lets the server keep each voice clip attached to the right scene after edits.
export type Draft = { readonly plan: Plan; readonly origin: readonly (string | null)[] };

const stepKey = (i: number) => `step-${i + 1}`;

export const draftOf = (plan: Plan): Draft => ({
  plan,
  origin: ["title", ...plan.steps.map((_, i) => stepKey(i)), "outro"],
});

// New steps start blank; the editor shows hints until they are filled in.
export const addStep = (draft: Draft): Draft => {
  const { plan, origin } = draft;
  if (plan.steps.length >= 7) return draft;
  const n = plan.steps.length;
  const step = { title: "", note: "", drawing: DRAWINGS[n % DRAWINGS.length] };
  return {
    plan: { ...plan, steps: [...plan.steps, step], narration: { ...plan.narration, [stepKey(n)]: "" } },
    origin: [...origin.slice(0, -1), null, origin[origin.length - 1]],
  };
};

export const removeStep = (draft: Draft, index: number): Draft => {
  const { plan, origin } = draft;
  if (plan.steps.length <= 1 || index < 0 || index >= plan.steps.length) return draft;
  const steps = plan.steps.filter((_, i) => i !== index);
  // Narration for later steps shifts down one slot.
  const narration = Object.fromEntries([
    ["title", plan.narration.title ?? ""],
    ...plan.steps
      .map((_, i) => i)
      .filter((i) => i !== index)
      .map((oldIndex, newIndex) => [stepKey(newIndex), plan.narration[stepKey(oldIndex)] ?? ""]),
    ["outro", plan.narration.outro ?? ""],
  ]);
  return { plan: { ...plan, steps, narration }, origin: origin.filter((_, i) => i !== index + 1) };
};

export const sceneMapOf = (draft: Draft): Record<string, string> => {
  const ids = ["title", ...draft.plan.steps.map((_, i) => stepKey(i)), "outro"];
  return Object.fromEntries(ids.flatMap((id, i) => (draft.origin[i] ? [[id, draft.origin[i] as string]] : [])));
};

// After a save, the server's scenes use the ids that were sent. Edits made while the save was
// in flight still point at the old ids, so translate them through the map that was sent.
export const rebaseOrigin = (draft: Draft, sent: Readonly<Record<string, string>>): Draft => {
  const toNew = new Map(Object.entries(sent).map(([newId, oldId]) => [oldId, newId]));
  return { ...draft, origin: draft.origin.map((id) => (id ? toNew.get(id) ?? null : null)) };
};

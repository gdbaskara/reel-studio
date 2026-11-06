// Text on the preview carries data-edit="<sceneId>:<field>". Clicking it selects that scene and
// focuses the matching inspector field, whose id comes from inputIdFor.
type SceneKind = "title" | "step" | "outro";

const FIELDS: Readonly<Record<SceneKind, readonly string[]>> = {
  title: ["lead", "main"],
  step: ["title", "note"],
  outro: ["main", "sub"],
};

export const inputIdFor = (kind: SceneKind, field: string): string => `edit-${kind}-${field}`;

const kindOf = (sceneId: string): SceneKind | null =>
  sceneId === "title" || sceneId === "outro" ? sceneId : /^step-\d+$/.test(sceneId) ? "step" : null;

export const editTarget = (value: string | undefined, sceneIds: readonly string[]): { sceneIndex: number; inputId: string } | null => {
  const [sceneId, field] = (value ?? "").split(":");
  const kind = kindOf(sceneId ?? "");
  const sceneIndex = sceneIds.indexOf(sceneId ?? "");
  if (!kind || !field || sceneIndex < 0 || !FIELDS[kind].includes(field)) return null;
  return { sceneIndex, inputId: inputIdFor(kind, field) };
};

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Plan, Project } from "../../shared/project";
import { addStep, draftOf, rebaseOrigin, removeStep, sceneMapOf, type Draft } from "../../shared/editPlan";
import { api } from "./api";

type Look = { readonly captions: boolean; readonly palette: Project["options"]["palette"] };

const SAVE_DELAY_MS = 700;

// Holds the editable draft, autosaves it, and runs voice and render actions against the server.
export const useProjectEditor = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [look, setLook] = useState<Look | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const latest = useRef<{ draft: Draft | null; look: Look | null }>({ draft: null, look: null });
  const inflight = useRef<Promise<void> | null>(null);
  latest.current = { draft, look };

  useEffect(() => {
    api
      .get(projectId)
      .then((p) => {
        setProject(p);
        setDraft(draftOf(p.plan));
        setLook({ captions: p.options.captions, palette: p.options.palette });
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId]);

  // Saves run one at a time; each sends the scene mapping for the draft as it was at that moment.
  const saveOnce = useCallback(async () => {
    const { draft: d, look: l } = latest.current;
    if (!d || !l || savedVersion.current === version.current) return;
    const sending = version.current;
    const sceneMap = sceneMapOf(d);
    setSaving(true);
    try {
      const saved = await api.update(projectId, { plan: d.plan, captions: l.captions, palette: l.palette, sceneMap });
      savedVersion.current = sending;
      setProject(saved);
      setDraft((current) => (current ? rebaseOrigin(current, sceneMap) : current));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const saveNow = useCallback(async () => {
    while (inflight.current) await inflight.current;
    const pendingSave = saveOnce();
    inflight.current = pendingSave;
    try {
      await pendingSave;
    } finally {
      inflight.current = null;
    }
  }, [saveOnce]);

  useEffect(() => {
    if (version.current === savedVersion.current) return;
    const timer = setTimeout(() => void saveNow(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, look, saveNow]);

  const change = (next: Draft) => {
    version.current += 1;
    setDraft(next);
  };

  const updatePlan = (fn: (plan: Plan) => Plan) => draft && change({ ...draft, plan: fn(draft.plan) });
  const setLookValue = (next: Look) => {
    version.current += 1;
    setLook(next);
  };

  const run = async (label: string, action: () => Promise<Project>) => {
    setError(null);
    setBusy(label);
    try {
      await saveNow();
      setProject(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  // While a render runs, poll its progress.
  const rendering = project?.render.status === "rendering";
  useEffect(() => {
    if (!rendering) return;
    const timer = setInterval(() => {
      api.get(projectId).then((p) => setProject((current) => (current ? { ...current, render: p.render } : p)));
    }, 1500);
    return () => clearInterval(timer);
  }, [rendering, projectId]);

  const preview = useMemo(
    () => (project && draft && look ? { ...project, plan: draft.plan, options: { ...project.options, ...look } } : null),
    [project, draft, look],
  );

  return {
    project,
    preview,
    draft,
    look,
    saving,
    busy,
    error,
    dismissError: () => setError(null),
    updatePlan,
    setLook: setLookValue,
    addStep: () => draft && project && change(addStep(draft, project.options.language)),
    removeStep: (index: number) => draft && change(removeStep(draft, index)),
    generateVoice: (sceneId: string, provider: "eleven" | "mac") =>
      run(`voice:${sceneId}`, () => api.generateVoice(projectId, sceneId, provider)),
    uploadVoice: (sceneId: string, file: File) => run(`voice:${sceneId}`, () => api.uploadVoice(projectId, sceneId, file)),
    removeVoice: (sceneId: string) => run(`voice:${sceneId}`, () => api.removeVoice(projectId, sceneId)),
    render: () => run("render", () => api.render(projectId)),
    resetRender: () => run("render", () => api.resetRender(projectId)),
  };
};

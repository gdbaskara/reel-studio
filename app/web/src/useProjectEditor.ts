import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Generator, MusicSettings, Plan, Project } from "../../shared/project";
import { addStep, draftOf, rebaseOrigin, removeStep, sceneMapOf, type Draft } from "../../shared/editPlan";
import { api, type VoiceChoice } from "./api";
import { applyStyle, styleOf, type Style } from "./style";

const SAVE_DELAY_MS = 700;

// Holds the editable draft, autosaves it, and runs voice and render actions against the server.
export const useProjectEditor = (projectId: string) => {
  const [project, setProject] = useState<Project | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [style, setStyle] = useState<Style | null>(null);
  const [saving, setSaving] = useState(false);
  // Labels of actions still running; several can run at once (e.g. a voice and a music upload).
  const [busy, setBusy] = useState<ReadonlySet<string>>(() => new Set());
  const [error, setError] = useState<string | null>(null);
  const version = useRef(0);
  const savedVersion = useRef(0);
  const latest = useRef<{ draft: Draft | null; style: Style | null }>({ draft: null, style: null });
  const inflight = useRef<Promise<boolean> | null>(null);
  latest.current = { draft, style };

  useEffect(() => {
    api
      .get(projectId)
      .then((p) => {
        setProject(p);
        setDraft(draftOf(p.plan));
        setStyle(styleOf(p.options));
      })
      .catch((e: Error) => setError(e.message));
  }, [projectId]);

  // Saves run one at a time; each sends the scene mapping for the draft as it was at that moment.
  // Resolves false when the save failed, so actions do not run against an outdated plan.
  const saveOnce = useCallback(async (): Promise<boolean> => {
    const { draft: d, style: s } = latest.current;
    if (!d || !s || savedVersion.current === version.current) return true;
    const sending = version.current;
    const sceneMap = sceneMapOf(d);
    setSaving(true);
    try {
      const saved = await api.update(projectId, { plan: d.plan, ...s, sceneMap });
      savedVersion.current = sending;
      setProject(saved);
      setDraft((current) => (current ? rebaseOrigin(current, sceneMap) : current));
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      return false;
    } finally {
      setSaving(false);
    }
  }, [projectId]);

  const saveNow = useCallback(async (): Promise<boolean> => {
    while (inflight.current) await inflight.current;
    const pendingSave = saveOnce();
    inflight.current = pendingSave;
    try {
      return await pendingSave;
    } finally {
      inflight.current = null;
    }
  }, [saveOnce]);

  useEffect(() => {
    if (version.current === savedVersion.current) return;
    const timer = setTimeout(() => void saveNow(), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, style, saveNow]);

  const change = (next: Draft) => {
    version.current += 1;
    setDraft(next);
  };

  const updatePlan = (fn: (plan: Plan) => Plan) => draft && change({ ...draft, plan: fn(draft.plan) });
  const setStyleValue = (next: Style) => {
    version.current += 1;
    setStyle(next);
  };

  const run = async (label: string, action: () => Promise<Project>) => {
    setError(null);
    setBusy((current) => new Set([...current, label]));
    try {
      // A failed save keeps its own error on screen; the action would only act on stale text.
      if (!(await saveNow())) return;
      setProject(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy((current) => new Set([...current].filter((l) => l !== label)));
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
    () => (project && draft && style ? applyStyle({ ...project, plan: draft.plan }, style) : null),
    [project, draft, style],
  );

  return {
    project,
    preview,
    draft,
    style,
    saving,
    busy,
    error,
    dismissError: () => setError(null),
    updatePlan,
    setStyle: setStyleValue,
    addStep: () => draft && project && change(addStep(draft)),
    removeStep: (index: number) => draft && change(removeStep(draft, index)),
    generateVoice: (sceneId: string, provider: Generator, choice?: VoiceChoice) =>
      run(`voice:${sceneId}`, () => api.generateVoice(projectId, sceneId, provider, choice)),
    uploadVoice: (sceneId: string, file: File) => run(`voice:${sceneId}`, () => api.uploadVoice(projectId, sceneId, file)),
    uploadMusic: (file: File) => run("music", () => api.uploadMusic(projectId, file)),
    removeMusic: () => run("music", () => api.removeMusic(projectId)),
    setMusic: (music: MusicSettings) => style && setStyleValue({ ...style, music }),
    removeVoice: (sceneId: string) => run(`voice:${sceneId}`, () => api.removeVoice(projectId, sceneId)),
    render: () => run("render", () => api.render(projectId)),
    resetRender: () => run("render", () => api.resetRender(projectId)),
  };
};

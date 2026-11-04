import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Generator, MusicSettings, Plan, Project } from "../../shared/project";
import { addStep, draftOf, rebaseOrigin, removeStep, sceneMapOf, type Draft } from "../../shared/editPlan";
import { api, type VoiceChoice } from "./api";
import { applyStyle, styleOf, type Style } from "./style";
import { shuffleStyle, undoShuffle, type Locks, type Shuffled } from "./shuffle";
import { applyProposal } from "./restyle";
import type { Proposal } from "../../shared/restyle";
import { EMPTY_HISTORY, rebaseHistory, record, redo, restore, undo, type History } from "./history";

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
  // The look and doodles from before the last shuffle, so it can be undone.
  const [beforeShuffle, setBeforeShuffle] = useState<Shuffled | null>(null);
  const [history, setHistory] = useState<History>(EMPTY_HISTORY);
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
      setHistory((h) => rebaseHistory(h, sceneMap));
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

  // Remembers the state before an edit so Undo can return to it. Edits with the same key in quick
  // succession (typing) share one step; null leaves the edit out of history.
  const remember = (key: string | null) => {
    const { draft: d, style: s } = latest.current;
    if (key === null || !d || !s) return;
    setHistory((h) => record(h, { draft: d, style: s }, key, Date.now()));
  };

  const change = (next: Draft) => {
    remember("steps");
    version.current += 1;
    setDraft(next);
  };

  // Applies to the newest draft, so it is safe to call after an await.
  const updatePlan = (fn: (plan: Plan) => Plan, key: string | null = "plan") => {
    remember(key);
    version.current += 1;
    setDraft((current) => (current ? { ...current, plan: fn(current.plan) } : current));
  };
  const setStyleValue = (next: Style) => {
    remember("style");
    version.current += 1;
    setStyle(next);
  };

  // Shuffle changes the style and the doodles together, as one edit.
  const setLook = (next: Shuffled) => {
    if (!draft) return;
    remember(`look-${Date.now()}`);
    version.current += 1;
    setStyle(next.style);
    setDraft({ ...draft, plan: next.plan });
  };

  // Undo and Redo swap the editor's draft and style; pictures, voices, music and the logo stay as they are.
  const travel = (move: typeof undo) => {
    const { draft: d, style: s } = latest.current;
    if (!d || !s) return;
    const current = { draft: d, style: s };
    const step = move(history, current);
    if (!step) return;
    const next = restore(step.snapshot, current);
    version.current += 1;
    setHistory(step.history);
    setDraft(next.draft);
    setStyle(next.style);
    setBeforeShuffle(null);
  };

  const shuffle = (locks: Locks) => {
    if (!draft || !style) return;
    setBeforeShuffle({ style, plan: draft.plan });
    setLook(shuffleStyle(style, draft.plan, locks));
  };

  const undoLastShuffle = () => {
    if (!draft || !style || !beforeShuffle) return;
    setLook(undoShuffle(beforeShuffle, { style, plan: draft.plan }));
    setBeforeShuffle(null);
  };

  // Runs an action after saving the draft. A failed save keeps its own error on screen;
  // the action would only act on stale text.
  const act = async (label: string, action: () => Promise<void>) => {
    setError(null);
    setBusy((current) => new Set([...current, label]));
    try {
      if (!(await saveNow())) return;
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy((current) => new Set([...current].filter((l) => l !== label)));
    }
  };

  const run = (label: string, action: () => Promise<Project>) => act(label, async () => setProject(await action()));

  // Takes the look settings the server applied and keeps other style edits (such as music) made meanwhile.
  // It counts as a new edit, so an autosave that went out with the old look during the request is followed
  // by one with the applied look.
  const applySavedStyle = (styleId: string) =>
    act("style", async () => {
      const saved = await api.applyStyle(projectId, styleId);
      const { look, palette, captions, progressBar, brand, transition, tune } = styleOf(saved.options);
      setProject(saved);
      remember(`style-${Date.now()}`);
      version.current += 1;
      setStyle((current) => (current ? { ...current, look, palette, captions, progressBar, brand, transition, tune } : styleOf(saved.options)));
      setBeforeShuffle(null);
    });

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
    // A previewed style change becomes one edit, which Undo can take back.
    applyProposal: (proposal: Proposal) => {
      if (!draft || !style) return;
      const next = applyProposal(style, draft.plan, proposal);
      setLook(next);
      setBeforeShuffle(null);
    },
    suggestRestyle: async (text: string): Promise<Proposal | null> => {
      setError(null);
      setBusy((current) => new Set([...current, "restyle"]));
      try {
        return await api.restyle(projectId, text);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      } finally {
        setBusy((current) => new Set([...current].filter((l) => l !== "restyle")));
      }
    },
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo: () => travel(undo),
    redo: () => travel(redo),
    shuffle,
    canUndoShuffle: beforeShuffle !== null,
    undoShuffle: undoLastShuffle,
    applySavedStyle,
    saveStyle: (name: string, onSaved: () => Promise<void>) =>
      act("style", async () => {
        await api.saveStyle(projectId, name);
        await onSaved();
      }),
    // The server saves the picture onto the step; the draft takes it too, so the next autosave keeps it.
    uploadStepImage: (sceneId: string, file: File) =>
      act(`image:${sceneId}`, async () => {
        const saved = await api.uploadStepImage(projectId, sceneId, file);
        const index = Number(sceneId.slice(5)) - 1;
        const image = saved.plan.steps[index]?.image;
        setProject(saved);
        if (image) updatePlan((plan) => ({ ...plan, steps: plan.steps.map((s, i) => (i === index ? { ...s, image } : s)) }), null);
      }),
    removeStepImage: (sceneId: string) => {
      const index = Number(sceneId.slice(5)) - 1;
      updatePlan(
        (plan) => ({
          ...plan,
          steps: plan.steps.map((step, i) => {
            if (i !== index) return step;
            const { image: _removed, ...rest } = step;
            return rest;
          }),
        }),
        null,
      );
    },
    uploadLogo: (file: File) => run("logo", () => api.uploadLogo(projectId, file)),
    removeLogo: () => run("logo", () => api.removeLogo(projectId)),
    duplicate: (onDone: (copy: Project) => void) => act("duplicate", async () => onDone(await api.duplicate(projectId))),
    addStep: () => draft && project && change(addStep(draft)),
    // Undo restores doodles by position, so it is dropped once a step is removed.
    removeStep: (index: number) => {
      if (!draft) return;
      setBeforeShuffle(null);
      change(removeStep(draft, index));
    },
    reportError: setError,
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

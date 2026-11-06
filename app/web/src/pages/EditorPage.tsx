import { useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import type { PlayerRef } from "@remotion/player";
import { toReelProps } from "../../../shared/toReel";
import { buildScenes } from "../../../../src/timeline";
import { Timeline } from "../components/Timeline";
import { Tabs } from "../components/Tabs";
import { editTarget } from "../editTarget";
import { editableAt, useEditableHover } from "../useEditableHover";
import { timelineSegments } from "../timelineSegments";

// The right-hand column: the selected scene's text and voice, the reel's look, and its music.
type Panel = "scene" | "style" | "audio";
const PANELS: readonly { readonly id: Panel; readonly title: string }[] = [
  { id: "scene", title: "Scene" },
  { id: "style", title: "Style" },
  { id: "audio", title: "Music" },
];
import { takeNotice } from "../notice";
import { MoreMenu } from "../components/MoreMenu";
import { sceneIdsOf } from "../../../shared/toReel";
import { navigate } from "../App";
import { useProjectEditor } from "../useProjectEditor";
import { useServices } from "../useServices";
import { SceneList } from "../components/SceneList";
import { ScenePreview } from "../components/ScenePreview";
import { SceneInspector } from "../components/SceneInspector";
import { VoicePanel } from "../components/VoicePanel";
import { RenderBar } from "../components/RenderBar";
import { MusicPanel } from "../components/MusicPanel";
import { LookStrip } from "../components/LookStrip";
import { ShuffleBar } from "../components/ShuffleBar";
import { TransitionChips } from "../components/TransitionChips";
import { TunePanel } from "../components/TunePanel";
import { RestylePanel } from "../components/RestylePanel";
import { applyProposal } from "../restyle";
import type { Proposal } from "../../../shared/restyle";
import { useUndoKeys } from "../useUndoKeys";
import { ThemeToggle } from "../components/ThemeToggle";
import { SavedStylesBar } from "../components/SavedStylesBar";
import { BrandPanel } from "../components/BrandPanel";
import { BackdropPanel } from "../components/BackdropPanel";
import { useSavedStyles } from "../useSavedStyles";
import { applyStyle, type StyleOverride } from "../style";

export const EditorPage = ({ projectId }: { readonly projectId: string }) => {
  const editor = useProjectEditor(projectId);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"scene" | "full">("scene");
  const [panel, setPanel] = useState<Panel>("scene");
  const playerRef = useRef<PlayerRef>(null);
  const hover = useEditableHover();
  // A look or palette under the mouse, shown on the player but never saved.
  const [hovered, setHovered] = useState<StyleOverride | null>(null);
  // A suggested restyle shown on the player until it is applied or dropped.
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const { status, omnivoiceVoices } = useServices();
  const saved = useSavedStyles();
  useUndoKeys(editor.undo, editor.redo);
  // A message from the create page, such as which voices failed.
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    const message = takeNotice();
    if (message) setNotice(message);
  }, []);

  const { project, preview, style } = editor;
  const shown = useMemo(() => {
    if (!preview || !style) return preview;
    if (hovered) return applyStyle(preview, { ...style, ...hovered });
    if (!proposal) return preview;
    const next = applyProposal(style, preview.plan, proposal);
    return applyStyle({ ...preview, plan: next.plan }, next.style);
  }, [preview, style, hovered, proposal]);
  if (!project || !preview || !shown || !style) {
    return <main className="loading">{editor.error ?? "Loading..."}</main>;
  }

  const ids = sceneIdsOf(preview.plan);
  const index = Math.min(selected, ids.length - 1);
  const sceneId = ids[index];
  const props = toReelProps(shown);
  const segments = timelineSegments(buildScenes(props.spec, props.voice).map((scene) => ({ id: scene.voiceId, frames: scene.frames })));

  // A click on text in the preview selects its scene, shows the Scene panel and focuses that field.
  const openClickedText = (e: MouseEvent<HTMLDivElement>) => {
    const target = editTarget(editableAt(e.clientX, e.clientY)?.dataset.edit, ids);
    if (!target) return;
    setSelected(target.sceneIndex);
    setPanel("scene");
    window.setTimeout(() => document.getElementById(target.inputId)?.focus(), 0);
  };

  return (
    <main className="editor">
      <header className="topbar">
        <button className="link" onClick={() => navigate(null)}>
          &larr; All reels
        </button>
        <input
          className="name"
          value={preview.plan.name}
          maxLength={80}
          onChange={(e) => editor.updatePlan((p) => ({ ...p, name: e.target.value }))}
          aria-label="Reel name"
        />
        <span className="undo-redo">
          <button type="button" disabled={!editor.canUndo} onClick={editor.undo} title="Undo (Cmd+Z)" aria-label="Undo">
            &#8630;
          </button>
          <button type="button" disabled={!editor.canRedo} onClick={editor.redo} title="Redo (Cmd+Shift+Z)" aria-label="Redo">
            &#8631;
          </button>
        </span>
        <div className="topbar-actions">
          <span className="save-state" aria-live="polite">
            {editor.saving ? "Saving..." : "Saved"}
          </span>
          <MoreMenu>
            <button disabled={editor.busy.has("duplicate")} onClick={() => editor.duplicate((copy) => navigate(copy.id))} title="Make a copy of this reel to use as a template">
              Duplicate reel
            </button>
            <ThemeToggle />
          </MoreMenu>
          <RenderBar project={project} busy={editor.busy.size > 0} onRender={editor.render} onReset={editor.resetRender} />
        </div>
      </header>

      {editor.error || notice ? (
        <p className="error banner" role="alert">
          {editor.error ?? notice}{" "}
          <button
            className="link"
            onClick={() => {
              editor.dismissError();
              setNotice(null);
            }}
          >
            Dismiss
          </button>
        </p>
      ) : null}

      <div className="workspace">
        <SceneList project={preview} selected={index} onSelect={setSelected} onAddStep={() => { editor.addStep(); setSelected(ids.length - 1); }} />

        <section className="stage">
          <div className="mode-toggle">
            <button className={mode === "scene" ? "selected" : ""} onClick={() => setMode("scene")}>This scene</button>
            <button className={mode === "full" ? "selected" : ""} onClick={() => setMode("full")}>Whole video</button>
          </div>
          <div className="player-frame" onClick={openClickedText} {...hover}>
            <ScenePreview project={shown} sceneIndex={index} mode={mode} playerRef={playerRef} />
          </div>
          <Timeline segments={segments} selected={index} mode={mode} playerRef={playerRef} onSelect={setSelected} />
          <p className="hint stage-hint">Click any text on the preview to edit it.</p>
        </section>

        <aside className="side">
          <Tabs label="Editor panels" tabs={PANELS} value={panel} onChange={setPanel} />
          {panel === "scene" ? (
            <div className="tab-panel" role="tabpanel" id="panel-scene" aria-labelledby="tab-scene">
              <SceneInspector
                plan={preview.plan}
                sceneId={sceneId}
                language={preview.options.language}
                onChange={editor.updatePlan}
                imageBusy={editor.busy.has(`image:${sceneId}`)}
                onUploadImage={(file) => editor.uploadStepImage(sceneId, file)}
                onRemoveImage={() => editor.removeStepImage(sceneId)}
                artBusy={editor.busy.has(`art:${sceneId}`)}
                onDrawArt={() => editor.drawStepArt(sceneId)}
                onRemoveStep={() => {
                  editor.removeStep(index - 1);
                  setSelected(Math.max(0, index - 1));
                }}
              />
              <VoicePanel
                project={preview}
                sceneId={sceneId}
                status={status}
                omnivoiceVoices={omnivoiceVoices}
                busy={editor.busy.has(`voice:${sceneId}`)}
                onGenerate={(provider, choice) => editor.generateVoice(sceneId, provider, choice)}
                onUpload={(file) => editor.uploadVoice(sceneId, file)}
                onRemove={() => editor.removeVoice(sceneId)}
              />
            </div>
          ) : null}
          {panel === "style" ? (
            <div className="tab-panel" role="tabpanel" id="panel-style" aria-labelledby="tab-style">
          <LookStrip project={preview} style={style} onPreview={setHovered} onChange={(choice) => editor.setStyle({ ...style, ...choice })} />
          <RestylePanel
            style={style}
            proposal={proposal}
            busy={editor.busy.has("restyle")}
            onPreview={setProposal}
            onAsk={editor.suggestRestyle}
            onApply={(p) => {
              editor.applyProposal(p);
              setProposal(null);
            }}
          />
          <div className="look-tools">
            <div className="overlay-toggles" role="group" aria-label="On the video">
              <label className="toggle">
                <input type="checkbox" checked={style.captions} onChange={(e) => editor.setStyle({ ...style, captions: e.target.checked })} />
                Captions
              </label>
              <label className="toggle">
                <input type="checkbox" checked={style.progressBar} onChange={(e) => editor.setStyle({ ...style, progressBar: e.target.checked })} />
                Progress bar
              </label>
            </div>
            <TransitionChips style={style} onChange={(transition) => editor.setStyle({ ...style, transition })} />
            <TunePanel tune={style.tune} onChange={(tune) => editor.setStyle({ ...style, tune })} />
            <ShuffleBar style={style} canUndo={editor.canUndoShuffle} onShuffle={editor.shuffle} onUndo={editor.undoShuffle} />
            <SavedStylesBar
              styles={saved.styles}
              busy={editor.busy.has("style")}
              onApply={editor.applySavedStyle}
              onRemove={(id) => saved.remove(id).catch((e: Error) => editor.reportError(e.message))}
              onSave={(name) => editor.saveStyle(name, saved.refresh)}
            />
          </div>
          <BrandPanel
            brand={style.brand}
            logo={preview.logo}
            busy={editor.busy.has("logo")}
            onChange={(brand) => editor.setStyle({ ...style, brand })}
            onUpload={editor.uploadLogo}
            onRemoveLogo={editor.removeLogo}
          />
          <BackdropPanel
            backdrop={style.backdrop}
            busy={editor.busy.has("backdrop")}
            hasArt={preview.plan.steps.some((s) => s.art)}
            onChange={(backdrop) => editor.setStyle({ ...style, backdrop })}
            onUpload={editor.uploadBackdrop}
          />
            </div>
          ) : null}
          {panel === "audio" ? (
            <div className="tab-panel" role="tabpanel" id="panel-audio" aria-labelledby="tab-audio">
              <MusicPanel
                music={preview.music}
                settings={style.music}
                busy={editor.busy.has("music")}
                onUpload={editor.uploadMusic}
                onRemove={editor.removeMusic}
                onChange={editor.setMusic}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  );
};

import { useState } from "react";
import { sceneIdsOf } from "../../../shared/toReel";
import { PALETTES } from "../../../../src/palettes";
import { navigate } from "../App";
import { useProjectEditor } from "../useProjectEditor";
import { useServices } from "../useServices";
import { SceneList } from "../components/SceneList";
import { ScenePreview } from "../components/ScenePreview";
import { SceneInspector } from "../components/SceneInspector";
import { VoicePanel } from "../components/VoicePanel";
import { RenderBar } from "../components/RenderBar";
import { MusicPanel } from "../components/MusicPanel";

export const EditorPage = ({ projectId }: { readonly projectId: string }) => {
  const editor = useProjectEditor(projectId);
  const [selected, setSelected] = useState(0);
  const [mode, setMode] = useState<"scene" | "full">("scene");
  const { status, omnivoiceVoices } = useServices();

  const { project, preview, look } = editor;
  if (!project || !preview || !look) {
    return <main className="loading">{editor.error ?? "Loading..."}</main>;
  }

  const ids = sceneIdsOf(preview.plan);
  const index = Math.min(selected, ids.length - 1);
  const sceneId = ids[index];

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
        <span className="save-state">{editor.saving ? "Saving..." : "Saved"}</span>
        <div className="swatches small">
          {(Object.keys(PALETTES) as (keyof typeof PALETTES)[]).map((name) => (
            <button
              key={name}
              className={`swatch${look.palette === name ? " selected" : ""}`}
              style={{ background: PALETTES[name].accent }}
              onClick={() => editor.setLook({ ...look, palette: name })}
              aria-label={`${name} colours`}
            />
          ))}
        </div>
        <label className="toggle">
          <input type="checkbox" checked={look.captions} onChange={(e) => editor.setLook({ ...look, captions: e.target.checked })} />
          Captions
        </label>
        <RenderBar project={project} busy={editor.busy.size > 0} onRender={editor.render} onReset={editor.resetRender} />
      </header>

      {editor.error ? (
        <p className="error banner">
          {editor.error} <button className="link" onClick={editor.dismissError}>Dismiss</button>
        </p>
      ) : null}

      <div className="workspace">
        <SceneList project={preview} selected={index} onSelect={setSelected} onAddStep={() => { editor.addStep(); setSelected(ids.length - 1); }} />

        <section className="stage">
          <div className="mode-toggle">
            <button className={mode === "scene" ? "selected" : ""} onClick={() => setMode("scene")}>This scene</button>
            <button className={mode === "full" ? "selected" : ""} onClick={() => setMode("full")}>Whole video</button>
          </div>
          <div className="player-frame">
            <ScenePreview project={preview} sceneIndex={index} mode={mode} />
          </div>
          <MusicPanel
            music={preview.music}
            settings={look.music}
            busy={editor.busy.has("music")}
            onUpload={editor.uploadMusic}
            onRemove={editor.removeMusic}
            onChange={editor.setMusic}
          />
        </section>

        <aside className="side">
          <SceneInspector
            plan={preview.plan}
            sceneId={sceneId}
            language={preview.options.language}
            onChange={editor.updatePlan}
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
        </aside>
      </div>
    </main>
  );
};

import { useRef } from "react";
import type { Project } from "../../../shared/project";
import { voiceStatus } from "./SceneList";

type Props = {
  readonly project: Project;
  readonly sceneId: string;
  readonly elevenlabs: boolean;
  readonly busy: boolean;
  readonly onGenerate: (provider: "eleven" | "mac") => void;
  readonly onUpload: (file: File) => void;
  readonly onRemove: () => void;
};

export const VoicePanel = ({ project, sceneId, elevenlabs, busy, onGenerate, onUpload, onRemove }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const clip = project.voice[sceneId];
  const status = voiceStatus(project, sceneId);
  const hasText = Boolean(project.plan.narration[sceneId]?.trim());

  return (
    <section className="voice-panel">
      <header>
        <h3>Voiceover</h3>
        <span className={`badge ${status.tone}`}>{busy ? "Working..." : status.label}</span>
      </header>
      {clip ? (
        <div className="clip">
          <audio controls src={clip.src} preload="metadata" />
          <small>{clip.duration.toFixed(1)}s{clip.source === "upload" ? " - captions are spread over the clip using the narration text" : ""}</small>
        </div>
      ) : (
        <p className="hint">No voice yet. The scene uses its minimum length until you add one.</p>
      )}
      {status.tone === "warn" ? <p className="hint warn">The narration changed after this voice was made. Generate again to match.</p> : null}
      <div className="voice-actions">
        <button disabled={busy || !hasText || !elevenlabs} title={elevenlabs ? "" : "Add ELEVENLABS_API_KEY to .env.local"} onClick={() => onGenerate("eleven")}>
          Generate (ElevenLabs)
        </button>
        <button disabled={busy || !hasText} onClick={() => onGenerate("mac")}>
          Generate (Mac voice)
        </button>
        <button disabled={busy} onClick={() => input.current?.click()}>
          Upload recording
        </button>
        {clip ? (
          <button className="danger" disabled={busy} onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="audio/*,video/mp4,.m4a,.mp3,.wav,.aac,.ogg,.webm"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onUpload(file);
          e.target.value = "";
        }}
      />
    </section>
  );
};

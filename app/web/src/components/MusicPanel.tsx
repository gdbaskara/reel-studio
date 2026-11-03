import { useRef } from "react";
import type { Music, MusicSettings } from "../../../shared/project";

type Props = {
  readonly music: Music | undefined;
  readonly settings: MusicSettings;
  readonly busy: boolean;
  readonly onUpload: (file: File) => void;
  readonly onRemove: () => void;
  readonly onChange: (settings: MusicSettings) => void;
};

const minutes = (seconds: number) => {
  const whole = Math.round(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
};

// One music track for the whole reel, with its volume and whether it dips under the voice.
export const MusicPanel = ({ music, settings, busy, onUpload, onRemove, onChange }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  return (
    <section className="music-panel">
      <header>
        <h3>Background music</h3>
        {busy ? <span className="badge">Working...</span> : null}
      </header>
      {music ? (
        <div className="clip">
          <audio controls src={music.src} preload="metadata" />
          <small title={music.name}>
            {music.name} - {minutes(music.duration)} (repeats if the reel is longer)
          </small>
        </div>
      ) : (
        <p className="hint">No music. Use a royalty-free track so Instagram does not mute the reel.</p>
      )}
      {music ? (
        <>
          <label className="field slider">
            <span>Volume {Math.round(settings.volume * 100)}%</span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={Math.round(settings.volume * 100)}
              onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) / 100 })}
              aria-label="Music volume"
            />
          </label>
          <label className="toggle">
            <input type="checkbox" checked={settings.duck} onChange={(e) => onChange({ ...settings, duck: e.target.checked })} />
            Lower the music while the voice speaks
          </label>
        </>
      ) : null}
      <div className="voice-actions">
        <button disabled={busy} onClick={() => input.current?.click()}>
          {music ? "Replace music" : "Upload music"}
        </button>
        {music ? (
          <button className="danger" disabled={busy} onClick={onRemove}>
            Remove
          </button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.aac,.ogg,.flac"
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

import { useRef, useState } from "react";
import type { Clip, Generator, Project } from "../../../shared/project";
import type { OmnivoiceVoice, Status, VoiceChoice, VoiceboxProfile } from "../api";
import { OMNIVOICE_PICKER, VOICEBOX_PICKER, omnivoiceOptions, voiceboxOptions } from "../voices";
import { VoicePicker } from "./VoicePicker";
import { voiceStatus } from "./SceneList";

type Props = {
  readonly project: Project;
  readonly sceneId: string;
  readonly status: Status | null;
  readonly profiles: readonly VoiceboxProfile[];
  readonly omnivoiceVoices: readonly OmnivoiceVoice[];
  readonly busy: boolean;
  readonly onGenerate: (provider: Generator, choice?: VoiceChoice) => void;
  readonly onUpload: (file: File) => void;
  readonly onRemove: () => void;
};

const timingNote = (clip: Clip, whisper: boolean): string => {
  if (clip.timing === "provider") return "Captions timed by ElevenLabs";
  if (clip.timing === "whisper") return "Captions timed by Whisper";
  if (clip.timing === "estimate") return whisper ? "Captions estimated (the audio did not match the narration text)" : "Captions estimated - install whisper.cpp for exact timing";
  return "";
};

export const VoicePanel = ({ project, sceneId, status: services, profiles, omnivoiceVoices, busy, onGenerate, onUpload, onRemove }: Props) => {
  const input = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState(project.options.voiceboxProfile);
  const [omniVoice, setOmniVoice] = useState(project.options.omnivoiceVoice);
  const clip = project.voice[sceneId];
  const status = voiceStatus(project, sceneId);
  const elevenlabs = Boolean(services?.elevenlabs);
  const voicebox = Boolean(services?.voicebox);
  const omnivoice = Boolean(services?.omnivoice);
  const note = clip ? timingNote(clip, Boolean(services?.whisper)) : "";
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
          <small>
            {clip.duration.toFixed(1)}s{note ? ` - ${note}` : ""}
          </small>
        </div>
      ) : (
        <p className="hint">No voice yet. The scene uses its minimum length until you add one.</p>
      )}
      {status.tone === "warn" ? <p className="hint warn">The narration changed after this voice was made. Generate again to match.</p> : null}
      <div className="voice-actions">
        <button disabled={busy || !hasText || !elevenlabs} title={elevenlabs ? "" : "Add ELEVENLABS_API_KEY to .env.local"} onClick={() => onGenerate("eleven")}>
          Generate (ElevenLabs)
        </button>
        <button
          disabled={busy || !hasText || !voicebox}
          title={voicebox ? (project.options.language === "id" ? "Indonesian uses Voicebox's Malay voice" : "") : "Open Voicebox and turn on Keep server running"}
          onClick={() => onGenerate("voicebox", { voiceboxProfile: profile })}
        >
          Generate (Voicebox)
        </button>
        <button
          disabled={busy || !hasText || !omnivoice}
          title={omnivoice ? "Local, native Indonesian. Non-commercial license" : "Start it with: npm run omnivoice"}
          onClick={() => onGenerate("omnivoice", { omnivoiceVoice: omniVoice })}
        >
          Generate (OmniVoice)
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
      {voicebox && profiles.length ? <VoicePicker {...VOICEBOX_PICKER} voices={voiceboxOptions(profiles)} value={profile} onChange={setProfile} /> : null}
      {omnivoice && omnivoiceVoices.length ? (
        <VoicePicker {...OMNIVOICE_PICKER} voices={omnivoiceOptions(omnivoiceVoices)} value={omniVoice} onChange={setOmniVoice} />
      ) : null}
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

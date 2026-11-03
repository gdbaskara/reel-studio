import type { VoiceboxProfile } from "../api";

type Props = {
  readonly profiles: readonly VoiceboxProfile[];
  readonly value: string | undefined;
  readonly onChange: (id: string | undefined) => void;
};

// An empty value means "use the server default" (VOICEBOX_PROFILE_ID / _EN / VOICEBOX_PROFILE).
export const ProfilePicker = ({ profiles, value, onChange }: Props) => (
  <label className="field">
    <span>Voicebox voice profile</span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">Default (from .env.local)</option>
      {profiles.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
          {p.language ? ` (${p.language})` : ""}
        </option>
      ))}
    </select>
  </label>
);

export type VoiceOption = { readonly id: string; readonly label: string };

type Props = {
  readonly label: string;
  // Text of the empty choice, which means "use the server default" from .env.local.
  readonly defaultLabel: string;
  readonly voices: readonly VoiceOption[];
  readonly value: string | undefined;
  readonly onChange: (id: string | undefined) => void;
};

// One select for any local voice list (Voicebox profiles, OmniVoice voices).
export const VoicePicker = ({ label, defaultLabel, voices, value, onChange }: Props) => (
  <label className="field">
    <span>{label}</span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{defaultLabel}</option>
      {voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label}
        </option>
      ))}
    </select>
  </label>
);

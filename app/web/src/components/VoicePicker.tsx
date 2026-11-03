export type VoiceOption = { readonly id: string; readonly label: string };

type Props = {
  readonly label: string;
  readonly voices: readonly VoiceOption[];
  readonly value: string | undefined;
  readonly onChange: (id: string) => void;
};

// A select over the voices the local TTS server offers; the default voice is already selected.
export const VoicePicker = ({ label, voices, value, onChange }: Props) => (
  <label className="field">
    <span>{label}</span>
    <select value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
      {voices.map((v) => (
        <option key={v.id} value={v.id}>
          {v.label}
        </option>
      ))}
    </select>
  </label>
);

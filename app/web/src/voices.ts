import type { OmnivoiceVoice } from "./api";
import type { VoiceOption } from "./components/VoicePicker";

export const omnivoiceOptions = (voices: readonly OmnivoiceVoice[]): readonly VoiceOption[] =>
  voices.map((v) => ({ id: v.id, label: v.name }));

// The voice the picker shows: the saved choice if it still exists, else the server's default.
export const pickedVoice = (chosen: string | undefined, voices: readonly OmnivoiceVoice[]): string | undefined =>
  chosen && voices.some((v) => v.id === chosen) ? chosen : (voices.find((v) => v.default) ?? voices[0])?.id;

export const OMNIVOICE_PICKER_LABEL = "OmniVoice voice";

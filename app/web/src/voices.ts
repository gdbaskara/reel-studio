import type { OmnivoiceVoice, VoiceboxProfile } from "./api";
import type { VoiceOption } from "./components/VoicePicker";

// Picker rows for each local provider, plus the matching picker labels.
export const voiceboxOptions = (profiles: readonly VoiceboxProfile[]): readonly VoiceOption[] =>
  profiles.map((p) => ({ id: p.id, label: p.language ? `${p.name} (${p.language})` : p.name }));

export const omnivoiceOptions = (voices: readonly OmnivoiceVoice[]): readonly VoiceOption[] =>
  voices.map((v) => ({ id: v.id, label: v.name }));

export const VOICEBOX_PICKER = { label: "Voicebox voice profile", defaultLabel: "Default (from .env.local)" } as const;
export const OMNIVOICE_PICKER = { label: "OmniVoice voice", defaultLabel: "Default (OMNIVOICE_VOICE or Wanita)" } as const;

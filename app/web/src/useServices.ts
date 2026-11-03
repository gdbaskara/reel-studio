import { useEffect, useState } from "react";
import { api, type OmnivoiceVoice, type Status, type VoiceboxProfile } from "./api";

export type Services = {
  readonly status: Status | null;
  readonly profiles: readonly VoiceboxProfile[];
  readonly omnivoiceVoices: readonly OmnivoiceVoice[];
};

// Which voice/caption services are available. Re-checked when the window regains focus,
// so starting Voicebox or OmniVoice, or installing Whisper shows up without a reload.
export const useServices = (): Services => {
  const [status, setStatus] = useState<Status | null>(null);
  const [profiles, setProfiles] = useState<readonly VoiceboxProfile[]>([]);
  const [omnivoiceVoices, setOmnivoiceVoices] = useState<readonly OmnivoiceVoice[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await api.status().catch(() => null);
      const [list, voices] = await Promise.all([
        next?.voicebox ? api.voiceboxProfiles().catch(() => []) : [],
        next?.omnivoice ? api.omnivoiceVoices().catch(() => []) : [],
      ]);
      if (!active) return;
      setStatus(next);
      setProfiles(list);
      setOmnivoiceVoices(voices);
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { status, profiles, omnivoiceVoices };
};

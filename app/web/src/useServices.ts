import { useEffect, useState } from "react";
import { api, type Status, type VoiceboxProfile } from "./api";

export type Services = { readonly status: Status | null; readonly profiles: readonly VoiceboxProfile[] };

// Which voice/caption services are available. Re-checked when the window regains focus,
// so starting Voicebox or installing Whisper shows up without a reload.
export const useServices = (): Services => {
  const [status, setStatus] = useState<Status | null>(null);
  const [profiles, setProfiles] = useState<readonly VoiceboxProfile[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await api.status().catch(() => null);
      const list = next?.voicebox ? await api.voiceboxProfiles().catch(() => []) : [];
      if (!active) return;
      setStatus(next);
      setProfiles(list);
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { status, profiles };
};

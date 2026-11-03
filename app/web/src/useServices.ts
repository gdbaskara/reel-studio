import { useEffect, useState } from "react";
import { api, type OmnivoiceVoice, type Status } from "./api";

export type Services = {
  readonly status: Status | null;
  readonly omnivoiceVoices: readonly OmnivoiceVoice[];
};

// Which voice/caption services are available. Re-checked when the window regains focus,
// so starting OmniVoice or installing Whisper shows up without a reload.
export const useServices = (): Services => {
  const [status, setStatus] = useState<Status | null>(null);
  const [omnivoiceVoices, setOmnivoiceVoices] = useState<readonly OmnivoiceVoice[]>([]);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      const next = await api.status().catch(() => null);
      const voices = next?.omnivoice ? await api.omnivoiceVoices().catch(() => []) : [];
      if (!active) return;
      setStatus(next);
      setOmnivoiceVoices(voices);
    };
    void refresh();
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("focus", refresh);
    };
  }, []);

  return { status, omnivoiceVoices };
};

import type { CreateOptions } from "../../shared/project";
import type { Status } from "./api";

type Running = Pick<Status, "elevenlabs" | "voicebox" | "omnivoice">;

// The voice a new reel starts with. Indonesian prefers OmniVoice, which speaks it natively
// (Voicebox only has Malay). English keeps ElevenLabs first for its exact caption timing.
export const defaultVoiceMode = (language: CreateOptions["language"], running: Running): CreateOptions["voiceMode"] => {
  if (language === "id" && running.omnivoice) return "omnivoice";
  if (running.elevenlabs) return "eleven";
  if (running.omnivoice) return "omnivoice";
  if (running.voicebox) return "voicebox";
  return "mixed";
};

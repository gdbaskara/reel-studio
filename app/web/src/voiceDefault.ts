import type { CreateOptions } from "../../shared/project";
import type { Status } from "./api";

type Running = Pick<Status, "elevenlabs" | "omnivoice">;

// The voice a new reel starts with. Indonesian prefers OmniVoice, which speaks it natively.
// English keeps ElevenLabs first for its exact caption timing.
export const defaultVoiceMode = (language: CreateOptions["language"], running: Running): CreateOptions["voiceMode"] => {
  if (language === "id" && running.omnivoice) return "omnivoice";
  if (running.elevenlabs) return "eleven";
  if (running.omnivoice) return "omnivoice";
  return "mixed";
};

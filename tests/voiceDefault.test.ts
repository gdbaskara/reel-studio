import { describe, expect, it } from "vitest";
import { defaultVoiceMode } from "../app/web/src/voiceDefault";

const up = { elevenlabs: true, omnivoice: true };
const down = { elevenlabs: false, omnivoice: false };

describe("defaultVoiceMode", () => {
  it("picks OmniVoice for Indonesian whenever it is running, even with ElevenLabs", () => {
    expect(defaultVoiceMode("id", up)).toBe("omnivoice");
    expect(defaultVoiceMode("id", { ...down, omnivoice: true })).toBe("omnivoice");
  });

  it("falls back to ElevenLabs, then per scene for Indonesian", () => {
    expect(defaultVoiceMode("id", { ...up, omnivoice: false })).toBe("eleven");
    expect(defaultVoiceMode("id", down)).toBe("mixed");
  });

  it("keeps ElevenLabs first for English, then OmniVoice", () => {
    expect(defaultVoiceMode("en", up)).toBe("eleven");
    expect(defaultVoiceMode("en", { ...up, elevenlabs: false })).toBe("omnivoice");
    expect(defaultVoiceMode("en", down)).toBe("mixed");
  });
});

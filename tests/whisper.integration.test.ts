import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { transcribeWithWhisper, whisperSetup } from "../app/server/captions/whisper";
import { timeWords } from "../app/server/captions/timeWords";

const setup = whisperSetup();
const installed = Boolean(setup.bin && setup.model);
const CLIP = join(import.meta.dirname, "..", "public", "vo", "atlas", "step-1.wav");

// Runs the real whisper.cpp; skipped where it is not installed (npm run setup:whisper).
describe.skipIf(!installed)("whisper.cpp integration", () => {
  it("hears the demo clip with word timings", async () => {
    const words = await transcribeWithWhisper(CLIP, "id");
    expect(words?.map((w) => w.text.toLowerCase())).toContain("login");
    words?.forEach((w) => expect(w.end).toBeGreaterThanOrEqual(w.start));
  }, 60_000);

  it("times the script with whisper and keeps the script spelling", async () => {
    const result = await timeWords(CLIP, "Satu. Login pakai akun Microsoft kantor kamu.", 2.9, "id");
    expect(result.timing).toBe("whisper");
    expect(result.words[0].text).toBe("Satu.");
    expect(result.words[1].start).toBeGreaterThan(0.2);
  }, 60_000);
});

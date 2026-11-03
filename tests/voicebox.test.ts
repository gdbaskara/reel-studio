import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { listVoiceboxProfiles, voicebox, voiceboxEngine } from "../scripts/providers.mjs";

const BASE = "http://127.0.0.1:17493";

afterEach(() => vi.unstubAllGlobals());

describe("voiceboxEngine", () => {
  it("uses Qwen for English and Chatterbox Malay for Indonesian", () => {
    expect(voiceboxEngine("en")).toEqual({ language: "en", engine: "qwen" });
    expect(voiceboxEngine("id")).toEqual({ language: "ms", engine: "chatterbox" });
  });
});

describe("voicebox", () => {
  it("posts the narration to /generate/stream and saves the wav", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([82, 73, 70, 70]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const dir = mkdtempSync(join(tmpdir(), "vb-"));
    try {
      const out = join(dir, "voice.wav");
      const words = await voicebox({ baseUrl: BASE, profileId: "p1", language: "id" })("Halo semua", out);
      expect(words).toBeNull();
      expect(readFileSync(out).toString()).toBe("RIFF");
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`${BASE}/generate/stream`);
      expect(JSON.parse(String(init.body))).toMatchObject({ profile_id: "p1", text: "Halo semua", language: "ms", engine: "chatterbox" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("explains how to start Voicebox when it is not running", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    await expect(voicebox({ baseUrl: BASE, profileId: "p1", language: "en" })("Hi", "/tmp/never.wav")).rejects.toThrow(/Open Voicebox/);
  });

  it("surfaces the Voicebox error message", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Model not downloaded" }), { status: 400 })));
    await expect(voicebox({ baseUrl: BASE, profileId: "p1", language: "en" })("Hi", "/tmp/never.wav")).rejects.toThrow(/Model not downloaded/);
  });

  it("needs a voice profile", async () => {
    await expect(voicebox({ baseUrl: BASE, profileId: "", language: "en" })("Hi", "/tmp/never.wav")).rejects.toThrow(/profile/);
  });
});

describe("listVoiceboxProfiles", () => {
  it("returns id, name and language of each profile", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: "a", name: "Me", language: "en", extra: 1 }]))));
    expect(await listVoiceboxProfiles(BASE)).toEqual([{ id: "a", name: "Me", language: "en" }]);
  });

  it("drops entries without a usable id", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ name: "x" }, { id: 3 }, { id: "ok", name: "Ok" }]))));
    expect(await listVoiceboxProfiles(BASE)).toEqual([{ id: "ok", name: "Ok", language: "" }]);
  });
});

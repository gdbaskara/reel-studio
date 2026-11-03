import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_OMNIVOICE_URL, listOmnivoiceVoices, omnivoice, omnivoiceRunning } from "../scripts/providers.mjs";

const BASE = "http://127.0.0.1:17600";

afterEach(() => vi.unstubAllGlobals());

describe("omnivoice", () => {
  it("defaults to the local OmniVoice port", () => {
    expect(DEFAULT_OMNIVOICE_URL).toBe(BASE);
  });

  it("posts the narration to /tts and saves the wav", async () => {
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([82, 73, 70, 70]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const dir = mkdtempSync(join(tmpdir(), "ov-"));
    try {
      const out = join(dir, "voice.wav");
      const words = await omnivoice({ baseUrl: BASE, voice: "wanita", language: "id" })("Halo semua", out);
      expect(words).toBeNull();
      expect(readFileSync(out).toString()).toBe("RIFF");
      const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
      expect(url).toBe(`${BASE}/tts`);
      expect(init.method).toBe("POST");
      expect(new Headers(init.headers).get("Content-Type")).toBe("application/json");
      expect(JSON.parse(String(init.body))).toEqual({ text: "Halo semua", language: "id", voice: "wanita" });
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("explains how to start OmniVoice when it is not running", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    await expect(omnivoice({ baseUrl: BASE, voice: "pria", language: "en" })("Hi", "/tmp/never.wav")).rejects.toThrow(
      "OmniVoice is not running. Start it with: npm run omnivoice",
    );
  });

  it("surfaces the OmniVoice error detail", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ detail: "Unknown voice: budi" }), { status: 404 })));
    await expect(omnivoice({ baseUrl: BASE, voice: "budi", language: "id" })("Hi", "/tmp/never.wav")).rejects.toThrow(
      /OmniVoice returned 404: Unknown voice: budi/,
    );
  });

  it("rejects voice ids outside the shared contract before calling the server", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(omnivoice({ baseUrl: BASE, voice: "../x", language: "id" })("Hi", "/tmp/never.wav")).rejects.toThrow(/voice/);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("listOmnivoiceVoices", () => {
  it("returns id, name and builtin of each voice", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([{ id: "wanita", name: "Wanita (default)", builtin: true, extra: 1 }]))));
    expect(await listOmnivoiceVoices(BASE)).toEqual([{ id: "wanita", name: "Wanita (default)", builtin: true }]);
  });

  it("drops entries without a usable id", async () => {
    const list = [{ name: "x" }, { id: 3 }, { id: "Bad Id" }, { id: "budi" }];
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(list))));
    expect(await listOmnivoiceVoices(BASE)).toEqual([{ id: "budi", name: "budi", builtin: false }]);
  });

  it("explains how to start OmniVoice when listing fails to connect", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    await expect(listOmnivoiceVoices(BASE)).rejects.toThrow(/npm run omnivoice/);
  });
});

describe("omnivoiceRunning", () => {
  it("is true when /health answers ok and false when unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: "ok" }))));
    expect(await omnivoiceRunning(BASE)).toBe(true);
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new TypeError("fetch failed");
    }));
    expect(await omnivoiceRunning(BASE)).toBe(false);
  });
});

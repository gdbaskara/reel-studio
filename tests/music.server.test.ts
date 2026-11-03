import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importMusic, musicFileName } from "../app/server/music";
import { audioInUse, pruneAudio, releasePending } from "../app/server/audioFiles";
import { audioDir, projectDir } from "../app/server/paths";

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

const PROJECT = "p-musictest-000000";
let scratch = "";

const tone = (seconds: number) => {
  const path = join(scratch, `tone-${seconds}.mp3`);
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", `sine=frequency=440:duration=${seconds}`, path]);
  return readFile(path);
};

describe("musicFileName", () => {
  it("decodes the header and keeps a clean, short name", () => {
    expect(musicFileName(encodeURIComponent("Lofi beat.mp3"))).toBe("Lofi beat.mp3");
    expect(musicFileName(encodeURIComponent("a\u0000b\nc"))).toBe("abc");
    expect(musicFileName("%E0%A4%A")).toBe("Background music");
    expect(musicFileName(undefined)).toBe("Background music");
    expect(musicFileName(encodeURIComponent("x".repeat(300)))).toHaveLength(120);
  });
});

describe("audioInUse", () => {
  it("keeps the music track alongside every voice clip", () => {
    const clip = { duration: 1, text: "a", words: [], src: "/a/title-1.wav", source: "upload" } as const;
    const music = { src: "/a/music-1.m4a", duration: 10, name: "Song" };
    expect(audioInUse({ voice: { title: clip }, music }).map((a) => a.src)).toEqual(["/a/title-1.wav", "/a/music-1.m4a"]);
    expect(audioInUse({ voice: { title: clip } }).map((a) => a.src)).toEqual(["/a/title-1.wav"]);
  });
});

describe.skipIf(!hasFfmpeg)("importMusic", () => {
  beforeAll(async () => {
    scratch = await mkdtemp(join(tmpdir(), "music-test-"));
  });
  afterAll(async () => {
    await rm(scratch, { recursive: true, force: true });
    await rm(projectDir(PROJECT), { recursive: true, force: true });
  });

  it("stores the track as AAC and reports its length", async () => {
    const music = await importMusic(PROJECT, await tone(3), "Tone");
    expect(music.src).toMatch(new RegExp(`^/api/projects/${PROJECT}/audio/music-\\d+\\.m4a$`));
    expect(music.duration).toBeGreaterThan(2.8);
    expect(music.duration).toBeLessThan(3.3);
    expect(music.name).toBe("Tone");
    const file = music.src.split("/").pop() ?? "";
    expect(existsSync(join(audioDir(PROJECT), file))).toBe(true);

    // Unsaved, it survives a prune; once released and unreferenced, it is cleaned up.
    await pruneAudio(PROJECT, []);
    expect(await readdir(audioDir(PROJECT))).toContain(file);
    await pruneAudio(PROJECT, [music]);
    releasePending(music);
    await pruneAudio(PROJECT, [music]);
    expect(await readdir(audioDir(PROJECT))).toContain(file);
    await pruneAudio(PROJECT, []);
    expect(await readdir(audioDir(PROJECT))).not.toContain(file);
  }, 30_000);

  it("rejects empty, unreadable and too-short audio", async () => {
    await expect(importMusic(PROJECT, Buffer.alloc(0), "x")).rejects.toThrow(/empty/);
    await expect(importMusic(PROJECT, Buffer.from("not audio at all"), "x")).rejects.toThrow(/read that audio/);
    await expect(importMusic(PROJECT, await tone(1), "x")).rejects.toThrow(/at least/);
    const left = await readdir(audioDir(PROJECT)).catch(() => [] as string[]);
    expect(left.filter((f) => f.startsWith("music-"))).toEqual([]);
  }, 30_000);
});

import { describe, expect, it } from "vitest";
import { DUCK_RATIO, FADE_FRAMES, musicCopies, musicVolume, sceneStart, voiceWindows } from "../src/music";
import { buildScenes, FPS, VOICE_DELAY } from "../src/timeline";
import { PANDU_REEL } from "../src/reels/pandu";
import { toReelProps } from "../app/shared/toReel";
import type { Project } from "../app/shared/project";

const clip = (duration: number) => ({ duration, text: "x", words: [] });

describe("voiceWindows", () => {
  it("marks where each voice clip plays on the reel timeline", () => {
    const scenes = buildScenes(PANDU_REEL, { title: clip(2), "step-2": clip(3) });
    const step2 = sceneStart(scenes, 2);
    expect(voiceWindows(scenes)).toEqual([
      { start: VOICE_DELAY, end: VOICE_DELAY + 2 * FPS },
      { start: step2 + VOICE_DELAY, end: step2 + VOICE_DELAY + 3 * FPS },
    ]);
  });

  it("is empty when no scene has a voice", () => {
    expect(voiceWindows(buildScenes(PANDU_REEL, {}))).toEqual([]);
  });
});

describe("sceneStart", () => {
  it("sums the frames of the scenes before it", () => {
    const scenes = buildScenes(PANDU_REEL, {});
    expect(sceneStart(scenes, 0)).toBe(0);
    expect(sceneStart(scenes, 2)).toBe(scenes[0].frames + scenes[1].frames);
  });
});

describe("musicVolume", () => {
  const windows = [{ start: 100, end: 200 }];
  const base = { volume: 0.5, duck: true, windows, total: 400 };

  it("plays at full volume away from any voice", () => {
    expect(musicVolume(300, base)).toBeCloseTo(0.5);
  });

  it("ducks under the voice", () => {
    expect(musicVolume(150, base)).toBeCloseTo(0.5 * DUCK_RATIO);
  });

  it("ramps smoothly into and out of the duck", () => {
    const before = musicVolume(96, base);
    expect(before).toBeLessThan(0.5);
    expect(before).toBeGreaterThan(0.5 * DUCK_RATIO);
    expect(musicVolume(204, base)).toBeCloseTo(before);
  });

  it("does not duck when ducking is off", () => {
    expect(musicVolume(150, { ...base, duck: false })).toBeCloseTo(0.5);
  });

  it("fades in at the start and out at the end", () => {
    expect(musicVolume(0, { ...base, windows: [] })).toBeLessThan(0.5 / 2);
    expect(musicVolume(FADE_FRAMES, { ...base, windows: [] })).toBeCloseTo(0.5);
    expect(musicVolume(399, { ...base, windows: [] })).toBeLessThan(0.5 / 2);
  });

  it("stays silent at zero volume and never goes negative", () => {
    expect(musicVolume(150, { ...base, volume: 0 })).toBe(0);
    expect(musicVolume(500, base)).toBe(0);
  });
});

describe("musicCopies", () => {
  it("plays one trimmed copy when the song is longer than the reel", () => {
    expect(musicCopies(300, 900, 0)).toEqual([{ from: 0, duration: 300, trim: 0, reelStart: 0 }]);
  });

  it("repeats a short song back to back and cuts the last copy at the reel end", () => {
    expect(musicCopies(250, 100, 0)).toEqual([
      { from: 0, duration: 100, trim: 0, reelStart: 0 },
      { from: 100, duration: 100, trim: 0, reelStart: 100 },
      { from: 200, duration: 50, trim: 0, reelStart: 200 },
    ]);
  });

  it("starts a scene preview part-way into the copy playing at that point of the reel", () => {
    // Scene starts at reel frame 150: the second copy is already 50 frames in.
    expect(musicCopies(250, 100, 150)).toEqual([
      { from: 0, duration: 50, trim: 50, reelStart: 150 },
      { from: 50, duration: 50, trim: 0, reelStart: 200 },
    ]);
    // A song longer than the reel: the preview of a later scene is trimmed, not restarted.
    expect(musicCopies(300, 900, 210)).toEqual([{ from: 0, duration: 90, trim: 210, reelStart: 210 }]);
  });

  it("covers every reel frame exactly once from the offset on", () => {
    for (const [total, length, offset] of [[401, 37, 0], [401, 37, 120], [90, 90, 30], [10, 3, 9]]) {
      const copies = musicCopies(total, length, offset);
      expect(copies.reduce((sum, c) => sum + c.duration, 0)).toBe(total - offset);
      copies.forEach((c, i) => {
        expect(c.reelStart).toBe(offset + c.from);
        expect(c.trim).toBe(i === 0 ? offset % length : 0);
        if (i > 0) expect(c.from).toBe(copies[i - 1].from + copies[i - 1].duration);
      });
    }
  });
});

const project = (extra: Partial<Project> = {}): Project => ({
  id: "p-test01-abcdef",
  name: "Test",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: { language: "id", stepCount: 2, planMode: "manual", voiceMode: "upload", captions: true, palette: "green" },
  plan: {
    name: "Test",
    title: { lead: "a", main: "b" },
    steps: [{ title: "s", note: "n", drawing: "arrow" }],
    outro: { main: "o", sub: "s" },
    narration: {},
  },
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
  ...extra,
});

describe("toReelProps music", () => {
  it("leaves music out when the project has none", () => {
    expect(toReelProps(project()).music).toBeUndefined();
  });

  it("passes the track with default settings and an absolute url", () => {
    const music = { src: "/api/projects/p-test01-abcdef/audio/music-1.m4a", duration: 30, name: "Song" };
    expect(toReelProps(project({ music }), "http://localhost:4310").music).toEqual({
      src: "http://localhost:4310/api/projects/p-test01-abcdef/audio/music-1.m4a",
      duration: 30,
      volume: 0.3,
      duck: true,
    });
  });

  it("uses the saved volume and ducking choice", () => {
    const music = { src: "/x/music-1.m4a", duration: 30, name: "Song" };
    const options = { ...project().options, music: { volume: 0.6, duck: false } };
    expect(toReelProps(project({ music, options })).music).toMatchObject({ volume: 0.6, duck: false });
  });
});

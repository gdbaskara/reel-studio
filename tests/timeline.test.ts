import { describe, expect, it } from "vitest";
import { buildScenes, FPS, sceneFrames, totalFrames, VOICE_DELAY } from "../src/timeline";
import { ATLAS_REEL } from "../src/reels/atlas";

const clip = (duration: number) => ({ duration, text: "x", words: [] });

describe("sceneFrames", () => {
  it("uses the minimum length when there is no voice", () => {
    expect(sceneFrames(undefined, 4)).toBe(4 * FPS);
  });

  it("stretches to fit a long voice clip plus the tail", () => {
    expect(sceneFrames(clip(6), 4)).toBe(VOICE_DELAY + Math.ceil(6.6 * FPS));
  });

  it("never goes below the minimum for short clips", () => {
    expect(sceneFrames(clip(1), 4)).toBe(4 * FPS);
  });
});

describe("buildScenes", () => {
  it("creates title, one scene per step, and outro", () => {
    const scenes = buildScenes(ATLAS_REEL, {});
    expect(scenes.map((s) => s.voiceId)).toEqual(["title", "step-1", "step-2", "step-3", "step-4", "step-5", "outro"]);
  });

  it("attaches clips by scene id and sums the total", () => {
    const scenes = buildScenes(ATLAS_REEL, { "step-2": clip(10) });
    expect(scenes[2].clip?.duration).toBe(10);
    expect(scenes[1].clip).toBeUndefined();
    expect(totalFrames(scenes)).toBe(scenes.reduce((sum, s) => sum + s.frames, 0));
  });
});

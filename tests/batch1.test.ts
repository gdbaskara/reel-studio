import { describe, expect, it } from "vitest";
import { FPS } from "../src/timeline";
import { POSTER_SECONDS, posterFrame } from "../app/web/src/poster";
import { voiceEveryScene } from "../app/web/src/createVoices";
import { takeNotice, leaveNotice } from "../app/web/src/notice";

describe("posterFrame", () => {
  it("shows a moment after the entrances, not the empty first frame", () => {
    expect(posterFrame(FPS * 6)).toBe(Math.round(FPS * POSTER_SECONDS));
    expect(posterFrame(FPS * 6)).toBeGreaterThan(0);
  });

  it("stays inside short scenes", () => {
    expect(posterFrame(20)).toBe(19);
    expect(posterFrame(1)).toBe(0);
    expect(posterFrame(0)).toBe(0);
  });
});

describe("voiceEveryScene", () => {
  it("voices each scene in order and reports progress", async () => {
    const done: string[] = [];
    const progress: string[] = [];
    const result = await voiceEveryScene(["title", "step-1"], {
      generate: async (id) => {
        done.push(id);
      },
      onProgress: (i, total) => progress.push(`${i}/${total}`),
      stopped: () => false,
    });
    expect(done).toEqual(["title", "step-1"]);
    expect(progress).toEqual(["1/2", "2/2"]);
    expect(result).toEqual({ failed: [], stopped: false });
  });

  it("keeps going when one scene fails, and names it", async () => {
    const result = await voiceEveryScene(["title", "step-1", "outro"], {
      generate: async (id) => {
        if (id === "step-1") throw new Error("quota");
      },
      onProgress: () => {},
      stopped: () => false,
    });
    expect(result.failed).toEqual([{ sceneId: "step-1", message: "quota" }]);
  });

  it("stops before the next scene when asked", async () => {
    let calls = 0;
    const result = await voiceEveryScene(["title", "step-1", "outro"], {
      generate: async () => {
        calls += 1;
      },
      onProgress: () => {},
      stopped: () => calls >= 1,
    });
    expect(calls).toBe(1);
    expect(result.stopped).toBe(true);
  });
});

describe("notice", () => {
  it("is read once by the next page", () => {
    leaveNotice("Voice for Step 1 failed");
    expect(takeNotice()).toBe("Voice for Step 1 failed");
    expect(takeNotice()).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { BackdropSchema, CreateOptionsSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { toReelProps } from "../app/shared/toReel";
import { audioInUse } from "../app/server/audioFiles";
import { duplicateOf } from "../app/server/duplicate";
import { styleOf } from "../app/web/src/style";
import { MOTIF_COLUMNS, motifTiles } from "../src/motif";

const ID = "p-back-000000";
const image = { src: `/api/projects/${ID}/audio/image-7.png`, width: 1200, height: 1600 };
const options = CreateOptionsSchema.parse({ language: "en", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" });
const project = (backdrop?: Project["options"]["backdrop"]): Project => ({
  id: ID,
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: backdrop ? { ...options, backdrop } : options,
  plan: manualPlan("x", options),
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
});

describe("BackdropSchema", () => {
  it("accepts the look's own, a pattern, the topic motif and an uploaded image", () => {
    for (const b of [{ kind: "look" }, { kind: "pattern", pattern: "dots" }, { kind: "motif" }, { kind: "image", image, dim: 0.7 }]) {
      expect(BackdropSchema.safeParse(b).success).toBe(true);
    }
  });

  it("rejects images from elsewhere, unknown patterns and a dim that hides nothing or everything", () => {
    expect(BackdropSchema.safeParse({ kind: "image", image: { ...image, src: "https://x.com/a.png" }, dim: 0.5 }).success).toBe(false);
    expect(BackdropSchema.safeParse({ kind: "pattern", pattern: "plaid" }).success).toBe(false);
    expect(BackdropSchema.safeParse({ kind: "image", image, dim: 1 }).success).toBe(false);
    expect(BackdropSchema.safeParse({ kind: "image", image, dim: -0.1 }).success).toBe(false);
  });

  it("can be saved by the editor and starts as the look's own", () => {
    const plan = manualPlan("x", options);
    expect(UpdateRequestSchema.safeParse({ plan, captions: true, palette: "green", backdrop: { kind: "motif" } }).success).toBe(true);
    expect(styleOf(options).backdrop).toEqual({ kind: "look" });
  });
});

describe("an uploaded backdrop", () => {
  const withImage = project({ kind: "image", image, dim: 0.6 });

  it("reaches the render with the server address, like step images", () => {
    expect(toReelProps(withImage, "http://localhost:4310").spec.backdrop).toEqual({ kind: "image", image: { ...image, src: `http://localhost:4310${image.src}` }, dim: 0.6 });
    expect(toReelProps(project()).spec.backdrop).toBeUndefined();
  });

  it("is kept by pruning and moves with a duplicate", () => {
    expect(audioInUse(withImage).map((r) => r.src)).toContain(image.src);
    const copy = duplicateOf(withImage, "p-copy-222222", "");
    expect(copy.options.backdrop).toEqual({ kind: "image", image: { ...image, src: "/api/projects/p-copy-222222/audio/image-7.png" }, dim: 0.6 });
  });
});

describe("motifTiles", () => {
  it("covers the canvas and a little more for drifting, the same way every time", () => {
    const tiles = motifTiles(4);
    expect(tiles.length).toBeGreaterThan(MOTIF_COLUMNS * 5);
    expect(tiles).toEqual(motifTiles(4));
    for (const t of tiles) {
      expect(t.x).toBeGreaterThanOrEqual(-100);
      expect(t.x).toBeLessThanOrEqual(1180);
      expect(Math.abs(t.rotate)).toBeLessThanOrEqual(18);
      expect(t.index).toBeGreaterThanOrEqual(0);
      expect(t.index).toBeLessThan(4);
    }
    expect(Math.max(...tiles.map((t) => t.y))).toBeGreaterThan(1920);
  });

  it("uses every drawing it is given", () => {
    expect(new Set(motifTiles(3).map((t) => t.index))).toEqual(new Set([0, 1, 2]));
  });
});

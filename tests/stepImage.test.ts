import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CreateOptionsSchema, StepSchema, type Project } from "../app/shared/project";
import { toReelProps } from "../app/shared/toReel";
import { manualPlan } from "../app/server/planner";
import { audioInUse } from "../app/server/audioFiles";
import { duplicateOf } from "../app/server/duplicate";
import { IMAGE_MAX_SIDE, imageFileName, shrinkImage } from "../app/server/images";

const ID = "p-image-000000";
const image = { src: `/api/projects/${ID}/audio/image-123.png`, width: 800, height: 600 };
const options = CreateOptionsSchema.parse({ language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" });
const plan = manualPlan("x", options);
const project: Project = {
  id: ID,
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options,
  plan: { ...plan, steps: plan.steps.map((s, i) => (i === 0 ? { ...s, image } : s)) },
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
};

describe("step image schema", () => {
  it("accepts an image stored in the project's media folder", () => {
    expect(StepSchema.safeParse({ title: "a", note: "", drawing: "star", image }).success).toBe(true);
  });

  it("rejects images from anywhere else", () => {
    for (const src of ["https://example.com/a.png", "/api/projects/p-x-000000/audio/../../a.png", "/api/projects/p-x-000000/audio/title-1.wav", "data:image/png;base64,AAAA"]) {
      expect(StepSchema.safeParse({ title: "a", note: "", drawing: "star", image: { ...image, src } }).success).toBe(false);
    }
  });
});

describe("step images in a project", () => {
  it("count as files in use, so pruning keeps them", () => {
    expect(audioInUse(project).map((r) => r.src)).toContain(image.src);
  });

  it("move with a duplicated project", () => {
    const copy = duplicateOf(project, "p-copy-111111", "");
    expect(copy.plan.steps[0].image?.src).toBe("/api/projects/p-copy-111111/audio/image-123.png");
    expect(copy.plan.steps[1].image).toBeUndefined();
  });

  it("get the render server's address like audio does", () => {
    const props = toReelProps(project, "http://localhost:4310");
    expect(props.spec.steps[0].image?.src).toBe(`http://localhost:4310${image.src}`);
    expect(toReelProps(project).spec.steps[0].image?.src).toBe(image.src);
  });
});

const hasFfmpeg = (() => {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!hasFfmpeg)("shrinkImage", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "image-test-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("turns a large screenshot into a smaller PNG", async () => {
    const path = join(dir, "shot.jpg");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=blue:s=2400x1600", "-frames:v", "1", path]);
    const out = await shrinkImage(await readFile(path), IMAGE_MAX_SIDE);
    expect(out.width).toBe(IMAGE_MAX_SIDE);
    expect(Math.abs(out.height - (IMAGE_MAX_SIDE * 2) / 3)).toBeLessThanOrEqual(1);
    expect(out.png.subarray(1, 4).toString()).toBe("PNG");
  });

  it("rejects files that are not images", async () => {
    await expect(shrinkImage(Buffer.from("<svg/>"), IMAGE_MAX_SIDE)).rejects.toThrow(/PNG, JPG or WebP/);
  });

  it("names image files so the media route accepts them", () => {
    expect(imageFileName(42)).toBe("image-42.png");
  });
});

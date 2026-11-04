import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { BrandSchema, CreateOptionsSchema, LogoSchema, ProjectSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { toReelProps } from "../app/shared/toReel";
import { manualPlan } from "../app/server/planner";
import { LOGO_MAX_SIDE, imageKind, importLogo, pngSize } from "../app/server/logo";

const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;
const PNG_1PX =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

const project = (extra: Partial<Project> = {}, brand?: Project["options"]["brand"]): Project => ({
  id: "p-brand-000000",
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: CreateOptionsSchema.parse({ ...options, ...(brand ? { brand } : {}) }),
  plan: manualPlan("x", options),
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
  ...extra,
});

describe("brand schemas", () => {
  it("accept a short handle in a top corner", () => {
    expect(BrandSchema.safeParse({ handle: "@tokoku", position: "top-right" }).success).toBe(true);
    expect(BrandSchema.safeParse({ handle: "", position: "top-left" }).success).toBe(true);
    expect(BrandSchema.safeParse({ handle: "x".repeat(31), position: "top-left" }).success).toBe(false);
    expect(BrandSchema.safeParse({ handle: "@a", position: "bottom-right" }).success).toBe(false);
  });

  it("only take a PNG data URL as a logo", () => {
    expect(LogoSchema.safeParse({ src: PNG_1PX, width: 1, height: 1 }).success).toBe(true);
    expect(LogoSchema.safeParse({ src: "https://example.com/a.png", width: 1, height: 1 }).success).toBe(false);
    expect(LogoSchema.safeParse({ src: "data:image/svg+xml;base64,PHN2Zz4=", width: 1, height: 1 }).success).toBe(false);
  });

  it("let the editor save the brand and projects keep a logo", () => {
    const plan = manualPlan("x", options);
    expect(UpdateRequestSchema.safeParse({ plan, captions: true, palette: "green", brand: { handle: "@a", position: "top-center" } }).success).toBe(true);
    expect(ProjectSchema.safeParse(project({ logo: { src: PNG_1PX, width: 1, height: 1 } })).success).toBe(true);
  });
});

describe("toReelProps brand", () => {
  it("leaves the brand out when there is no handle and no logo", () => {
    expect(toReelProps(project()).brand).toBeUndefined();
    expect(toReelProps(project({}, { handle: "  ", position: "top-left" })).brand).toBeUndefined();
  });

  it("passes the handle, corner and logo", () => {
    const props = toReelProps(project({ logo: { src: PNG_1PX, width: 1, height: 1 } }, { handle: "@tokoku", position: "top-right" }));
    expect(props.brand).toEqual({ handle: "@tokoku", position: "top-right", logo: PNG_1PX });
  });

  it("shows a logo on its own in the top left by default", () => {
    const props = toReelProps(project({ logo: { src: PNG_1PX, width: 1, height: 1 } }));
    expect(props.brand).toEqual({ handle: "", position: "top-left", logo: PNG_1PX });
  });
});

describe("image checks", () => {
  it("recognise PNG, JPEG and WebP by their first bytes", () => {
    const png = Buffer.from(PNG_1PX.split(",")[1], "base64");
    expect(imageKind(png)).toBe("png");
    expect(imageKind(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))).toBe("jpeg");
    expect(imageKind(Buffer.from("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ", "latin1"))).toBe("webp");
    expect(imageKind(Buffer.from("<svg></svg>"))).toBeNull();
    expect(pngSize(png)).toEqual({ width: 1, height: 1 });
    expect(pngSize(Buffer.from("nope"))).toBeNull();
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

describe.skipIf(!hasFfmpeg)("importLogo", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "logo-test-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("shrinks a large image into a small PNG data URL", async () => {
    const path = join(dir, "big.jpg");
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-f", "lavfi", "-i", "color=c=red:s=1200x600", "-frames:v", "1", path]);
    const logo = await importLogo(await readFile(path));
    expect(logo.src.startsWith("data:image/png;base64,")).toBe(true);
    expect(logo.width).toBe(LOGO_MAX_SIDE);
    expect(logo.height).toBe(LOGO_MAX_SIDE / 2);
    expect(LogoSchema.safeParse(logo).success).toBe(true);
  });

  it("rejects files that are not images", async () => {
    await expect(importLogo(Buffer.from("<svg></svg>"))).rejects.toThrow(/PNG, JPG or WebP/);
    await expect(importLogo(Buffer.alloc(0))).rejects.toThrow(/empty/);
  });
});

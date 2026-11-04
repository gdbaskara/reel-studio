import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { CreateOptionsSchema, CreateRequestSchema, type Project } from "../app/shared/project";
import { SavedStyleSchema, optionsWithSavedStyle, styleFromProject, withSavedStyle, type SavedStyle } from "../app/shared/savedStyle";
import { manualPlan } from "../app/server/planner";
import { styleStore } from "../app/server/styleStore";

const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;
const LOGO = { src: "data:image/png;base64,AAAA", width: 10, height: 5 };

const project = (extra: Partial<Project["options"]> = {}, logo?: Project["logo"]): Project => ({
  id: "p-style-000000",
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: CreateOptionsSchema.parse({ ...options, ...extra }),
  plan: manualPlan("x", options),
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
  ...(logo ? { logo } : {}),
});

const saved: SavedStyle = {
  id: "s-abc123",
  name: "Brand toko",
  createdAt: "2026-11-04T00:00:00.000Z",
  look: "neon",
  palette: "cyan",
  captions: false,
  progressBar: false,
  brand: { handle: "@toko", position: "top-right" },
  logo: LOGO,
};

describe("styleFromProject", () => {
  it("keeps the look, palette, switches, brand and logo of a project", () => {
    const style = styleFromProject(
      project({ look: "neon", palette: "cyan", captions: false, progressBar: false, brand: saved.brand }, LOGO),
      "s-abc123",
      "  Brand toko ",
      saved.createdAt,
    );
    expect(style).toEqual(saved);
    expect(SavedStyleSchema.safeParse(style).success).toBe(true);
  });

  it("saves older projects as Notebook with the palette that is shown", () => {
    const style = styleFromProject(project({ palette: "nope" }), "s-old111", "Lama", saved.createdAt);
    expect(style).toMatchObject({ look: "notebook", palette: "green", progressBar: true });
    expect(style.brand).toBeUndefined();
    expect(style.logo).toBeUndefined();
  });
});

describe("applying a saved style", () => {
  it("sets the style on a project, including its logo, and keeps the content", () => {
    const before = project({ music: { volume: 0.5, duck: false } });
    const after = withSavedStyle(before, saved);
    expect(after.options).toMatchObject({ look: "neon", palette: "cyan", captions: false, progressBar: false, brand: saved.brand, music: { volume: 0.5, duck: false } });
    expect(after.logo).toEqual(LOGO);
    expect(after.plan).toBe(before.plan);
  });

  it("clears a brand and logo the style does not have", () => {
    const { brand: _b, logo: _l, ...plain } = saved;
    const after = withSavedStyle(project({ brand: saved.brand }, LOGO), plain);
    expect(after.options.brand).toBeUndefined();
    expect(after.logo).toBeUndefined();
  });

  it("fills create options", () => {
    expect(optionsWithSavedStyle(CreateOptionsSchema.parse(options), saved)).toMatchObject({ look: "neon", palette: "cyan", captions: false, brand: saved.brand });
  });

  it("accepts a style id or AI look choice in a create request", () => {
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options, styleId: "s-abc123" }).success).toBe(true);
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options, autoLook: true }).success).toBe(true);
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options, styleId: "../x" }).success).toBe(false);
  });
});

describe("styleStore", () => {
  let dir = "";
  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "styles-test-"));
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it("starts empty, adds, lists newest first, finds and removes styles", async () => {
    const store = styleStore(join(dir, "nested", "styles.json"));
    expect(await store.list()).toEqual([]);
    await store.add(saved);
    await store.add({ ...saved, id: "s-def456", name: "Kedua", createdAt: "2026-11-05T00:00:00.000Z" });
    expect((await store.list()).map((s) => s.id)).toEqual(["s-def456", "s-abc123"]);
    expect(await store.get("s-abc123")).toEqual(saved);
    await store.remove("s-abc123");
    expect((await store.list()).map((s) => s.id)).toEqual(["s-def456"]);
    await expect(store.get("s-abc123")).rejects.toThrow(/not found/i);
  });

  it("keeps every style when several are added at once", async () => {
    const store = styleStore(join(dir, "parallel.json"));
    await Promise.all(Array.from({ length: 5 }, (_, i) => store.add({ ...saved, id: `s-par00${i}` })));
    expect(await store.list()).toHaveLength(5);
  });
});

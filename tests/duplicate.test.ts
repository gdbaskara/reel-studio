import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { CreateOptionsSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { duplicateOf, duplicateProject } from "../app/server/duplicate";
import { audioDir, projectDir } from "../app/server/paths";
import { saveProject } from "../app/server/store";

const options = CreateOptionsSchema.parse({ language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" });
const clip = (file: string) => ({ duration: 1, text: "a", words: [], src: `/api/projects/p-old-000000/audio/${file}`, source: "upload" as const });

const original: Project = {
  id: "p-old-000000",
  name: "Cara pakai Atlas",
  prompt: "atlas",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-02T00:00:00.000Z",
  options,
  plan: manualPlan("Cara pakai Atlas", options),
  voice: { title: clip("title-1.wav"), "step-1": clip("step-1-2.wav") },
  music: { src: "/api/projects/p-old-000000/audio/music-3.m4a", duration: 30, name: "Carefree" },
  render: { status: "done", progress: 1, updatedAt: "2026-01-02T00:00:00.000Z" },
};

describe("duplicateOf", () => {
  const copy = duplicateOf(original, "p-new-111111", "2026-11-04T00:00:00.000Z");

  it("gets its own id, name, dates and a fresh render state", () => {
    expect(copy).toMatchObject({ id: "p-new-111111", name: "Cara pakai Atlas (salinan)", createdAt: "2026-11-04T00:00:00.000Z" });
    expect(copy.render).toEqual({ status: "idle", progress: 0, updatedAt: "2026-11-04T00:00:00.000Z" });
  });

  it("points voice clips and music at the copy's own audio folder", () => {
    expect(copy.voice.title?.src).toBe("/api/projects/p-new-111111/audio/title-1.wav");
    expect(copy.voice["step-1"]?.src).toBe("/api/projects/p-new-111111/audio/step-1-2.wav");
    expect(copy.music?.src).toBe("/api/projects/p-new-111111/audio/music-3.m4a");
    expect(copy.plan).toEqual({ ...original.plan, name: copy.name });
    expect(copy.options).toEqual(original.options);
  });

  it("names English reels with copy and keeps names within the limit", () => {
    const en = duplicateOf({ ...original, name: "x".repeat(80), options: { ...options, language: "en" } }, "p-new-222222", "");
    expect(en.name.endsWith(" (copy)")).toBe(true);
    expect(en.name.length).toBeLessThanOrEqual(80);
    expect(en.plan.name).toBe(en.name);
  });
});

describe("duplicateProject", () => {
  const made: string[] = [original.id];
  afterAll(() => Promise.all(made.map((id) => rm(projectDir(id), { recursive: true, force: true }))));

  it("copies the audio the project uses and leaves stray files behind", async () => {
    await saveProject(original);
    const dir = audioDir(original.id);
    await mkdir(dir, { recursive: true });
    for (const file of ["title-1.wav", "step-1-2.wav", "music-3.m4a", "step-1-9.wav.trim.wav"]) await writeFile(join(dir, file), file);
    const copy = await duplicateProject(original.id);
    made.push(copy.id);
    expect((await readdir(audioDir(copy.id))).sort()).toEqual(["music-3.m4a", "step-1-2.wav", "title-1.wav"]);
    expect(copy.voice.title?.src).toBe(`/api/projects/${copy.id}/audio/title-1.wav`);
  });

  it("removes a half-made copy when a file is missing", async () => {
    await rm(join(audioDir(original.id), "music-3.m4a"));
    const before = await readdir(join(projectDir(original.id), ".."));
    await expect(duplicateProject(original.id)).rejects.toThrow(/ENOENT/);
    expect((await readdir(join(projectDir(original.id), ".."))).sort()).toEqual(before.sort());
  });
});

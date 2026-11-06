import { describe, expect, it } from "vitest";
import { CreateOptionsSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { projectSummary } from "../app/shared/summary";
import { sampleProject } from "../app/web/src/sample";

const options = CreateOptionsSchema.parse({ language: "id", stepCount: 3, planMode: "ai", voiceMode: "mixed", captions: true, palette: "magenta", look: "neon" });

describe("sampleProject", () => {
  it("shows the topic as the title, in the chosen look", () => {
    const sample = sampleProject(options, "Cara main mahjong untuk pemula dan teman");
    expect(sample.plan.title.main).toBe("Cara main mahjong");
    expect(sample.options.look).toBe("neon");
    expect(sample.options.palette).toBe("magenta");
    expect(sample.plan.steps).toHaveLength(3);
  });

  it("has a placeholder title before anything is typed", () => {
    expect(sampleProject(options, "  ").plan.title.main).toBe("Topik kamu");
    expect(sampleProject({ ...options, language: "en" }, "").plan.title.main).toBe("Your topic");
  });
});

describe("projectSummary", () => {
  const project: Project = {
    id: "p-sum-000000",
    name: "Mahjong",
    prompt: "x",
    createdAt: "",
    updatedAt: "2026-11-06T10:00:00.000Z",
    options,
    plan: manualPlan("x", options),
    voice: { title: { source: "upload", text: "a", duration: 2, words: [{ text: "a", start: 0, end: 1 }], src: "/api/projects/p-sum-000000/audio/title-1.wav" } },
    render: { status: "done", progress: 1, updatedAt: "" },
  };

  it("carries what a reel card shows, without voices or music", () => {
    const summary = projectSummary(project);
    expect(summary).toMatchObject({ id: "p-sum-000000", name: "Mahjong", updatedAt: project.updatedAt, steps: 3, rendered: true });
    expect(summary.preview.spec.look).toBe("neon");
    expect(summary.preview.voice).toEqual({});
    expect(summary.preview.music).toBeUndefined();
  });

  it("says when a reel has not been rendered", () => {
    expect(projectSummary({ ...project, render: { status: "idle", progress: 0, updatedAt: "" } }).rendered).toBe(false);
  });
});

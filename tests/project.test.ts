import { describe, expect, it } from "vitest";
import { CreateRequestSchema, PlanSchema, SCENE_ID } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { checkProjectId, checkSceneId } from "../app/server/paths";

const options = { language: "id", stepCount: 3, planMode: "manual", voiceMode: "upload", captions: true, palette: "green" } as const;

describe("schemas", () => {
  it("accepts a valid create request", () => {
    expect(CreateRequestSchema.safeParse({ prompt: "Cara pakai Atlas", options }).success).toBe(true);
  });

  it("rejects too many steps and unknown voice modes", () => {
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...options, stepCount: 12 } }).success).toBe(false);
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...options, voiceMode: "robot" } }).success).toBe(false);
  });

  it("only allows known scene ids", () => {
    expect(SCENE_ID.test("step-3")).toBe(true);
    expect(SCENE_ID.test("../etc")).toBe(false);
  });
});

describe("id checks", () => {
  it("blocks path traversal in ids", () => {
    expect(() => checkProjectId("../../secret")).toThrow();
    expect(() => checkSceneId("title/../x")).toThrow();
    expect(checkProjectId("p-abc123-ff00aa")).toBe("p-abc123-ff00aa");
  });
});

describe("manualPlan", () => {
  it("produces a valid plan with the requested number of steps", () => {
    const plan = manualPlan("Atlas onboarding", options);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.steps).toHaveLength(3);
    expect(plan.narration["step-2"]).toBe("Dua.");
  });
});

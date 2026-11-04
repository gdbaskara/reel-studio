import { describe, expect, it } from "vitest";
import { CreateOptionsSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { toReelProps } from "../app/shared/toReel";
import { manualPlan } from "../app/server/planner";
import { LOOKS } from "../src/looks";

const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;

const project = (extra: Partial<Project["options"]>): Project => ({
  id: "p-style-000000",
  name: "x",
  prompt: "x",
  createdAt: "",
  updatedAt: "",
  options: CreateOptionsSchema.parse({ ...options, ...extra }),
  plan: manualPlan("x", { ...options }),
  voice: {},
  render: { status: "idle", progress: 0, updatedAt: "" },
});

describe("style options", () => {
  it("accept a look, any palette name and a progress bar switch", () => {
    const parsed = CreateOptionsSchema.parse({ ...options, look: "bold-pop", palette: "pop", progressBar: false });
    expect(parsed).toMatchObject({ look: "bold-pop", palette: "pop", progressBar: false });
  });

  it("reject unknown looks and odd palette names", () => {
    expect(CreateOptionsSchema.safeParse({ ...options, look: "vaporwave" }).success).toBe(false);
    expect(CreateOptionsSchema.safeParse({ ...options, palette: "../x" }).success).toBe(false);
  });

  it("still read projects saved before looks existed", () => {
    const parsed = CreateOptionsSchema.parse(options);
    expect(parsed.look).toBeUndefined();
    expect(parsed.progressBar).toBeUndefined();
  });

  it("let the editor save the look and progress bar", () => {
    const plan = manualPlan("x", options);
    expect(UpdateRequestSchema.safeParse({ plan, captions: true, palette: "pop", look: "bold-pop", progressBar: false }).success).toBe(true);
  });
});

describe("toReelProps", () => {
  it("renders older projects with Notebook and their saved palette", () => {
    const props = toReelProps(project({ palette: "warm" }));
    expect(props.spec.look).toBe("notebook");
    expect(props.spec.palette.accent).toBe("#E8553D");
    expect(props.progressBar).toBe(true);
  });

  it("passes the look, its palette and the progress bar switch", () => {
    const pop = LOOKS["bold-pop"].palettes[0];
    const props = toReelProps(project({ look: "bold-pop", palette: pop.name, progressBar: false }));
    expect(props.spec.look).toBe("bold-pop");
    expect(props.spec.palette).toEqual(pop.colors);
    expect(props.progressBar).toBe(false);
  });
});

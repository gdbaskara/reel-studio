import { describe, expect, it } from "vitest";
import { LOOKS } from "../src/looks";
import { LOOK_IDS } from "../src/looks/types";
import { ENTER_FRAMES, TRANSITIONS, enterProgress, enterStyle, transitionOf } from "../src/transitions";
import { CreateOptionsSchema, StepSchema, UpdateRequestSchema, type Project } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { toReelProps } from "../app/shared/toReel";

describe("transitions", () => {
  it("every look has one, and Notebook keeps the plain fade", () => {
    for (const id of LOOK_IDS) expect(TRANSITIONS).toContain(LOOKS[id].transition);
    expect(LOOKS.notebook.transition).toBe("fade");
  });

  it("a choice made in the editor wins over the look's", () => {
    expect(transitionOf("neon", undefined)).toBe(LOOKS.neon.transition);
    expect(transitionOf("neon", "wipe")).toBe("wipe");
    expect(transitionOf(undefined, undefined)).toBe("fade");
  });

  it("fade adds nothing on entry, so cuts look as before", () => {
    for (const t of [0, 0.5, 1]) expect(enterStyle("fade", t)).toEqual({});
  });

  it("slide, wipe and iris start hidden and end with nothing applied", () => {
    expect(enterStyle("slide", 0).transform).toBe("translateX(1080px)");
    expect(enterStyle("wipe", 0).clipPath).toBe("inset(0 100% 0 0)");
    expect(enterStyle("iris", 0).clipPath).toBe("circle(0% at 50% 40%)");
    for (const kind of TRANSITIONS) expect(enterStyle(kind, 1)).toEqual({});
  });

  it("only scenes after the first enter, over a short stretch", () => {
    expect(enterProgress(0, false)).toBe(1);
    expect(enterProgress(0, true)).toBe(0);
    expect(enterProgress(ENTER_FRAMES, true)).toBe(1);
    expect(enterProgress(ENTER_FRAMES * 3, true)).toBe(1);
  });
});

describe("transition and layout options", () => {
  const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;

  it("steps take an optional layout", () => {
    const step = { title: "a", note: "", drawing: "star" };
    expect(StepSchema.safeParse(step).success).toBe(true);
    expect(StepSchema.safeParse({ ...step, layout: "left" }).success).toBe(true);
    expect(StepSchema.safeParse({ ...step, layout: "big-number" }).success).toBe(true);
    expect(StepSchema.safeParse({ ...step, layout: "diagonal" }).success).toBe(false);
  });

  it("projects take an optional transition and pass it to the reel", () => {
    expect(CreateOptionsSchema.safeParse({ ...options, transition: "iris" }).success).toBe(true);
    expect(CreateOptionsSchema.safeParse({ ...options, transition: "spin" }).success).toBe(false);
    const plan = manualPlan("x", options);
    expect(UpdateRequestSchema.safeParse({ plan, captions: true, palette: "green", transition: "slide" }).success).toBe(true);
    const project: Project = {
      id: "p-trans-000000",
      name: "x",
      prompt: "x",
      createdAt: "",
      updatedAt: "",
      options: CreateOptionsSchema.parse({ ...options, transition: "wipe" }),
      plan,
      voice: {},
      render: { status: "idle", progress: 0, updatedAt: "" },
    };
    expect(toReelProps(project).spec.transition).toBe("wipe");
    expect(toReelProps({ ...project, options: CreateOptionsSchema.parse(options) }).spec.transition).toBeUndefined();
  });
});

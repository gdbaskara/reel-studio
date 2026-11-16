import { describe, expect, it } from "vitest";
import { blankScenes } from "../app/shared/blanks";
import { manualPlan } from "../app/server/planner";

const options = { language: "id", stepCount: 2, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;

describe("blankScenes", () => {
  it("lists every scene of a fresh manual plan", () => {
    expect(blankScenes(manualPlan("Pandu", options))).toEqual(["Title", "Step 1", "Step 2", "Outro"]);
  });

  it("is empty once each scene has its main on-screen line", () => {
    const plan = manualPlan("Pandu", options);
    const filled = {
      ...plan,
      title: { lead: "", main: "Pandu" },
      steps: plan.steps.map((s, i) => ({ ...s, title: `Langkah ${i + 1}` })),
      outro: { main: "Selamat mencoba", sub: "" },
    };
    expect(blankScenes(filled)).toEqual([]);
  });

  it("treats whitespace as blank and ignores the optional lines", () => {
    const plan = manualPlan("Pandu", options);
    const partly = { ...plan, title: { lead: "Cara pakai", main: "  " }, steps: plan.steps.map((s) => ({ ...s, title: "Ok" })), outro: { main: "Bye", sub: "" } };
    expect(blankScenes(partly)).toEqual(["Title"]);
  });
});

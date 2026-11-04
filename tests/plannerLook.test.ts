import { describe, expect, it } from "vitest";
import { LOOK_IDS } from "../src/looks/types";
import { parsePlannerReply, plannerPrompt } from "../app/server/planner";

const options = { language: "id", stepCount: 2, planMode: "ai", voiceMode: "mixed", captions: true, palette: "green" } as const;
const plan = {
  name: "Hemat listrik",
  title: { lead: "Cara", main: "Hemat" },
  steps: [
    { title: "Cabut charger", note: "Kalau tidak dipakai", drawing: "check" },
    { title: "Pakai LED", note: "Lebih irit", drawing: "star" },
  ],
  outro: { main: "Coba", sub: "Mulai hari ini" },
  narration: { title: "Hai", "step-1": "Satu.", "step-2": "Dua.", outro: "Yuk" },
};

describe("planner look choice", () => {
  it("asks for a look only when the AI should pick one", () => {
    const withLook = plannerPrompt("hemat listrik", options, true);
    for (const id of LOOK_IDS) expect(withLook).toContain(`"${id}"`);
    expect(plannerPrompt("hemat listrik", options, false)).not.toContain('"look"');
  });

  it("reads the plan and a known look from the reply", () => {
    const reply = `Here you go: ${JSON.stringify({ ...plan, look: "neon" })}`;
    expect(parsePlannerReply(reply)).toEqual({ plan, look: "neon" });
  });

  it("ignores a missing or unknown look", () => {
    expect(parsePlannerReply(JSON.stringify(plan)).look).toBeUndefined();
    expect(parsePlannerReply(JSON.stringify({ ...plan, look: "vaporwave" })).look).toBeUndefined();
  });

  it("still fails on an invalid plan", () => {
    expect(() => parsePlannerReply("no json here")).toThrow(/no JSON/);
    expect(() => parsePlannerReply(JSON.stringify({ ...plan, steps: [] }))).toThrow(/invalid plan/);
  });
});

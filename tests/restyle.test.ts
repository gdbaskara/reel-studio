import { describe, expect, it } from "vitest";
import { LOOK_IDS } from "../src/looks/types";
import { manualPlan } from "../app/server/planner";
import { ProposalSchema, RestyleRequestSchema } from "../app/shared/restyle";
import { parseRestyleReply, restylePrompt } from "../app/server/restyle";
import { QUICK_STYLES, applyProposal } from "../app/web/src/restyle";
import type { Style } from "../app/web/src/style";

const options = { language: "id", stepCount: 3, planMode: "manual", voiceMode: "mixed", captions: true, palette: "green" } as const;
const plan = manualPlan("x", options);
const style: Style = {
  look: "notebook",
  palette: "warm",
  captions: true,
  progressBar: true,
  brand: { handle: "@a", position: "top-left" },
  transition: null,
  tune: { textScale: 1, speed: "normal" },
  music: { volume: 0.3, duck: true },
};

describe("applyProposal", () => {
  it("changes only what the proposal names", () => {
    const next = applyProposal(style, plan, { transition: "iris" });
    expect(next.style).toEqual({ ...style, transition: "iris" });
    expect(next.plan).toBe(plan);
  });

  it("switches look with a palette of that look, else its first", () => {
    expect(applyProposal(style, plan, { look: "neon", palette: "magenta" }).style).toMatchObject({ look: "neon", palette: "magenta" });
    expect(applyProposal(style, plan, { look: "neon", palette: "warm" }).style).toMatchObject({ look: "neon", palette: "cyan" });
    expect(applyProposal(style, plan, { look: "neon" }).style.palette).toBe("cyan");
    expect(applyProposal(style, plan, { palette: "blue" }).style.palette).toBe("blue");
    expect(applyProposal(style, plan, { palette: "cyan" }).style.palette).toBe("warm");
  });

  it("sets layouts on the title, every step and the outro, keeping the text", () => {
    const next = applyProposal(style, plan, { layouts: { title: "label", steps: "left", outro: "card" } });
    expect(next.plan.title.layout).toBe("label");
    expect(next.plan.steps.every((s) => s.layout === "left")).toBe(true);
    expect(next.plan.outro.layout).toBe("card");
    expect(next.plan.narration).toEqual(plan.narration);
  });

  it("never touches brand, captions, progress bar or music", () => {
    const next = applyProposal(style, plan, { look: "bold-pop", tune: { textScale: 1.1, speed: "fast" } });
    expect(next.style).toMatchObject({ brand: style.brand, captions: true, progressBar: true, music: style.music });
  });
});

describe("quick styles", () => {
  it("each gives a valid proposal that changes something", () => {
    for (const quick of QUICK_STYLES) {
      const proposal = quick.propose(style);
      expect(ProposalSchema.safeParse(proposal).success).toBe(true);
      const next = applyProposal(style, plan, proposal);
      expect(next.style !== style || next.plan !== plan).toBe(true);
    }
  });

  it("calmer slows things down and bolder speeds them up", () => {
    const calm = QUICK_STYLES.find((q) => q.id === "calmer")?.propose(style);
    const bold = QUICK_STYLES.find((q) => q.id === "bolder")?.propose(style);
    expect(calm?.tune?.speed).toBe("calm");
    expect(bold?.tune?.speed).toBe("fast");
  });
});

describe("AI restyle", () => {
  it("asks within the looks, palettes and layouts that exist", () => {
    const prompt = restylePrompt("bikin lebih elegan", { look: "notebook", palette: "green" });
    for (const id of LOOK_IDS) expect(prompt).toContain(`"${id}"`);
    expect(prompt).toContain("big-number");
    expect(prompt).toContain("bikin lebih elegan");
  });

  it("keeps the valid parts of a reply and drops the rest", () => {
    const reply = `Sure: {"look":"koran","palette":"sepia","transition":"wipe","tune":{"textScale":1.05,"speed":"calm"},"layouts":{"title":"left","steps":"spiral"},"summary":"Elegan ala koran"}`;
    const proposal = parseRestyleReply(reply);
    expect(proposal).toMatchObject({ look: "koran", palette: "sepia", transition: "wipe", tune: { textScale: 1.05, speed: "calm" }, summary: "Elegan ala koran" });
    expect(proposal.layouts).toEqual({ title: "left" });
  });

  it("drops a palette from another look and a text size out of range", () => {
    const proposal = parseRestyleReply(JSON.stringify({ look: "neon", palette: "sepia", tune: { textScale: 3, speed: "fast" } }));
    expect(proposal.palette).toBeUndefined();
    expect(proposal.tune).toBeUndefined();
    expect(proposal.look).toBe("neon");
  });

  it("fails when nothing usable comes back", () => {
    expect(() => parseRestyleReply("no idea")).toThrow(/no JSON/);
    expect(() => parseRestyleReply(JSON.stringify({ look: "vaporwave" }))).toThrow(/nothing/);
  });

  it("validates the request text", () => {
    expect(RestyleRequestSchema.safeParse({ request: "lebih elegan" }).success).toBe(true);
    expect(RestyleRequestSchema.safeParse({ request: "x" }).success).toBe(false);
    expect(RestyleRequestSchema.safeParse({ request: "x".repeat(301) }).success).toBe(false);
  });
});

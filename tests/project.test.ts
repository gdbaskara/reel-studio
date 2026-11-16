import { describe, expect, it } from "vitest";
import { ClipSchema, CreateOptionsSchema, CreateRequestSchema, GENERATORS, MusicSchema, OMNIVOICE_VOICE, PlanSchema, SCENE_ID, UpdateRequestSchema, musicSettings } from "../app/shared/project";
import { manualPlan } from "../app/server/planner";
import { checkProjectId, checkSceneId } from "../app/server/paths";

const options = { language: "id", stepCount: 3, planMode: "manual", voiceMode: "upload", captions: true, palette: "green" } as const;

describe("schemas", () => {
  it("accepts a valid create request", () => {
    expect(CreateRequestSchema.safeParse({ prompt: "Cara pakai Pandu", options }).success).toBe(true);
  });

  it("rejects too many steps and unknown voice modes", () => {
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...options, stepCount: 12 } }).success).toBe(false);
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...options, voiceMode: "robot" } }).success).toBe(false);
  });

  it("no longer offers Voicebox as a generator", () => {
    expect(GENERATORS).toEqual(["eleven", "omnivoice"]);
  });

  it("accepts OmniVoice with an optional voice and rejects odd voice ids", () => {
    const omni = { ...options, voiceMode: "omnivoice", omnivoiceVoice: "wanita" };
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: omni }).success).toBe(true);
    expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...options, voiceMode: "omnivoice" } }).success).toBe(true);
    for (const bad of ["../x", "Wanita", "a b", "", "x".repeat(41)]) {
      expect(CreateRequestSchema.safeParse({ prompt: "abc", options: { ...omni, omnivoiceVoice: bad } }).success).toBe(false);
    }
    expect(OMNIVOICE_VOICE.test("my-voice-2")).toBe(true);
    expect(ClipSchema.safeParse({ duration: 1, text: "a", words: [], src: "x", source: "omnivoice" }).success).toBe(true);
  });

  it("opens older projects that used the removed Mac or Voicebox voices", () => {
    for (const old of ["mac", "voicebox"]) {
      const parsed = CreateOptionsSchema.parse({ ...options, voiceMode: old, voiceboxProfile: "abc-123" });
      expect(parsed.voiceMode).toBe("mixed");
      expect("voiceboxProfile" in parsed).toBe(false);
      expect(ClipSchema.safeParse({ duration: 1, text: "a", words: [], src: "x", source: old }).success).toBe(true);
    }
  });

  it("validates background music and its settings", () => {
    expect(MusicSchema.safeParse({ src: "/a/music-1.m4a", duration: 12, name: "Song" }).success).toBe(true);
    expect(MusicSchema.safeParse({ src: "/a/music-1.m4a", duration: 0, name: "Song" }).success).toBe(false);
    const plan = manualPlan("x", options);
    const update = { plan, captions: true, palette: "green" };
    expect(UpdateRequestSchema.safeParse({ ...update, music: { volume: 0.4, duck: false } }).success).toBe(true);
    expect(UpdateRequestSchema.safeParse({ ...update, music: { volume: 1.5, duck: true } }).success).toBe(false);
    expect(UpdateRequestSchema.safeParse(update).success).toBe(true);
  });

  it("falls back to default music settings for older projects", () => {
    expect(musicSettings(CreateOptionsSchema.parse(options))).toEqual({ volume: 0.3, duck: true });
    expect(musicSettings({ ...CreateOptionsSchema.parse(options), music: { volume: 0.8, duck: false } })).toEqual({ volume: 0.8, duck: false });
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
    const plan = manualPlan("Pandu onboarding", options);
    expect(PlanSchema.safeParse(plan).success).toBe(true);
    expect(plan.steps).toHaveLength(3);
  });

  it("starts every scene blank instead of with placeholder text", () => {
    const plan = manualPlan("Pandu onboarding", options);
    expect(plan.title).toEqual({ lead: "", main: "" });
    expect(plan.outro).toEqual({ main: "", sub: "" });
    expect(plan.steps.map((s) => [s.title, s.note])).toEqual([["", ""], ["", ""], ["", ""]]);
    expect(Object.values(plan.narration)).toEqual(["", "", "", "", ""]);
    expect(plan.name).toBe("Pandu onboarding");
  });
});

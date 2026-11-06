import { describe, expect, it } from "vitest";
import { editTarget, inputIdFor } from "../app/web/src/editTarget";
import { sceneAtFrame, timelineSegments } from "../app/web/src/timelineSegments";

const ids = ["title", "step-1", "step-2", "outro"];

describe("editTarget", () => {
  it("turns a clicked element into the scene and the field to focus", () => {
    expect(editTarget("step-2:note", ids)).toEqual({ sceneIndex: 2, inputId: "edit-step-note" });
    expect(editTarget("title:main", ids)).toEqual({ sceneIndex: 0, inputId: "edit-title-main" });
    expect(editTarget("outro:sub", ids)).toEqual({ sceneIndex: 3, inputId: "edit-outro-sub" });
  });

  it("ignores scenes and fields that do not exist", () => {
    expect(editTarget("step-9:title", ids)).toBeNull();
    expect(editTarget("title:color", ids)).toBeNull();
    expect(editTarget("nonsense", ids)).toBeNull();
    expect(editTarget(undefined, ids)).toBeNull();
  });

  it("gives the inspector the same ids", () => {
    expect(inputIdFor("step", "title")).toBe("edit-step-title");
  });
});

describe("timelineSegments", () => {
  const segments = timelineSegments([
    { id: "title", frames: 60 },
    { id: "step-1", frames: 120 },
    { id: "outro", frames: 120 },
  ]);

  it("places scenes one after another with their share of the reel", () => {
    expect(segments.map((s) => [s.start, s.share])).toEqual([
      [0, 0.2],
      [60, 0.4],
      [180, 0.4],
    ]);
    expect(segments[1].seconds).toBe(4);
  });

  it("finds the scene playing at a frame", () => {
    expect(sceneAtFrame(segments, 0)).toBe(0);
    expect(sceneAtFrame(segments, 59)).toBe(0);
    expect(sceneAtFrame(segments, 60)).toBe(1);
    expect(sceneAtFrame(segments, 299)).toBe(2);
    expect(sceneAtFrame(segments, 999)).toBe(2);
  });
});

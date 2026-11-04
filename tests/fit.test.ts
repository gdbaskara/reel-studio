import { describe, expect, it } from "vitest";
import { fitScale, TEXT_WIDTH } from "../src/looks/fit";

describe("fitScale", () => {
  it("keeps text that already fits at full size", () => {
    expect(fitScale(800, TEXT_WIDTH)).toBe(1);
    expect(fitScale(TEXT_WIDTH, TEXT_WIDTH)).toBe(1);
  });

  it("shrinks so the widest word fits the text width", () => {
    expect(fitScale(1296, 920)).toBeCloseTo(920 / 1296);
  });

  it("ignores measurements that are missing", () => {
    expect(fitScale(0, 920)).toBe(1);
    expect(fitScale(1200, 0)).toBe(1);
  });
});

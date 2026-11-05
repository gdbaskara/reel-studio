import { describe, expect, it } from "vitest";
import { THEMES, nextTheme, readTheme } from "../app/web/src/theme";

describe("theme", () => {
  it("cycles system, light, dark and back", () => {
    expect(THEMES).toEqual(["system", "light", "dark"]);
    expect(nextTheme("system")).toBe("light");
    expect(nextTheme("light")).toBe("dark");
    expect(nextTheme("dark")).toBe("system");
  });

  it("reads a saved choice and falls back to system", () => {
    expect(readTheme("dark")).toBe("dark");
    expect(readTheme("light")).toBe("light");
    expect(readTheme(null)).toBe("system");
    expect(readTheme("purple")).toBe("system");
  });
});

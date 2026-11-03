import { describe, expect, it } from "vitest";
import { DEFAULT_PORT, resolvePort } from "../app/server/port";

describe("resolvePort", () => {
  it("uses PORT from the environment or .env.local, else the default", () => {
    expect(resolvePort({ PORT: "4312" })).toBe(4312);
    expect(resolvePort({ PORT: " 4312 " })).toBe(4312);
    expect(resolvePort({})).toBe(DEFAULT_PORT);
    expect(resolvePort({ PORT: "" })).toBe(DEFAULT_PORT);
  });

  it("rejects a PORT that is not a usable port number", () => {
    for (const bad of ["abc", "0", "65536", "43.5", "-1", "4310x"]) {
      expect(() => resolvePort({ PORT: bad }), bad).toThrow(/PORT/);
    }
  });
});

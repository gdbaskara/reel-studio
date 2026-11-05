import { describe, expect, it } from "vitest";
import { allowedHosts, isAllowedHost, isAllowedOrigin, resolvePublicHost } from "../app/server/hosts";

describe("resolvePublicHost", () => {
  it("is off unless PUBLIC_HOST is set", () => {
    expect(resolvePublicHost({})).toBeNull();
    expect(resolvePublicHost({ PUBLIC_HOST: "  " })).toBeNull();
  });

  it("takes a bare host name, lower-cased", () => {
    expect(resolvePublicHost({ PUBLIC_HOST: "Reel.GDBaskara.dev" })).toBe("reel.gdbaskara.dev");
  });

  it("rejects anything that is not a plain host name", () => {
    for (const bad of ["https://reel.gdbaskara.dev", "reel.gdbaskara.dev/x", "reel gdbaskara", "*.gdbaskara.dev", "localhost:4310"]) {
      expect(() => resolvePublicHost({ PUBLIC_HOST: bad }), bad).toThrow(/PUBLIC_HOST/);
    }
  });
});

describe("allowed hosts", () => {
  const local = allowedHosts(4310, null);
  const shared = allowedHosts(4310, "reel.gdbaskara.dev");

  it("answer localhost only by default", () => {
    expect(isAllowedHost(local, "localhost:4310")).toBe(true);
    expect(isAllowedHost(local, "127.0.0.1:4310")).toBe(true);
    expect(isAllowedHost(local, "reel.gdbaskara.dev")).toBe(false);
    expect(isAllowedHost(local, undefined)).toBe(false);
  });

  it("also answer the public host when it is set", () => {
    expect(isAllowedHost(shared, "reel.gdbaskara.dev")).toBe(true);
    expect(isAllowedHost(shared, "evil.example.com")).toBe(false);
  });

  it("accept changes only from the app's own pages", () => {
    expect(isAllowedOrigin(shared, undefined)).toBe(true);
    expect(isAllowedOrigin(shared, "https://reel.gdbaskara.dev")).toBe(true);
    expect(isAllowedOrigin(shared, "http://localhost:4310")).toBe(true);
    expect(isAllowedOrigin(shared, "https://evil.example.com")).toBe(false);
    expect(isAllowedOrigin(local, "https://reel.gdbaskara.dev")).toBe(false);
    expect(isAllowedOrigin(shared, "null")).toBe(false);
  });
});

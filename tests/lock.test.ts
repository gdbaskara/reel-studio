import { describe, expect, it } from "vitest";
import { withProjectLock } from "../app/server/lock";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("withProjectLock", () => {
  it("runs work for the same project one at a time, in order", async () => {
    const log: string[] = [];
    const slow = withProjectLock("p1", async () => {
      log.push("a-start");
      await delay(20);
      log.push("a-end");
    });
    const fast = withProjectLock("p1", async () => {
      log.push("b");
    });
    await Promise.all([slow, fast]);
    expect(log).toEqual(["a-start", "a-end", "b"]);
  });

  it("keeps going after a failed task", async () => {
    await expect(withProjectLock("p2", async () => Promise.reject(new Error("boom")))).rejects.toThrow("boom");
    await expect(withProjectLock("p2", async () => "ok")).resolves.toBe("ok");
  });
});

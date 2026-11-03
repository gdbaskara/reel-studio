import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Reads KEY=value lines from .env.local; real environment variables win.
export const loadEnv = (root) => {
  const path = join(root, ".env.local");
  const fileEnv = existsSync(path)
    ? Object.fromEntries(
        readFileSync(path, "utf8")
          .split("\n")
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#") && line.includes("="))
          .map((line) => {
            const at = line.indexOf("=");
            return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, "")];
          }),
      )
    : {};
  return { ...fileEnv, ...process.env };
};

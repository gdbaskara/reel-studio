import { loadEnv } from "../../scripts/env.mjs";
import { ROOT } from "./paths";

export const DEFAULT_PORT = 4310;

// PORT comes from the environment or .env.local; a typo fails at startup instead of binding somewhere odd.
export const resolvePort = (env: { readonly PORT?: string }): number => {
  const raw = env.PORT?.trim();
  if (!raw) return DEFAULT_PORT;
  const port = Number(raw);
  if (!/^\d+$/.test(raw) || port < 1 || port > 65535) throw new Error(`PORT must be a number from 1 to 65535, got "${raw}".`);
  return port;
};

// Read on call, not on import, so modules and tests that never start a server never read PORT.
export const serverPort = (): number => resolvePort(loadEnv(ROOT));

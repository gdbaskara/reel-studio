import express, { type NextFunction, type Request, type Response } from "express";
import { join } from "node:path";
import { createServer as createVite } from "vite";
import { apiRouter } from "./routes";
import { HttpError, ROOT } from "./paths";
import { serverPort } from "./port";
import { allowedHosts, isAllowedHost, isAllowedOrigin, resolvePublicHost } from "./hosts";
import { loadEnv } from "../../scripts/env.mjs";

const PORT = serverPort();
const PUBLIC_HOST = resolvePublicHost(loadEnv(ROOT));
const ALLOWED = allowedHosts(PORT, PUBLIC_HOST);
const app = express();
const READS = new Set(["GET", "HEAD", "OPTIONS"]);

// Only answer requests addressed to this machine or the configured public host, and take changes
// only from the app's own pages.
app.use((req, res, next) => {
  if (!isAllowedHost(ALLOWED, req.headers.host)) {
    res.status(403).json({ error: "Forbidden host" });
    return;
  }
  if (!READS.has(req.method) && !isAllowedOrigin(ALLOWED, req.headers.origin)) {
    res.status(403).json({ error: "Forbidden origin" });
    return;
  }
  next();
});
app.use("/api", apiRouter());

// The web app is served by Vite in middleware mode, so one command and one port run everything.
const vite = await createVite({
  root: join(ROOT, "app", "web"),
  configFile: false,
  appType: "spa",
  // The Host check above already runs first; Vite gets the same list so it serves the public host too.
  server: { middlewareMode: true, fs: { allow: [ROOT] }, allowedHosts: PUBLIC_HOST ? [PUBLIC_HOST] : [] },
});
app.use(vite.middlewares);

app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Body-parser rejects oversized or malformed bodies with a client status; pass that on instead of a 500.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const tooBig = req.path.endsWith("/logo")
      ? "That image is too big. Use one under 8 MB."
      : req.path.endsWith("/image")
        ? "That image is too big. Use one under 15 MB."
        : "That file is too big. Try an MP3 or M4A, or a shorter file.";
    const message = status === 413 ? tooBig : "The request could not be read.";
    res.status(status).json({ error: message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Unexpected error" });
});

// Express 5 hands listen errors (such as a busy port) to this callback.
app.listen(PORT, "127.0.0.1", (err?: Error) => {
  if (err) {
    const busy = (err as NodeJS.ErrnoException).code === "EADDRINUSE";
    console.error(busy ? `Port ${PORT} is already in use. Stop the other server or set PORT in .env.local.` : err);
    process.exit(1);
  }
  console.log(`Reel Studio running at http://localhost:${PORT}${PUBLIC_HOST ? ` and https://${PUBLIC_HOST}` : ""}`);
});

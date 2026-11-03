import express, { type NextFunction, type Request, type Response } from "express";
import { join } from "node:path";
import { createServer as createVite } from "vite";
import { apiRouter } from "./routes";
import { HttpError, ROOT } from "./paths";
import { serverPort } from "./port";

const PORT = serverPort();
const app = express();
const ALLOWED_HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

// Only answer requests addressed to this machine (blocks DNS-rebinding pages from driving the API).
app.use((req, res, next) => {
  if (ALLOWED_HOSTS.has(req.headers.host ?? "")) return next();
  res.status(403).json({ error: "Forbidden host" });
});
app.use("/api", apiRouter());

// The web app is served by Vite in middleware mode, so one command and one port run everything.
const vite = await createVite({
  root: join(ROOT, "app", "web"),
  configFile: false,
  appType: "spa",
  server: { middlewareMode: true, fs: { allow: [ROOT] } },
});
app.use(vite.middlewares);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Body-parser rejects oversized or malformed bodies with a client status; pass that on instead of a 500.
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    const message = status === 413 ? "That file is too big. Try an MP3 or M4A, or a shorter file." : "The request could not be read.";
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
  console.log(`Reel Studio running at http://localhost:${PORT}`);
});

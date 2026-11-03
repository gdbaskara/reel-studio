import express, { type NextFunction, type Request, type Response } from "express";
import { join } from "node:path";
import { createServer as createVite } from "vite";
import { apiRouter } from "./routes";
import { HttpError, PORT, ROOT } from "./paths";

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
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : "Unexpected error" });
});

app.listen(PORT, "127.0.0.1", () => console.log(`Reel Studio running at http://localhost:${PORT}`));

import { spawn } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { toReelProps } from "../shared/toReel";
import { getProject, setRenderActivityCheck, writeRender } from "./store";
import { HttpError, ROOT, projectDir } from "./paths";
import { serverPort } from "./port";

// One render at a time keeps the machine responsive.
let busy: string | null = null;

export const isRendering = (id: string) => busy === id;
setRenderActivityCheck(isRendering);

// State writes are queued so a late progress update can never land after "done".
let writes: Promise<unknown> = Promise.resolve();
const record = (id: string, state: Parameters<typeof writeRender>[1]) => {
  writes = writes
    .then(() => writeRender(id, state))
    .catch((e) => console.error(`[render ${id}] could not save state`, e));
  return writes;
};

export const videoPath = (id: string) => join(projectDir(id), "video.mp4");

export const startRender = async (id: string): Promise<void> => {
  if (busy) throw new HttpError(409, busy === id ? "Already rendering this project." : "Another video is rendering. Try again soon.");
  busy = id; // claimed before any await so two quick clicks can't start two renders
  let propsPath: string;
  let missing: string[];
  try {
    const project = await getProject(id);
    missing = Object.keys(project.plan.narration).filter((sceneId) => !project.voice[sceneId]);
    propsPath = join(projectDir(id), "props.json");
    // Chrome inside the renderer fetches the audio from this server, so URLs must be absolute.
    await writeFile(propsPath, JSON.stringify(toReelProps(project, `http://localhost:${serverPort()}`)));
    await record(id, { status: "rendering", progress: 0 });
  } catch (e) {
    busy = null;
    throw e;
  }

  const child = spawn(
    "npx",
    ["remotion", "render", "src/index.ts", "Custom", videoPath(id), `--props=${propsPath}`, "--log=info"],
    { cwd: ROOT },
  );
  let lastWrite = 0;
  let tail = "";
  const onOutput = (chunk: Buffer) => {
    const text = chunk.toString();
    tail = (tail + text).slice(-2000);
    const match = [...text.matchAll(/Rendered (\d+)\/(\d+)/g)].pop();
    if (match && Date.now() - lastWrite > 700) {
      lastWrite = Date.now();
      void record(id, { status: "rendering", progress: Number(match[1]) / Number(match[2]) });
    }
  };
  child.stdout.on("data", onOutput);
  child.stderr.on("data", onOutput);
  child.on("error", (e) => {
    busy = null;
    void record(id, { status: "error", progress: 0, error: `Could not start the renderer: ${e.message}` });
  });
  child.on("close", (code) => {
    if (busy !== id) return;
    busy = null;
    const error = code === 0 ? undefined : `Render failed (exit ${code}). ${tail.split("\n").slice(-4).join(" ")}`;
    if (error) console.error(`[render ${id}]`, tail);
    void record(id, code === 0 ? { status: "done", progress: 1 } : { status: "error", progress: 0, error });
  });
  if (missing.length) console.warn(`[render ${id}] scenes without voice: ${missing.join(", ")}`);
};

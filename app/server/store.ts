import { randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ProjectSchema, RenderStateSchema, type Project } from "../shared/project";
import { DATA_DIR, HttpError, audioDir, projectDir } from "./paths";
import { writeJson } from "./jsonFile";

type RenderState = Project["render"];
type StoredProject = Omit<Project, "render">;

const IDLE: RenderState = { status: "idle", progress: 0, updatedAt: new Date(0).toISOString() };

export const newProjectId = () => `p-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;

// Render progress lives in its own file so editor saves never overwrite it.
// isActive tells whether a render process is really running, so a "rendering" state left
// behind by a server restart shows as interrupted instead of spinning forever.
let isActive: (id: string) => boolean = () => false;
export const setRenderActivityCheck = (check: (id: string) => boolean) => {
  isActive = check;
};

export const readRender = async (id: string): Promise<RenderState> => {
  const path = join(projectDir(id), "render.json");
  const state = existsSync(path) ? RenderStateSchema.parse(JSON.parse(await readFile(path, "utf8"))) : IDLE;
  return state.status === "rendering" && !isActive(id)
    ? { ...state, status: "error", progress: 0, error: "The render was interrupted. Start it again." }
    : state;
};

export const writeRender = (id: string, state: Omit<RenderState, "updatedAt">) =>
  writeJson(join(projectDir(id), "render.json"), { ...state, updatedAt: new Date().toISOString() });

export const getProject = async (id: string): Promise<Project> => {
  const path = join(projectDir(id), "project.json");
  if (!existsSync(path)) throw new HttpError(404, "Project not found");
  const stored = JSON.parse(await readFile(path, "utf8"));
  return ProjectSchema.parse({ ...stored, render: await readRender(id) });
};

export const saveProject = async (project: Project): Promise<Project> => {
  const { render: _render, ...stored } = { ...project, updatedAt: new Date().toISOString() };
  const valid: StoredProject = ProjectSchema.omit({ render: true }).parse(stored);
  await mkdir(audioDir(project.id), { recursive: true });
  await writeJson(join(projectDir(project.id), "project.json"), valid);
  return getProject(project.id);
};

export const listProjects = async (): Promise<readonly Pick<Project, "id" | "name" | "updatedAt">[]> => {
  if (!existsSync(DATA_DIR)) return [];
  const ids = (await readdir(DATA_DIR)).filter((name) => existsSync(join(DATA_DIR, name, "project.json")));
  const projects = await Promise.all(ids.map((id) => getProject(id).catch(() => null)));
  return projects
    .filter((p): p is Project => p !== null)
    .map(({ id, name, updatedAt }) => ({ id, name, updatedAt }))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
};

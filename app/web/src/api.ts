import type { CreateRequest, Generator, Project, UpdateRequest } from "../../shared/project";
import type { SavedStyle } from "../../shared/savedStyle";

export type ProjectSummary = Pick<Project, "id" | "name" | "updatedAt">;
export type Status = {
  readonly planner: "anthropic-api" | "claude-cli";
  readonly elevenlabs: boolean;
  readonly omnivoice: boolean;
  readonly whisper: boolean;
};
// default marks the voice a scene gets when none is picked (OMNIVOICE_VOICE, else Wanita).
export type OmnivoiceVoice = { readonly id: string; readonly name: string; readonly builtin: boolean; readonly default: boolean };
export type VoiceChoice = { readonly omnivoiceVoice?: string };

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`/api${path}`, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
};

const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

export const api = {
  status: () => request<Status>("/status"),
  list: () => request<ProjectSummary[]>("/projects"),
  get: (id: string) => request<Project>(`/projects/${id}`),
  create: (body: CreateRequest) => request<Project>("/projects", json("POST", body)),
  update: (id: string, body: UpdateRequest) => request<Project>(`/projects/${id}`, json("PUT", body)),
  omnivoiceVoices: () => request<OmnivoiceVoice[]>("/omnivoice/voices"),
  generateVoice: (id: string, sceneId: string, provider: Generator, choice: VoiceChoice = {}) =>
    request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, json("POST", { provider, ...choice })),
  uploadVoice: (id: string, sceneId: string, file: File) =>
    request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  uploadMusic: (id: string, file: File) =>
    request<Project>(`/projects/${id}/music`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
      body: file,
    }),
  removeMusic: (id: string) => request<Project>(`/projects/${id}/music`, { method: "DELETE" }),
  removeVoice: (id: string, sceneId: string) => request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, { method: "DELETE" }),
  uploadLogo: (id: string, file: File) =>
    request<Project>(`/projects/${id}/logo`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  uploadStepImage: (id: string, sceneId: string, file: File) =>
    request<Project>(`/projects/${id}/scenes/${sceneId}/image`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  removeLogo: (id: string) => request<Project>(`/projects/${id}/logo`, { method: "DELETE" }),
  duplicate: (id: string) => request<Project>(`/projects/${id}/duplicate`, { method: "POST" }),
  styles: () => request<SavedStyle[]>("/styles"),
  saveStyle: (id: string, name: string) => request<SavedStyle>(`/projects/${id}/styles`, json("POST", { name })),
  deleteStyle: (styleId: string) => request<SavedStyle[]>(`/styles/${styleId}`, { method: "DELETE" }),
  applyStyle: (id: string, styleId: string) => request<Project>(`/projects/${id}/style`, json("POST", { styleId })),
  render: (id: string) => request<Project>(`/projects/${id}/render`, { method: "POST" }),
  resetRender: (id: string) => request<Project>(`/projects/${id}/render/reset`, { method: "POST" }),
  videoUrl: (id: string, stamp: string) => `/api/projects/${id}/video?v=${encodeURIComponent(stamp)}`,
};

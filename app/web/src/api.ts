import type { CreateRequest, Generator, Project, UpdateRequest } from "../../shared/project";

export type ProjectSummary = Pick<Project, "id" | "name" | "updatedAt">;
export type Status = {
  readonly planner: "anthropic-api" | "claude-cli";
  readonly elevenlabs: boolean;
  readonly voicebox: boolean;
  readonly whisper: boolean;
};
export type VoiceboxProfile = { readonly id: string; readonly name: string; readonly language: string };

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
  voiceboxProfiles: () => request<VoiceboxProfile[]>("/voicebox/profiles"),
  generateVoice: (id: string, sceneId: string, provider: Generator, voiceboxProfile?: string) =>
    request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, json("POST", { provider, voiceboxProfile })),
  uploadVoice: (id: string, sceneId: string, file: File) =>
    request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, {
      method: "PUT",
      headers: { "Content-Type": file.type || "application/octet-stream" },
      body: file,
    }),
  removeVoice: (id: string, sceneId: string) => request<Project>(`/projects/${id}/scenes/${sceneId}/voice`, { method: "DELETE" }),
  render: (id: string) => request<Project>(`/projects/${id}/render`, { method: "POST" }),
  resetRender: (id: string) => request<Project>(`/projects/${id}/render/reset`, { method: "POST" }),
  videoUrl: (id: string, stamp: string) => `/api/projects/${id}/video?v=${encodeURIComponent(stamp)}`,
};

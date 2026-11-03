import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { DRAWINGS, PlanSchema, type CreateOptions, type Plan } from "../shared/project";
import { loadEnv } from "../../scripts/env.mjs";
import { ROOT } from "./paths";

const run = promisify(execFile);
const LANG_NAME = { id: "Bahasa Indonesia (casual, friendly, use 'kamu')", en: "English (casual, friendly)" } as const;
const NUMBER_WORDS = {
  id: ["Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh"],
  en: ["One", "Two", "Three", "Four", "Five", "Six", "Seven"],
} as const;

const plannerPrompt = (prompt: string, options: CreateOptions) => `You write short vertical explainer reels.
Topic from the user: """${prompt}"""

Write a plan in ${LANG_NAME[options.language]} with exactly ${options.stepCount} steps.
Return ONLY a JSON object, no prose, no code fences, matching:
{
  "name": "short project name",
  "title": { "lead": "2-4 words", "main": "1-3 words, the punchline" },
  "steps": [ { "title": "2-4 words", "note": "max 8 words, an example or detail", "drawing": one of ${JSON.stringify(DRAWINGS)} } ],
  "outro": { "main": "1-3 words", "sub": "1-4 words" },
  "narration": {
    "title": "one sentence spoken over the title",
    "step-1": "starts with '${NUMBER_WORDS[options.language][0]}.' then 1-2 short sentences",
    "...": "one entry per step: step-1 .. step-${options.stepCount}",
    "outro": "one short closing sentence"
  }
}
Keep every narration line under 25 words. Do not invent facts you are unsure about; stay generic instead.`;

const extractJson = (raw: string): unknown => {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Planner returned no JSON");
  return JSON.parse(raw.slice(start, end + 1));
};

const viaAnthropicApi = async (apiKey: string, model: string, prompt: string): Promise<string> => {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model, max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(`Anthropic API returned ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const body = (await res.json()) as { content: { type: string; text?: string }[] };
  return body.content.map((block) => block.text ?? "").join("");
};

// Uses the local Claude Code login, outside the project, with no tools or MCP servers: it only writes text.
const viaClaudeCli = async (prompt: string): Promise<string> => {
  const { stdout } = await run("claude", ["-p", prompt, "--output-format", "json", "--tools", "", "--strict-mcp-config"], {
    cwd: tmpdir(),
    timeout: 180_000,
    maxBuffer: 4 * 1024 * 1024,
  });
  const envelope = JSON.parse(stdout) as { result?: string; is_error?: boolean };
  if (envelope.is_error || !envelope.result) throw new Error("Claude CLI did not return a result");
  return envelope.result;
};

export const planWithAi = async (prompt: string, options: CreateOptions): Promise<Plan> => {
  const env = loadEnv(ROOT);
  const text = plannerPrompt(prompt, options);
  const raw = env.ANTHROPIC_API_KEY
    ? await viaAnthropicApi(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || "claude-sonnet-5-5", text)
    : await viaClaudeCli(text);
  const parsed = PlanSchema.safeParse(extractJson(raw));
  if (!parsed.success) throw new Error(`Planner returned an invalid plan: ${parsed.error.issues[0]?.message}`);
  return parsed.data;
};

// Blank plan for "write it myself": placeholders the user overwrites in the editor.
export const manualPlan = (prompt: string, options: CreateOptions): Plan => {
  const id = options.language === "id";
  const steps = Array.from({ length: options.stepCount }, (_, i) => ({
    title: id ? `Langkah ${i + 1}` : `Step ${i + 1}`,
    note: id ? "Tulis detailnya di sini" : "Write the detail here",
    drawing: DRAWINGS[i % DRAWINGS.length],
  }));
  const narration = Object.fromEntries([
    ["title", ""],
    ...steps.map((_, i) => [`step-${i + 1}`, `${NUMBER_WORDS[options.language][i]}.`]),
    ["outro", ""],
  ]);
  return {
    name: prompt.slice(0, 60),
    title: { lead: id ? "Cara pakai" : "How to use", main: prompt.split(" ").slice(0, 3).join(" ") },
    steps,
    outro: { main: id ? "Selamat mencoba" : "Give it a try", sub: "" },
    narration,
  };
};

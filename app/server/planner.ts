import { execFile } from "node:child_process";
import { tmpdir } from "node:os";
import { promisify } from "node:util";
import { z } from "zod";
import { DRAWINGS, PlanSchema, type CreateOptions, type Plan } from "../shared/project";
import { loadEnv } from "../../scripts/env.mjs";
import { ROOT } from "./paths";
import { LOOKS } from "../../src/looks";
import { LOOK_IDS, type LookId } from "../../src/looks/types";

const run = promisify(execFile);
const LANG_NAME = { id: "Bahasa Indonesia (casual, friendly, use 'kamu')", en: "English (casual, friendly)" } as const;
const NUMBER_WORDS = {
  id: ["Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh"],
  en: ["One", "Two", "Three", "Four", "Five", "Six", "Seven"],
} as const;

const LookIdSchema = z.enum(LOOK_IDS);

const lookMenu = () => LOOK_IDS.map((id) => `- "${id}": ${LOOKS[id].description}`).join("\n");

// Asked only when the user lets the AI pick the look.
const lookRequest = (pick: boolean) =>
  pick
    ? `,
  "look": the visual style that best fits the topic and audience, one of:
${lookMenu()}`
    : "";

export const plannerPrompt = (prompt: string, options: CreateOptions, pickLook = false) => `You write short vertical explainer reels.
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
  }${lookRequest(pickLook)}
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

export type PlannerReply = { readonly plan: Plan; readonly look?: LookId };

// Reads the plan from the reply. A look the planner made up is ignored rather than failing the plan.
export const parsePlannerReply = (raw: string): PlannerReply => {
  const json = extractJson(raw);
  const parsed = PlanSchema.safeParse(json);
  if (!parsed.success) throw new Error(`Planner returned an invalid plan: ${parsed.error.issues[0]?.message}`);
  const look = LookIdSchema.safeParse((json as { look?: unknown }).look);
  return look.success ? { plan: parsed.data, look: look.data } : { plan: parsed.data };
};

export const planWithAi = async (prompt: string, options: CreateOptions, pickLook = false): Promise<PlannerReply> => {
  const env = loadEnv(ROOT);
  const text = plannerPrompt(prompt, options, pickLook);
  const raw = env.ANTHROPIC_API_KEY
    ? await viaAnthropicApi(env.ANTHROPIC_API_KEY, env.ANTHROPIC_MODEL || "claude-sonnet-5-5", text)
    : await viaClaudeCli(text);
  return parsePlannerReply(raw);
};

// Blank plan for "write it myself": every scene starts empty and the editor shows hints instead.
export const manualPlan = (prompt: string, options: CreateOptions): Plan => {
  const steps = Array.from({ length: options.stepCount }, (_, i) => ({ title: "", note: "", drawing: DRAWINGS[i % DRAWINGS.length] }));
  const sceneIds = ["title", ...steps.map((_, i) => `step-${i + 1}`), "outro"];
  return {
    name: prompt.slice(0, 60),
    title: { lead: "", main: "" },
    steps,
    outro: { main: "", sub: "" },
    narration: Object.fromEntries(sceneIds.map((id) => [id, ""])),
  };
};

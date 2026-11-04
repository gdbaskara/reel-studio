import { LOOKS } from "../../src/looks";
import { LOOK_IDS, type LookId } from "../../src/looks/types";
import { TRANSITIONS } from "../../src/transitions";
import { SPEEDS, TEXT_SCALE_RANGE } from "../../src/looks/tune";
import { OUTRO_LAYOUTS, STEP_LAYOUTS, TITLE_LAYOUTS } from "../shared/project";
import { ProposalSchema, type Proposal } from "../shared/restyle";
import { askClaude, extractJson } from "./planner";

const lookMenu = () =>
  LOOK_IDS.map((id) => `- "${id}": ${LOOKS[id].description}. Palettes: ${LOOKS[id].palettes.map((p) => `"${p.name}"`).join(", ")}`).join("\n");

export const restylePrompt = (request: string, current: { readonly look: LookId; readonly palette: string }) => `You restyle short vertical explainer reels.
The reel now uses look "${current.look}" with palette "${current.palette}".
The user wants: """${request}"""

Choose only from these options. Leave out anything that should stay as it is.
Looks:
${lookMenu()}
Transitions: ${JSON.stringify(TRANSITIONS)}
Speed: ${JSON.stringify(SPEEDS)}; textScale between ${TEXT_SCALE_RANGE.min} and ${TEXT_SCALE_RANGE.max} (1 is normal)
Layouts: title ${JSON.stringify(TITLE_LAYOUTS)}, steps ${JSON.stringify(STEP_LAYOUTS)}, outro ${JSON.stringify(OUTRO_LAYOUTS)}

Return ONLY a JSON object, no prose, no code fences:
{ "look": "...", "palette": "a palette of that look", "transition": "...", "tune": { "textScale": 1, "speed": "..." },
  "layouts": { "title": "...", "steps": "...", "outro": "..." }, "summary": "one short sentence in the user's language" }`;

type Raw = Record<string, unknown>;
const field = <T>(value: unknown, parse: (v: unknown) => { success: boolean; data?: T }) => {
  const result = parse(value);
  return result.success ? result.data : undefined;
};

// Keeps each part of the reply that is valid on its own, so one made-up value does not throw the rest away.
// A palette must belong to the proposed (or current) look; the editor checks that again when applying.
export const parseRestyleReply = (raw: string): Proposal => {
  const json = extractJson(raw) as Raw;
  const shape = ProposalSchema.shape;
  const look = field(json.look, (v) => shape.look.safeParse(v));
  const palette = field(json.palette, (v) => shape.palette.safeParse(v));
  const layoutsRaw = (json.layouts ?? {}) as Raw;
  const layoutShape = ProposalSchema.shape.layouts.unwrap().shape;
  const layouts = Object.fromEntries(
    (["title", "steps", "outro"] as const).flatMap((k) => {
      const value = field(layoutsRaw[k], (v) => layoutShape[k].safeParse(v));
      return value ? [[k, value]] : [];
    }),
  );
  const proposal: Proposal = {
    ...(look ? { look } : {}),
    ...(palette && (!look || LOOKS[look].palettes.some((p) => p.name === palette)) ? { palette } : {}),
    ...optional("transition", field(json.transition, (v) => shape.transition.safeParse(v))),
    ...optional("tune", field(json.tune, (v) => shape.tune.safeParse(v))),
    ...(Object.keys(layouts).length ? { layouts } : {}),
    ...optional("summary", field(json.summary, (v) => shape.summary.safeParse(v))),
  };
  const { summary: _summary, ...changes } = proposal;
  if (!Object.keys(changes).length) throw new Error("The AI suggested nothing that this editor can apply. Try describing it differently.");
  return proposal;
};

const optional = <K extends string, V>(key: K, value: V | undefined) => (value === undefined ? {} : ({ [key]: value } as Record<K, V>));

export const suggestRestyle = async (request: string, current: { readonly look: LookId; readonly palette: string }): Promise<Proposal> =>
  parseRestyleReply(await askClaude(restylePrompt(request, current)));

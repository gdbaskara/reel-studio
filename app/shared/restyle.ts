import { z } from "zod";
import { LOOK_IDS } from "../../src/looks/types";
import { TRANSITIONS } from "../../src/transitions";
import { OUTRO_LAYOUTS, PALETTE_NAME, STEP_LAYOUTS, TITLE_LAYOUTS, TuneSchema } from "./project";

// A suggested change to how a reel looks, from a quick style chip or the AI. Everything is optional:
// only what it names changes. Text, voices, brand, captions and music are never part of it.
export const ProposalSchema = z.object({
  look: z.enum(LOOK_IDS).optional(),
  palette: z.string().regex(PALETTE_NAME).optional(),
  transition: z.enum(TRANSITIONS).optional(),
  tune: TuneSchema.optional(),
  layouts: z
    .object({
      title: z.enum(TITLE_LAYOUTS).optional(),
      steps: z.enum(STEP_LAYOUTS).optional(),
      outro: z.enum(OUTRO_LAYOUTS).optional(),
    })
    .optional(),
  // One line telling the user what the change is going for.
  summary: z.string().trim().max(200).optional(),
});

export const RestyleRequestSchema = z.object({ request: z.string().trim().min(3).max(300) });

export type Proposal = z.infer<typeof ProposalSchema>;

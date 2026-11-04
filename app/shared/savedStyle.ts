import { z } from "zod";
import { lookChoice } from "../../src/looks";
import { LOOK_IDS } from "../../src/looks/types";
import { BrandSchema, LogoSchema, PALETTE_NAME, STYLE_ID, type CreateOptions, type Project } from "./project";

// A look the user saved to reuse on other reels: the look and palette, the caption and progress bar
// switches, and the brand mark with its logo. Content, voices and music are never part of it.
export const SavedStyleSchema = z.object({
  id: z.string().regex(STYLE_ID),
  name: z.string().trim().min(1).max(40),
  createdAt: z.string(),
  look: z.enum(LOOK_IDS),
  palette: z.string().regex(PALETTE_NAME),
  captions: z.boolean(),
  progressBar: z.boolean(),
  brand: BrandSchema.optional(),
  logo: LogoSchema.optional(),
});

export const SaveStyleRequestSchema = z.object({ name: z.string().trim().min(1).max(40) });
export const ApplyStyleRequestSchema = z.object({ styleId: z.string().regex(STYLE_ID) });

export type SavedStyle = z.infer<typeof SavedStyleSchema>;

export const styleFromProject = (project: Project, id: string, name: string, createdAt: string): SavedStyle => {
  const { id: look, paletteName } = lookChoice(project.options.look, project.options.palette);
  const { brand } = project.options;
  return SavedStyleSchema.parse({
    id,
    name: name.trim(),
    createdAt,
    look,
    palette: paletteName,
    captions: project.options.captions,
    progressBar: project.options.progressBar ?? true,
    ...(brand ? { brand } : {}),
    ...(project.logo ? { logo: project.logo } : {}),
  });
};

// The style replaces every look setting, so a brand or logo the style lacks is removed too.
export const optionsWithSavedStyle = (options: CreateOptions, style: SavedStyle): CreateOptions => {
  const { brand: _brand, ...rest } = options;
  return {
    ...rest,
    look: style.look,
    palette: style.palette,
    captions: style.captions,
    progressBar: style.progressBar,
    ...(style.brand ? { brand: style.brand } : {}),
  };
};

export const withSavedStyle = (project: Project, style: SavedStyle): Project => {
  const { logo: _logo, ...rest } = project;
  return { ...rest, options: optionsWithSavedStyle(project.options, style), ...(style.logo ? { logo: style.logo } : {}) };
};

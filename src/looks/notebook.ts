import type { Look } from "./types";

// The original Reel Studio look: handwriting, marker scribbles, sticky notes and line boil.
// Its numbers match the pre-look components exactly, so old reels render pixel for pixel the same.
export const NOTEBOOK: Look = {
  id: "notebook",
  name: "Notebook",
  description: "Handwritten, marker doodles, sticky notes",
  palettes: [
    { name: "green", label: "Green", colors: { paper: "#F4F7F1", ink: "#0B3B2E", accent: "#0A8A5F", highlight: "#D4EC5A", onAccent: "#F4F7F1" } },
    { name: "warm", label: "Warm", colors: { paper: "#F6F1E7", ink: "#1F1F1F", accent: "#E8553D", highlight: "#FFD84D", onAccent: "#F6F1E7" } },
    { name: "blue", label: "Blue", colors: { paper: "#F2F5FA", ink: "#14213D", accent: "#2F6FEB", highlight: "#9FD8FF", onAccent: "#F2F5FA" } },
  ],
  fonts: { display: { key: "caveat", weight: 400 }, caption: { key: "poppins", weight: 800 } },
  type: {
    titleLead: 150,
    titleMain: 210,
    stepTitle: 140,
    note: 70,
    outroMain: 140,
    outroSub: 130,
    badge: 150,
    lineHeight: 1.05,
    letterSpacing: 0,
    uppercase: false,
  },
  motion: {
    word: { damping: 12, stiffness: 160 },
    stagger: 4,
    rise: 50,
    scaleFrom: 0.6,
    badge: { damping: 9, stiffness: 180 },
    badgeSpin: -40,
    note: { damping: 14 },
    noteFrom: "right",
    noteTilt: -2.5,
    wobble: 1.2,
    fadeOut: 8,
    outroFadeOut: 12,
    delays: { titleLead: 4, titleMain: 18, titleMark: 34, stepTitle: 8, stepNote: 45, stepDoodle: 70, outroMain: 2, outroMark: 6, outroSub: 12 },
  },
  background: "flat",
  decoration: "scribble",
  badge: "circle",
  note: "sticky",
  captions: "pill",
  emphasis: "color",
};

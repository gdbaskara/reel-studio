import type { Look } from "./types";

// Quiet and premium: tight sans type, lots of air, near-monochrome with one muted accent.
// Springs are critically damped so nothing overshoots, spins or boils.
export const MINIMAL: Look = {
  id: "minimal",
  name: "Minimal",
  description: "Clean sans, calm motion, muted tones",
  palettes: [
    { name: "ivory", label: "Ivory", colors: { paper: "#F7F6F3", ink: "#1A1A1A", accent: "#3A5BA0", highlight: "#E6E3DC", onAccent: "#FFFFFF" } },
    { name: "sage", label: "Sage", colors: { paper: "#F2F3EF", ink: "#1D2420", accent: "#4A6B57", highlight: "#DCE3DA", onAccent: "#FFFFFF" } },
    { name: "graphite", label: "Graphite", colors: { paper: "#141416", ink: "#EDEDEF", accent: "#A9B6F5", highlight: "#2A2B33", onAccent: "#141416" } },
  ],
  fonts: { display: { key: "inter", weight: 600 }, caption: { key: "inter", weight: 700 } },
  type: {
    titleLead: 84,
    titleMain: 170,
    stepTitle: 96,
    note: 54,
    outroMain: 120,
    outroSub: 76,
    badge: 120,
    lineHeight: 1.12,
    letterSpacing: -0.025,
    uppercase: false,
  },
  motion: {
    word: { damping: 200, stiffness: 110 },
    stagger: 3,
    rise: 24,
    scaleFrom: 1,
    badge: { damping: 200, stiffness: 120 },
    badgeSpin: 0,
    note: { damping: 200 },
    noteFrom: "fade",
    noteTilt: 0,
    wobble: 0,
    fadeOut: 10,
    outroFadeOut: 18,
    delays: { titleLead: 6, titleMain: 20, titleMark: 38, stepTitle: 10, stepNote: 46, stepDoodle: 70, outroMain: 4, outroMark: 12, outroSub: 20 },
  },
  background: "flat",
  decoration: "clean",
  badge: "numeral",
  note: "plain",
  captions: "minimal",
  emphasis: "underline",
};

import type { Look } from "./types";

// Loud creator style: condensed all-caps headlines, saturated color, marker highlights and fast, bouncy pops.
// Anton is narrow, so headlines can run large; titleMain stays small enough for a ten-letter word to fit 920px.
export const BOLD_POP: Look = {
  id: "bold-pop",
  name: "Bold Pop",
  description: "Loud all-caps, hot colors, snappy pops",
  palettes: [
    { name: "punch", label: "Punch", colors: { paper: "#FFFFFF", ink: "#0A0A0A", accent: "#E6005C", highlight: "#FFE600", onAccent: "#FFFFFF" } },
    { name: "lemon", label: "Lemon", colors: { paper: "#FFE600", ink: "#0A0A0A", accent: "#5B00E0", highlight: "#FF4FA8", onAccent: "#FFFFFF" } },
    { name: "blast", label: "Blast", colors: { paper: "#1F2BFF", ink: "#FFFFFF", accent: "#FFE600", highlight: "#E6005C", onAccent: "#0A0A0A" } },
  ],
  fonts: { display: { key: "anton", weight: 400 }, caption: { key: "montserrat", weight: 800 } },
  type: {
    titleLead: 120,
    titleMain: 200,
    stepTitle: 130,
    note: 62,
    outroMain: 150,
    outroSub: 120,
    badge: 130,
    lineHeight: 0.98,
    letterSpacing: 0.01,
    uppercase: true,
  },
  motion: {
    word: { damping: 8, stiffness: 260 },
    stagger: 3,
    rise: 80,
    scaleFrom: 0.3,
    badge: { damping: 7, stiffness: 260 },
    badgeSpin: -15,
    note: { damping: 10, stiffness: 200 },
    noteFrom: "bottom",
    noteTilt: -2,
    wobble: 0,
    fadeOut: 6,
    outroFadeOut: 10,
    delays: { titleLead: 2, titleMain: 12, titleMark: 24, stepTitle: 6, stepNote: 34, stepDoodle: 54, outroMain: 2, outroMark: 8, outroSub: 14 },
  },
  background: "dots",
  decoration: "clean",
  markOpacity: 1,
  badge: "square",
  note: "pill",
  captions: "outline",
  emphasis: "marker",
};

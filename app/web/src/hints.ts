import type { CreateOptions } from "../../shared/project";

// Grey example text for empty scene fields, in the reel's language. Never rendered into the video.
const HINTS = {
  id: {
    titleLead: "Contoh: Cara pakai",
    titleMain: "Contoh: Atlas",
    stepTitle: "Contoh: Login dengan akun kantor",
    stepNote: "Opsional: detail singkat di catatan tempel",
    outroMain: "Contoh: Selamat mencoba",
    outroSub: "Opsional",
    narration: "Tulis kalimat yang diucapkan di scene ini",
  },
  en: {
    titleLead: "e.g. How to use",
    titleMain: "e.g. Atlas",
    stepTitle: "e.g. Sign in with your work account",
    stepNote: "Optional: a short detail on the sticky note",
    outroMain: "e.g. Give it a try",
    outroSub: "Optional",
    narration: "Write what is said in this scene",
  },
} as const;

export type Hints = (typeof HINTS)[CreateOptions["language"]];

export const hintsFor = (language: CreateOptions["language"]): Hints => HINTS[language];

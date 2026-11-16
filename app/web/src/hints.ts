import type { CreateOptions } from "../../shared/project";

// Grey example text for empty scene fields, in the reel's language. Never rendered into the video.
const HINTS = {
  id: {
    titleLead: "Contoh: Cara pakai",
    titleMain: "Contoh: Pandu",
    stepTitle: "Contoh: Login dengan akun kantor",
    stepNote: "Opsional: detail singkat di catatan tempel",
    outroMain: "Contoh: Selamat mencoba",
    outroSub: "Opsional",
    narration: "Tulis kalimat yang diucapkan di scene ini",
    emphasis: "Tip: di teks layar, tulis *kata* untuk menonjolkannya",
  },
  en: {
    titleLead: "e.g. How to use",
    titleMain: "e.g. Pandu",
    stepTitle: "e.g. Sign in with your work account",
    stepNote: "Optional: a short detail on the sticky note",
    outroMain: "e.g. Give it a try",
    outroSub: "Optional",
    narration: "Write what is said in this scene",
    emphasis: "Tip: in on-screen text, wrap a *word* in asterisks to make it stand out",
  },
} as const;

export type Hints = (typeof HINTS)[CreateOptions["language"]];

export const hintsFor = (language: CreateOptions["language"]): Hints => HINTS[language];

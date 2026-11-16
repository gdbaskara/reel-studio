import { NOTEBOOK } from "../looks/notebook";
import type { ReelSpec } from "../types";

// Demo reel: onboarding for "Pandu", a fictional internal AI assistant.
// No voiceover is committed for it; generate one with `npm run voice:pandu`.
export const PANDU_REEL: ReelSpec = {
  id: "pandu",
  palette: NOTEBOOK.palettes[0].colors,
  title: { lead: "Cara pakai", main: "Pandu" },
  steps: [
    { title: "Login", note: "Pakai akun Microsoft kantor", drawing: "arrow" },
    { title: "Ketik pertanyaan", note: "\"Bagaimana prosedur pengajuan cuti?\"", drawing: "circle" },
    { title: "Baca jawabannya", note: "Dari dokumen resmi yang sudah disetujui", drawing: "check" },
    { title: "Buka Knowledge", note: "Lihat & unduh dokumen General dan Divisi", drawing: "zigzag" },
    { title: "Atur riwayat chat", note: "Cari, pin, atau ganti nama di sidebar", drawing: "star" },
  ],
  outro: { main: "Selamat mencoba", sub: "Pandu!" },
};

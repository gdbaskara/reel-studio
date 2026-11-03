import { PALETTES } from "../palettes";
import type { ReelSpec } from "../types";

export const ATLAS_REEL: ReelSpec = {
  id: "atlas",
  palette: PALETTES.green,
  title: { lead: "Cara pakai", main: "Atlas" },
  steps: [
    { title: "Login", note: "Pakai akun Microsoft kantor", drawing: "arrow" },
    { title: "Ketik pertanyaan", note: "\"Bagaimana prosedur pengajuan cuti?\"", drawing: "circle" },
    { title: "Baca jawabannya", note: "Dari dokumen resmi yang sudah disetujui", drawing: "check" },
    { title: "Buka Knowledge", note: "Lihat & unduh dokumen General dan Divisi", drawing: "zigzag" },
    { title: "Atur riwayat chat", note: "Cari, pin, atau ganti nama di sidebar", drawing: "star" },
  ],
  outro: { main: "Selamat mencoba", sub: "Atlas!" },
};

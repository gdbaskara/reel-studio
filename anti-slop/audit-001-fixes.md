# Audit 001: laporan perbaikan

## Batch 1 (branch `fix/audit-batch-1`)

Nomor yang dikerjakan: 1, 2, 3, 4, 5, 6, 13, 15, 19.

Nomor 8 (font dan label uppercase) dipindah ke batch 4, karena pilihan font butuh arah desain dulu (R-37).

| # | Status | Yang berubah | Bukti |
|---|--------|--------------|-------|
| 1 | Selesai | Radio tidak lagi `display: none`. Radio disembunyikan secara visual, dan kartunya dapat ring fokus lewat `:has(input:focus-visible)` | Klik textarea, Tab ke radio "ai" dengan outline solid, panah kanan memilih "I'll write it myself" |
| 2 | Selesai | Token baru `--on-accent`. Light: aksen `#077a52` dengan teks putih (5.36:1). Dark: teks `#0b1f17` di atas `#34c38f` (7.65:1) | `contrast-check.py` |
| 3 | Selesai | Teks badge memakai `--text` (12.96:1 light, 11.12:1 dark). `--warn` light jadi `#8a5300` (5.76:1). Placeholder tanpa opacity: 4.60:1 light, 7.07:1 dark | `contrast-check.py` |
| 4 | Selesai | Di layar 900px ke bawah, semua kontrol minimal 44px. Topbar dua baris | Mobile 375px: 0 kontrol di bawah 44px, topbar 213px jadi 113px, `scrollWidth` 375 (tidak overflow) |
| 5 | Selesai | Daftar reel punya state loading, error (dengan "Try again"), dan siap. Generate suara jalan terus walau satu scene gagal, lalu editor tetap terbuka dengan pesan scene mana yang gagal. Ada tombol "Stop and open editor" dan spinner | Fetch dibuat gagal, panel error muncul, "Try again" memuat 8 reel. Logika suara diuji di `tests/batch1.test.ts` |
| 6 | Selesai | Hover (tint aksen), active (tekan 1px), dan `:focus-visible` untuk semua tombol, kartu, dan summary. Dimatikan saat `prefers-reduced-motion` | Dicek di browser |
| 13 | Selesai | Player dibuka di detik 2.5 (`posterFrame`), bukan frame 0 | Preview "This scene" langsung menampilkan judul Mahjong |
| 15 | Selesai | Captions dan Progress bar pindah ke panel gaya. Duplicate dan tema masuk menu "More" (Escape menutup dan mengembalikan fokus). Download jadi satu kata | More: buka, isi 2 item, Escape menutup, fokus kembali ke tombolnya. Menu tetap di dalam layar di mobile |
| 19 | Selesai | BrandPanel memakai class sendiri, `brand-panel` | Gaya tetap sama: background panel, radius 14px, lebar 512px |

### Delivery Gate (lingkup batch 1)

- R-02 PASS: tidak ada em dash di file yang diubah.
- R-03 PASS: mobile 375px tanpa overflow, semua kontrol minimal 44px.
- R-25 PASS: semua pasangan warna yang diubah dicek dengan script (lihat tabel).
- R-26 PASS: semua kontrol baru punya aksi nyata. "Try again" memuat ulang, "Stop and open editor" menghentikan generate suara, dan menu More membuka dan menutup.
- R-27 PASS: daftar reel punya loading, error, dan siap. Create punya progres dan jalur gagal yang jelas.
- R-32 PASS: radio bisa dipakai lewat keyboard, Escape menutup menu, dan ring fokus terlihat.
- R-33: CSS ditulis langsung di `styles.css`, tidak ada script patch di repo. Catatan jujur: satu edit token warna awal dijalankan lewat perintah Python sekali pakai, bukan lewat editor. Hasilnya tetap CSS biasa dan tidak ada script yang tertinggal.
- R-34 PASS: light dan dark dicek di editor mobile.
- R-35 PASS, dengan satu pengecualian: alur "Stop and open editor" tidak diklik end-to-end, karena itu akan membuat reel baru dan memakai kuota suara. Logikanya diuji lewat unit test.
- R-39 PASS: menu More memakai `<details>`/`<summary>` native. Setiap kontrol punya nama dan state hover, active, dan disabled. Reduced motion dihormati.
- Tes: 213 lulus, `tsc` bersih.
- Render video tidak berubah, karena batch ini tidak menyentuh `src/`.

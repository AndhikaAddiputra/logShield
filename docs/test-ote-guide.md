# OT&E — Skenario Uji Operasional (4 Jam)

**Peserta:** 2-3 operator BPBD + 1 fasilitator
**Lokasi:** Ruang simulasi dengan proyektor + 2 device (web + mobile)

---

## Sesi 1: Briefing (30 menit)

1. Demo seluruh fitur (10 menit)
2. Jelaskan alur: Request → Diproses → Selesai
3. Jelaskan dashboard: Stock Weight, Heatmap, Kelompok Rentan
4. Bagikan skenario cetak ke peserta

---

## Sesi 2: Skenario Banjir (60 menit)

**Kondisi Awal:**
- 3 posko aktif (Posko A, B, C)
- Masing-masing 200-500 pengungsi
- Stok beras menipis di Posko C

**Tugas:**
| # | Tindakan | Verifikasi |
|---|----------|------------|
| 1 | Login sebagai admin BPBD | Masuk ke dashboard |
| 2 | Buat request untuk Posko C (beras 200kg, status: mendesak) | Request muncul di logistics page |
| 3 | Proses request → Diproses | Status berubah, stok teralokasi |
| 4 | Selesaikan request → Selesai | Stock movement tercatat |
| 5 | Cek dashboard overview | Stok berkurang, chart stock weight berubah |

---

## Sesi 3: Stok Kritis + AI (45 menit)

**Tugas:**
| # | Tindakan | Verifikasi |
|---|----------|------------|
| 1 | Kurangi stok selimut hingga di bawah threshold | Card stok kritis muncul |
| 2 | Cek dashboard → Critical Items bertambah | Angka merah di stat card |
| 3 | Buka halaman Assets | Filter kategori, lihat progress bar |
| 4 | Cek tren distribusi mingguan | Line chart stok masuk/keluar |

---

## Sesi 4: Anomali (45 menit)

**Tugas:**
| # | Tindakan | Verifikasi |
|---|----------|------------|
| 1 | Buka halaman Anomali | Daftar anomali (jika ada) muncul |
| 2 | Buat laporan anomali baru | Tersimpan, status "reported" |
| 3 | Ubah status → Investigating | Status berubah |
| 4 | Selesaikan → Resolved | Status final |
| 5 | Filter by severity/status | Tampilan sesuai filter |

---

## Sesi 5: Debrief (60 menit)

1. Isi kuesioner (15 menit):
   - Apakah tampilan mudah dipahami? (1-5)
   - Apakah alur request sesuai SOP BPBD? (Ya/Tidak/Catatan)
   - Fitur apa yang kurang?
   - Bug yang ditemukan?

2. Diskusi terbuka (30 menit)
3. Prioritas perbaikan (15 menit)

---

## Kriteria Sukses

| Kriteria | Target |
|----------|--------|
| Semua skenario selesai | 100% |
| Bug blocker | 0 |
| Kepuasan pengguna (skor 4-5) | > 80% responden |
| Saran perbaikan terdokumentasi | Semua dicatat |

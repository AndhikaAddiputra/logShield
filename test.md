# Pengujian, Testing, dan Evaluasi — Log-Shield
> Diekstrak dari: Kelompok 09 — Deliverable 4 | II3240 Rekayasa Sistem dan Teknologi Informasi

---

## Daftar Isi

1. [Metode Evaluasi (Bab 2.3.4)](#1-metode-evaluasi-bab-234)
2. [Validasi Kebutuhan (Bab 2.4)](#2-validasi-kebutuhan-bab-24)
3. [Requirements Testing (Bab 3.1.3)](#3-requirements-testing-bab-313)
4. [Requirements Validation (Bab 3.1.4)](#4-requirements-validation-bab-314)
5. [Validasi dan Pengujian Konsep (Bab 3.3.4)](#5-validasi-dan-pengujian-konsep-bab-334)
6. [Performance Validation Concept Exploration (Bab 3.4)](#6-performance-validation-concept-exploration-bab-34)
7. [Eksperimen Kritis — Concept Validation (Bab 3.8.2.5)](#7-eksperimen-kritis--concept-validation-bab-3825)
8. [Analisis Hasil dan Validasi (Bab 3.8.3)](#8-analisis-hasil-dan-validasi-bab-383)
9. [Development Testing (Bab 4.5)](#9-development-testing-bab-45)
10. [Strategi Integrasi dan Pengujian Subsistem (Bab 5.4.2)](#10-strategi-integrasi-dan-pengujian-subsistem-bab-542)
11. [Perencanaan dan Persiapan Pengujian / T&E Planning (Bab 6.1)](#11-perencanaan-dan-persiapan-pengujian--te-planning-bab-61)
12. [Integrasi Sistem (Bab 6.2)](#12-integrasi-sistem-bab-62)
13. [Pengujian Sistem dalam Pengembangan / Developmental Testing (Bab 6.3)](#13-pengujian-sistem-dalam-pengembangan--developmental-testing-bab-63)
14. [Evaluasi Operasional / OT&E (Bab 6.4)](#14-evaluasi-operasional--ote-bab-64)

---

## 1. Metode Evaluasi (Bab 2.3.4)

**Pendekatan Desain dan Metode Evaluasi**

Pengembangan Log-Shield mengadopsi tiga pendekatan desain yang diterapkan secara komplementer:

1. **User-Centered Design (UCD)** — diterapkan pada komponen aplikasi mobile melalui prinsip Trauma-Aware UX dengan alur input maksimal tiga langkah, tipografi besar, dan kontras tinggi.
2. **Modular Design** — pada seluruh lapisan sistem sehingga setiap sub-sistem dapat diuji dan ditingkatkan secara independen.
3. **Security by Design** — integrasi AES-256, Row Level Security, dan audit trail sejak tahap perancangan.

**Tingkatan Metode Evaluasi:**

| Tingkatan | Jenis | Keterangan |
|---|---|---|
| 1 | Unit Testing | Fungsi kritis |
| 2 | Integration Testing | Alur data antar sub-sistem |
| 3 | User Acceptance Testing (UAT) | Minimal 5 pengguna representatif |
| 4 | Analisis Real-time | Dashboard monitoring DigitalOcean dan Supabase |

---

## 2. Validasi Kebutuhan (Bab 2.4)

### 2.1 Pentingnya Validasi Kebutuhan

Validasi kebutuhan merupakan proses kritis dalam Systems Engineering untuk memastikan bahwa requirements yang telah diidentifikasi benar-benar mencerminkan kebutuhan operasional aktual pengguna dan pemangku kepentingan, bukan hanya asumsi tim pengembang.

Dalam konteks Log-Shield, validasi kebutuhan sangat penting karena:
- Sistem akan digunakan dalam kondisi darurat yang tidak dapat disimulasikan sepenuhnya.
- Pengguna primer memiliki karakteristik unik.
- Kegagalan sistem saat bencana dapat berakibat pada hilangnya nyawa manusia.

### 2.2 Model Efektivitas Operasional

Model efektivitas operasional Log-Shield distrukturkan dalam tiga lapisan: kondisi lingkungan operasional, respons sistem, dan pengukuran hasil.

**Empat Skenario Operasional yang Dievaluasi:**

| Skenario | Kondisi | Parameter Evaluasi |
|---|---|---|
| Skenario 1 — Respons Awal 0–72 Jam | Koneksi internet terputus total | Kemampuan beroperasi offline penuh, mencatat transaksi dengan KIB, sinkronisasi otomatis saat koneksi pulih |
| Skenario 2 — Operasi Rutin Hari 3–30 | Koneksi internet intermittent, model AI memiliki data historis cukup | Akurasi prediksi AI dan kebermanfaatan Rationale Chips |
| Skenario 3 — Kondisi Stok Kritis | Komoditas mendekati habis, jalur pasokan terhambat | Kecepatan notifikasi darurat dan akurasi rekomendasi redistribusi AI |
| Skenario 4 — Bencana Skala Besar Multi-Posko | Lonjakan pengungsi mendadak, koordinasi lintas posko | Kemampuan scaling backend dan konsistensi data lintas perangkat |

### 2.3 Measures of Effectiveness (MoE)

MoE dirancang untuk mengukur sejauh mana sistem Log-Shield berhasil memenuhi mandat Enam Tepat BNPB.

| Kode | Indikator Efektivitas | Formula Pengukuran | Target |
|---|---|---|---|
| MoE1 | Akurasi Prediksi Kebutuhan Logistik | (1 − │Prediksi − Aktual│ / Aktual) × 100% | > 88% |
| MoE2 | Ketepatan Distribusi Bantuan (Enam Tepat) | Distribusi memenuhi ≥5 kriteria Tepat / Total | > 90% |
| MoE3 | Ketersediaan Sistem (Uptime) | (Operasional − Henti) / Operasional × 100% | > 95% |
| MoE4 | Kecepatan Respons Darurat | Waktu dari alert hingga distribusi | < 4 jam |
| MoE5 | Tingkat Adopsi Petugas Lapangan | Petugas aktif / Total target | > 80% dalam 4 minggu |
| MoE6 | Reduksi Pemborosan Logistik | (Stok terbuang sebelum − sesudah) / Sebelum | > 30% |

### 2.4 Measures of Performance (MoP)

MoP berfungsi sebagai parameter teknis yang dapat diukur dan diverifikasi selama proses pengujian.

| Kode | Indikator Kinerja | Metrik Pengukuran | Target |
|---|---|---|---|
| MoP1 | Akurasi Sensor Load Cell | Deviasi berat dari nilai terkalibrasi | ±150 gram |
| MoP2 | Latensi Transmisi Data Sensor | Waktu sensor hingga simpan backend | < 10 detik |
| MoP3 | Waktu Sinkronisasi Offline→Online | Durasi sync setelah koneksi pulih | < 60 detik |
| MoP4 | Latensi Prediksi AI | Waktu komputasi model | < 5 detik |
| MoP5 | Waktu Respons UI Aplikasi Mobile | Aksi pengguna hingga respons layar | < 2 detik |
| MoP6 | Throughput API Backend | Request per detik kondisi normal | ≥ 100 req/detik |
| MoP7 | Konsumsi Daya Perangkat IoT | Konsumsi rata-rata transmisi aktif | < 500 mA @ 5V |
| MoP8 | Akurasi Model Time Series (MAE) | Mean Absolute Error harian | < 15% |

---

## 3. Requirements Testing (Bab 3.1.3)

Setiap requirement yang teridentifikasi diuji terhadap **lima kriteria kelayakan**:

1. **Ketertelusuran (Traceability)** — dari requirement ke objektif operasional dan permasalahan.
2. **Bebas Redundansi** — tidak ada overlap antar requirement.
3. **Dapat Diverifikasi (Verifiable)** — melalui pengujian objektif.
4. **Kesesuaian Teknis** — dengan stack teknologi yang dipilih.
5. **Kelayakan Biaya/Jadwal** — dalam batasan MVP 8 minggu dengan anggaran Rp 2.380.000.

Requirements yang tidak memenuhi salah satu kriteria direvisi atau diturunkan prioritasnya menggunakan metode **MoSCoW** (Must, Should, Could, Won't).

---

## 4. Requirements Validation (Bab 3.1.4)

Validasi requirements Log-Shield dilakukan melalui **empat mekanisme**:

1. **Tinjauan Internal** — antar anggota tim dengan checklist kriteria SMART (Specific, Measurable, Achievable, Relevant, Time-bound).
2. **Benchmarking Internasional** — perbandingan dengan solusi existing internasional (HELIOS USAID, OpenLMIS) untuk memastikan requirements Log-Shield setidaknya setara atau lebih baik dalam aspek kemanusiaan.
3. **Penilaian Kelayakan Teknis** — oleh masing-masing PIC sub-sistem terhadap stack teknologi yang dipilih.
4. **Evaluasi Keselarasan Regulasi** — dengan tujuan keberlanjutan dan kepatuhan regulasi Indonesia.

---

## 5. Validasi dan Pengujian Konsep (Bab 3.3.4)

### 5.1 Analisis Kelayakan

Kelayakan teknis dijamin oleh tiga faktor:
- **Kematangan teknologi** (Capacitor 1 juta+ proyek aktif, ESP32 ekosistem masif, Supabase 1 juta+ proyek).
- **Ketersediaan keahlian tim** (5 anggota dengan spesialisasi terdiversifikasi).
- **Dukungan komunitas open-source** pada seluruh stack.

Kelayakan ekonomi: total biaya MVP Rp 2.380.000 hardware + $43/bulan cloud.
Kelayakan operasional: Trauma-Aware UI 3 langkah untuk pengguna non-teknis dalam kondisi stres tinggi.

### 5.2 Eksperimen Kritis

Empat eksperimen kritis dijadwalkan untuk memvalidasi fitur desain yang esensial:

1. Pengujian akurasi median filtering 15 sampel dengan beban referensi 5/10/20/40 kg — target deviasi **±150 gram**.
2. Pengujian retraining model statsforecast dengan dataset simulasi 30 hari — target **MAE < 15%**.
3. Pengujian sinkronisasi SQLite ke Supabase setelah 72 jam offline dengan 200 transaksi — target **zero data loss**.
4. Pengujian konsistensi resolusi konflik LWW dengan dua perangkat mengedit record yang sama secara offline.

### 5.3 Simulasi dan Pengujian Sistem

Skenario simulasi dirancang untuk menguji ketahanan sistem dalam kondisi ekstrem.

| Skenario | Kondisi Uji | Hasil yang Diharapkan |
|---|---|---|
| Fluktuasi Lingkungan Ekstrem | Suhu 55–60°C, kelembaban 95% RH, vibrasi simulasi forklift gudang | Sensor tetap akurat dalam toleransi ±150 gram; casing IP67 tetap kedap |
| Variasi Beban Limbah/Stok | Beban 0 hingga 50 kg dengan increment 5 kg | Linearity sensor terverifikasi; tidak ada drift > 50 gram |
| Gangguan Konektivitas | Wi-Fi terputus 50 menit, ESP32 buffer 100 pembacaan ke NVS | Seluruh 100 pembacaan dipublikasikan ulang QoS 1 saat koneksi pulih; zero duplikasi di backend |
| Lonjakan Data Mendadak | 100 node IoT simulator publish bersamaan setiap 30 detik | Backend throughput > 200 msg/detik; latensi p95 < 10 detik; CPU < 60% |

---

## 6. Performance Validation Concept Exploration (Bab 3.4)

### 6.1 Tujuan Validasi Kebutuhan Performa

Validasi kebutuhan performa Log-Shield bertujuan memastikan bahwa parameter teknis yang ditetapkan dalam MoP dapat dicapai oleh konsep sistem terpilih dengan margin yang aman, mempertimbangkan ketidakpastian lingkungan operasional bencana. Validasi dilakukan **sebelum** memasuki tahap engineering development untuk menghindari kebutuhan re-design yang mahal di tahap akhir.

### 6.2 Proses Integrasi Karakteristik Performa

Dilakukan melalui pendekatan **top-down**:
- Dimulai dari kebutuhan tingkat sistem (MoE)
- Diturunkan ke parameter sub-sistem (MoP)
- Kemudian dialokasikan ke komponen-komponen spesifik

Setiap keputusan rekayasa didokumentasikan dalam tabel trade-off yang memperlihatkan alternatif yang dipertimbangkan dan alasan pemilihan.

### 6.3 Validasi Karakteristik Performa

Kondisi spesifik di mana sistem dianggap efektif untuk **MoE1 (Akurasi Prediksi > 88%)**:
- Data historis distribusi minimal 21 hari.
- Tidak ada anomali besar dalam jumlah pengungsi (perubahan < 50% dari rata-rata).
- MAE model di bawah 15%.

Jika salah satu kondisi tidak terpenuhi, sistem otomatis fallback ke rata-rata historis 30 hari.

Spesifikasi keamanan: AES-256 untuk enkripsi at-rest, TLS 1.3 untuk enkripsi in-transit, Row Level Security, JWT dengan masa berlaku 24 jam, dan audit trail append-only dengan retensi minimum 2 tahun.

### 6.4 Dokumentasi Kebutuhan Performa

Setiap kebutuhan performa memiliki:
- Kode unik (MoE1–MoE6, MoP1–MoP8, FR01–FR10)
- Deskripsi naratif
- Formula pengukuran atau metrik
- Target nilai
- Referensi ke implementasi (file source code, skema database, atau test case)

Dokumentasi disimpan dalam `packages/types` pada monorepo dan diversion-control bersama kode.

---

## 7. Eksperimen Kritis — Concept Validation (Bab 3.8.2.5)

Eksperimen kritis dilakukan untuk **memverifikasi fitur desain yang bersifat esensial** dalam kondisi ekstrem yang tidak dapat diwakili sepenuhnya melalui simulasi komputer.

### Parameter dan Kondisi Uji Eksperimen Kritis

| Skenario | Kondisi Ekstrem | Tujuan Uji |
|---|---|---|
| Kelembaban tinggi gudang | > 90% RH selama 24 jam | Menguji kekedapan casing IP67 dan kestabilan sensor |
| Beban maksimum | 49.5 kg pada Load Cell | Menguji ketahanan transduser dan akurasi pembacaan di batas atas |
| Wi-Fi flapping | Putus-sambung 10 siklus 5 menit | Menguji robustness reconnect MQTT dan integritas data NVS |
| Lonjakan data | 100 node IoT publish bersamaan | Menguji throughput backend dan latensi end-to-end |

---

## 8. Analisis Hasil dan Validasi (Bab 3.8.3)

### 8.1 Tujuan Analisis

- Mengidentifikasi penyebab ketidaksesuaian antara performa aktual eksperimen kritis dengan ekspektasi sistem.
- Mengklasifikasikan ketidaksesuaian: defisiensi asumsi desain, kelemahan model pengujian, atau persyaratan terlalu ketat.
- Menentukan perbaikan yang diperlukan melalui iterasi desain sebelum tahap engineering development.

### 8.2 Klasifikasi Ketidaksesuaian dan Akar Masalah

| No | Jenis Ketidaksesuaian | Kasus | Analisis Penyebab | Rekomendasi |
|---|---|---|---|---|
| 1 | Defisiensi asumsi | Pembacaan sensor tidak stabil pada vibrasi tinggi | Asumsi awal lingkungan tenang, padahal forklift sering melewati area gudang | Tambahkan median filtering 15 sampel dan validasi rentang nilai |
| 2 | Kelemahan model uji | iOS Background Task tidak terjamin intervalnya | Model tidak mempertimbangkan kebijakan Apple membatasi background execution | Tambahkan fallback sync saat app dibuka dan manual trigger |
| 3 | Persyaratan terlalu ketat | MAE prediksi < 10% sulit dicapai dengan < 21 hari data | Target awal optimis, data historis terbatas pada awal deployment | Revisi target ke < 15% MAE dengan fallback rata-rata historis |

### 8.3 Iterasi Konsep dan Revisi Spesifikasi

| No | Elemen Diubah | Revisi/Iterasi | Alasan Perubahan | Dampak |
|---|---|---|---|---|
| 1 | Target MAE prediksi | Dari < 10% → < 15% | Data historis < 21 hari pada awal deployment | Realistis untuk fase MVP; fallback historical mean |
| 2 | Strategi sync mobile | Dari PouchDB-CouchDB native → Custom Sync Endpoint | Supabase tidak mendukung PouchDB native replication | Implementasi lebih fleksibel, kontrol penuh LWW |
| 3 | iOS Background Task | Dari fixed 15 menit → adaptive + manual trigger | Apple membatasi background execution | Fallback sync saat app dibuka memastikan tidak ada data loss |
| 4 | Cloud provider | Dari AWS → DigitalOcean + Supabase | AWS billing kompleks dan mahal | Biaya $43/bulan prediktif, antarmuka simpler |
| 5 | Platform mobile | Hanya Android → Android + iOS | Petugas BPBD juga menggunakan iPhone | Cakupan pengguna lebih luas via Capacitor.js |

### 8.4 Kesimpulan Concept Validation

Pemodelan sistem menunjukkan bahwa arsitektur semi-otomatis berbasis IoT + AI + Mobile Offline-First mampu berinteraksi efektif dengan lingkungan operasional BPBD Indonesia yang beragam. Simulasi dan eksperimen kritis membuktikan bahwa sistem memenuhi sebagian besar MoP dan MoE, serta menunjukkan ketahanan dalam kondisi ekstrem (lingkungan, konektivitas, beban).

Konsep B: Semi-Otomatis dengan Digital Monitoring telah memenuhi kriteria kelayakan:
- **Teknis**: komponen tersedia, ekosistem matang.
- **Lingkungan**: rating IP67, suhu/kelembaban ekstrem.
- **Operasional**: Trauma-Aware UI, biaya terjangkau.

Sistem dapat dilanjutkan ke tahap engineering development dengan risiko yang dapat diterima.

---

## 9. Development Testing (Bab 4.5)

### 9.1 Test Planning

Ruang lingkup pengujian mencakup: unit, integrasi, end-to-end.

**Metodologi pengujian:**
- **Jest** — untuk JavaScript/TypeScript
- **Pytest** — untuk Python
- **PlatformIO** — untuk ESP32
- **Playwright** — untuk E2E web
- **k6** — untuk load testing

### 9.2 Test Scenario

Skenario pengujian mencakup 12 test cases yang didokumentasikan pada Deliverable 3 Bab 2.3.3.

| No | Skenario Uji | Langkah Pengujian | Hasil yang Diharapkan | Status |
|---|---|---|---|---|
| 1 | [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Planned |
| 2 | [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Planned |

> Catatan: Bagian ini akan diisi oleh tim pengembang setelah eksekusi pengujian pengembangan awal pada minggu ke-7 fase MVP.

---

## 10. Strategi Integrasi dan Pengujian Subsistem (Bab 5.4.2)

**Integrasi dilakukan secara inkremental:**

1. Unit test per modul
2. Integrasi sub-sistem: IoT+Backend, Mobile+Backend, AI+Backend
3. Integrasi total end-to-end

**Metodologi:**

| Tools | Digunakan untuk |
|---|---|
| Jest | TypeScript |
| Pytest | Python |
| PlatformIO | ESP32 Firmware |
| Playwright | E2E Test |
| k6 | Load Test |

---

## 11. Perencanaan dan Persiapan Pengujian / T&E Planning (Bab 6.1)

Tabel paralel antara System Development dan T&E Planning untuk menyelaraskan pengembangan sistem dengan strategi pengujian yang komprehensif.

| System Development | T&E Planning |
|---|---|
| **Need**: Memverifikasi bahwa sistem Log-Shield memenuhi mandat Enam Tepat BNPB: prediksi akurat, distribusi tepat sasaran, validasi stok otomatis, operasi offline, keamanan data UU PDP No. 27/2022. | **Objective**: Memastikan sistem beroperasi sesuai spesifikasi teknis (MoP), handal dalam kondisi bencana, aman dari serangan, dan mudah digunakan oleh petugas non-teknis di lingkungan tekanan tinggi. |
| **System Concept**: Trade-off performa vs biaya (Supabase Free vs Pro); kecepatan dev vs kompleksitas (monorepo vs multi-repo); akurasi AI vs latensi (cloud inference vs edge). | **Test Concept**: Evaluasi trade-off manual vs otomatis vs simulasi; jadwal pengujian di minggu 7–8; cakupan: unit, integrasi, end-to-end, load, security, field test. |
| **Functional Design**: Modul sensor/IoT, backend Express API, AI engine FastAPI, mobile Capacitor (Android+iOS), web dashboard React, broker MQTT Mosquitto, Supabase PostgreSQL. | **Test Plan**: Unit test per modul (Jest/Pytest/PlatformIO); integrasi sub-sistem (IoT+Backend, Mobile+Backend, AI+Backend); API security + load (k6 + OWASP ZAP); UI E2E (Playwright); field test sensor; evaluasi operasional bersama petugas BPBD. |
| **Detailed Design**: Hardware (ESP32+HX711+IP67); Software (Capacitor, Express, FastAPI, Supabase); Offline (SQLite + custom sync); Keamanan (AES-256, RLS, JWT, TLS 1.3). | **Test Procedures**: Kalibrasi + validasi sensor 4 titik beban; uji sync 72 jam offline; validasi LWW conflict; load test 100 node IoT paralel; penetration test OWASP; iOS build validation; field test kondisi lingkungan. |
| **Asumsi dan Batasan Sistem**: Wi-Fi intermittent di gudang; Android 8+/iOS 15+; komponen tersedia lokal; Supabase Free Tier cukup untuk MVP; petugas non-teknis bersedia ikut pelatihan 30 menit. | **Peninjauan dan Penyesuaian Rencana Pengujian**: Review persyaratan per sprint; penyesuaian skenario jika asumsi berubah; buffer waktu 1 minggu di akhir untuk iterasi. |
| **Risiko dan Mitigasi Teknis**: Sensor drift, AI data terbatas, konflik sync, keamanan API, timeline ketat 8 minggu, kompatibilitas iOS plugin. | **Penanganan Risiko Pengujian**: Simulasi kegagalan sensor; inject konflik data dua perangkat; penetration test OWASP; stress test lonjakan data; monitoring log real-time via Supabase + DigitalOcean Monitoring. |
| **Timeline dan Alokasi Sumber Daya**: 7 fase pengembangan, 8 minggu, 5 anggota tim (PM, AI, IoT, Mobile, Backend). | **Jadwal dan Alokasi Sumber Daya Pengujian**: Minggu 7 developmental testing (12 skenario teknis); Minggu 8 OT&E + demo MVP; target keterlibatan 5 petugas BPBD representatif sebagai penguji eksternal. |
| **Dokumentasi dan Komunikasi**: Monorepo Git, CHANGELOG conventional commits, API docs Swagger pada /api/docs, weekly sprint review via Google Meet. | **Pelaporan dan Dokumentasi Hasil Pengujian**: Laporan pengujian per skenario; bug tracker GitHub Issues dengan severity labels; rekomendasi perbaikan; feedback pengguna OT&E direkap dalam tabel. |

---

## 12. Integrasi Sistem (Bab 6.2)

Integrasi sistem Log-Shield dilakukan secara inkremental sesuai rekomendasi Kossiakoff (2011), terdiri dari empat tahap: konfigurasi pengujian fisik, proses integrasi sub-sistem, integrasi total sistem, dan fasilitas pengujian integrasi sistem.

### 12.1 Konfigurasi Pengujian Fisik

Konfigurasi pengujian fisik dirancang untuk mensimulasikan kondisi operasional nyata di gudang logistik BPBD.

| Komponen / Alur | Deskripsi | Peran dalam Sistem |
|---|---|---|
| Input Generator | Beban referensi terkalibrasi 5/10/20/40 kg yang menghasilkan stimulus fisik terukur pada Load Cell. | Ground truth untuk validasi akurasi sensor Load Cell HX711 (target deviasi ±150 gram). |
| System Element | Node IoT lengkap: Load Cell → HX711 (ADC 24-bit) → ESP32 (firmware median filtering, MQTT publish QoS 1) → Wi-Fi → Broker Mosquitto. | Keseluruhan pipeline akuisisi data yang diuji sebagai satu unit fungsional terintegrasi. |
| Output Analyzer | Script Python yang subscribe MQTT, catat timestamp publish dan timestamp simpan di Supabase, bandingkan dengan beban referensi. | Validasi akurasi, latensi end-to-end, dan message delivery rate (zero drop QoS 1). |
| Element Model | Model simulasi berdasarkan spesifikasi teknis HX711 (24-bit ADC, gain 128x) yang memprediksi output ideal untuk setiap beban referensi. | Referensi pembanding untuk menentukan apakah deviasi aktual berada dalam toleransi MoP1. |
| Performance Comparator | Script yang menghitung deviasi, latensi p95, dan delivery rate; membandingkan hasil aktual dengan target MoP yang ditetapkan. | Penilaian pass/fail terhadap kriteria keberhasilan yang ditetapkan. |
| Test Manager | Project Manager (Andhika) yang mengatur jadwal, menetapkan kriteria, dan memutuskan tindak lanjut jika hasil di luar toleransi. | Pengawas dan pengambil keputusan eskalasi untuk seluruh proses pengujian. |
| Test Control Unit | Script otomasi yang memicu skenario uji (vibrasi, suhu, Wi-Fi off, lonjakan data) secara terjadwal. | Kontrol terpusat untuk reprodusibilitas skenario pengujian lintas iterasi. |

### 12.2 Proses Integrasi Sub-Sistem

Proses integrasi sub-sistem dilakukan bertahap dengan setiap sub-sistem diuji secara terisolasi sebelum integrasi total.

| Komponen | Deskripsi Fungsi | Implementasi | Peran |
|---|---|---|---|
| Input Generator | Data uji menyerupai kondisi nyata. | Beban fisik (sensor); data JSON simulasi (API); transaksi dummy (mobile sync). | Pengujian terkontrol dan berulang dengan parameter konsisten. |
| Subsystem A (IoT+Backend) | Pipeline sensor ke database PostgreSQL. | ESP32 → MQTT → Express subscriber → Supabase stock_readings. | Validasi alur akuisisi data sensor end-to-end. |
| Subsystem B (Mobile+Backend) | Sync offline ke database PostgreSQL. | SQLite → custom sync endpoint → Supabase distributions. | Validasi offline-first 72 jam dan LWW conflict resolution. |
| Subsystem C (AI+Backend) | Pipeline prediksi dan generasi Rationale Chips. | Supabase data → FastAPI statsforecast → Supabase predictions. | Validasi akurasi MAE < 15% dan koherensi narasi chips. |
| Output Analyzer | Kumpulkan dan olah output sub-sistem. | Query Supabase SQL editor; subscribe MQTT Explorer; Playwright trace files. | Verifikasi integritas data end-to-end pasca-integrasi. |
| Performance Comparator | Bandingkan aktual vs target MoP. | Script k6 + custom assertions terhadap MoP1–MoP8. | Indikator pass/fail integrasi per sub-sistem. |
| Test Manager | Pengawasan dan keputusan eskalasi. | PM + jadwal sprint + monitoring + laporan ke dosen. | Jaminan pengujian efektif dan dapat dipertanggungjawabkan. |

### 12.3 Integrasi Total Sistem

| Aspek | Penjelasan dan Implikasi |
|---|---|
| Penggabungan semua subsistem | Ketiga sub-sistem (A, B, C) diintegrasikan pada environment staging tunggal: sensor IoT → backend → Supabase ← mobile sync ← AI engine; dashboard web mengkonsumsi seluruh data dari Supabase. |
| Kompleksitas tinggi integrasi sistem | Sinkronisasi real-time MQTT + batch sync mobile + retraining AI harian berjalan simultan; autentikasi Supabase Auth harus konsisten di seluruh klien web, mobile, dan AI engine. |
| Kesulitan isolasi masalah | Strategi debugging: structured logging dengan correlation ID per request (Winston); Supabase query log untuk tracing query lambat; MQTT message tracing via topic monitoring. |
| Biaya dan risiko waktu yang lebih besar | Buffer 1 minggu di akhir untuk iterasi; prioritisasi MoSCoW jika waktu tidak cukup: Must (F01–F05), Should (F06–F09), Could (F10), Won't (fitur lanjutan pasca-MVP). |
| Kebutuhan perencanaan pengujian detail | 12 skenario teknis + 6 parameter OT&E; setiap skenario memiliki langkah eksekusi, expected result, status (Planned/In Progress/Done), dan PIC. |
| Pengawasan dan keahlian diagnostik | Setiap anggota mendiagnostik sub-sistemnya; PM mengkoordinasi isu lintas sub-sistem. |
| Pengujian integrasi dan validasi akhir | Validasi akhir end-to-end: petugas catat distribusi offline → sync ke Supabase → dashboard koordinator melihat data baru → AI engine generate prediksi → Rationale Chips tampil di mobile. |

### 12.4 Fasilitas Pengujian Integrasi Sistem

| Aspek | Deskripsi |
|---|---|
| Kebutuhan fasilitas khusus | Laptop development 5 unit; smartphone Android + iOS minimal 2 unit untuk pengujian cross-platform; prototipe node IoT 3 unit; beban referensi terkalibrasi; koneksi internet stabil + simulasi 3G. |
| Pengembangan bertahap | Fase unit → sub-sistem → integrasi total; setiap fase menggunakan subset fasilitas yang semakin lengkap. |
| Rekayasa fasilitas dari subsistem | Environment staging sub-sistem ditingkatkan menjadi environment staging terintegrasi dengan menggabungkan Supabase project dan menambahkan MQTT broker bersama. |
| Ekstraksi data dari titik uji | Query Supabase via SQL editor; subscribe topik MQTT via MQTT Explorer; export audit_logs ke CSV; Playwright trace files untuk UI. |
| Fleksibilitas desain fasilitas | Docker Compose memudahkan recreate environment dari awal; Supabase branching (preview environments) untuk skenario pengujian baru tanpa mengganggu production. |
| Peran dalam rekayasa sistem | Fasilitas integrasi menjadi basis validasi akhir sebelum demo MVP dan deployment produksi pilot di satu kabupaten BPBD. |

---

## 13. Pengujian Sistem dalam Pengembangan / Developmental Testing (Bab 6.3)

### 13.1 Tujuan

Memverifikasi bahwa setiap komponen dan integrasi antar komponen Log-Shield memenuhi spesifikasi teknis (MoP1–MoP8) yang ditetapkan pada Deliverable 1, dengan fokus pada:
- Akurasi sensor Load Cell
- Latensi sinkronisasi mobile-cloud
- Keandalan operasi offline
- Presisi model AI statsforecast
- Penegakan keamanan AES-256 + RLS + RBAC

### 13.2 Lingkup Pengujian

**Sub-sistem IoT/Sensor:**
- Akurasi pembacaan Load Cell setelah median filtering
- Latensi MQTT end-to-end
- Ketahanan buffer NVS saat offline
- Robustness OTA update

**Sub-sistem Backend:**
- Throughput REST API
- MQTT subscriber
- Custom sync endpoint
- Penegakan RBAC dan RLS
- Enkripsi AES-256 field sensitif

**Sub-sistem AI Engine:**
- Akurasi MAE statsforecast
- Latensi inferensi
- Koherensi dan keterbacaan Rationale Chips dalam Bahasa Indonesia

**Sub-sistem Mobile:**
- Operasi offline 72 jam pada SQLite
- Background Sync
- Trauma-Aware UI responsiveness
- Kompatibilitas Android dan iOS

**Sub-sistem Dashboard Web:**
- Rendering Recharts dengan dataset besar
- Polling TanStack Query
- Push notifikasi Supabase Realtime untuk stok kritis

### 13.3 Rencana Skenario dan Validasi Teknis

**Validasi Komponen / Sensor:**
- Uji akurasi pembacaan Load Cell pada 4 titik beban (5/10/20/40 kg)
- Uji kestabilan sinyal selama 10 menit per titik
- Uji konsistensi pembacaan setelah median filtering 15 sampel

**Latensi Sistem:**
- Waktu respons dari pembacaan sensor IoT hingga simpan di Supabase — target p95 < 10 detik
- Delay sinkronisasi mobile ke cloud — target 500 transaksi < 60 detik
- Delay rendering dashboard setelah polling — target < 500 ms p95

**Integrasi Data:**
- Sinkronisasi data sensor dari ESP32 ke backend melalui MQTT
- Sinkronisasi transaksi mobile ke Supabase via custom sync endpoint
- Tampilan data historis prediksi di dashboard koordinator dan halaman detail prediksi mobile

### 13.4 Hasil Pengujian

| Komponen / Subsistem | Indikator Pengujian | Target | Hasil |
|---|---|---|---|
| [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Lolos / Gagal |
| [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Lolos / Gagal |
| [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Lolos / Gagal |
| [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Lolos / Gagal |
| [Akan diisi setelah eksekusi] | [Akan diisi] | [Akan diisi] | Lolos / Gagal |

> Catatan: Bagian ini akan diisi oleh tim pengembang setelah eksekusi pengujian developmental pada minggu ke-7 fase MVP.

### 13.5 Analisis dan Kesimpulan

> Catatan: Bagian ini akan diisi setelah hasil pengujian terkumpul. Analisis akan mencakup: apakah sistem memenuhi standar teknis dari sisi kecepatan, akurasi, dan integrasi; apakah semua komponen bekerja serempak dan stabil; apakah ada deviasi dari parameter teknis yang ditetapkan; dan apakah sistem layak untuk diuji lebih lanjut dalam konteks pengguna nyata pada fase OT&E.

---

## 14. Evaluasi Operasional / OT&E (Bab 6.4)

### 14.1 Tujuan Evaluasi Operasional

Menilai tingkat pemenuhan sistem Log-Shield terhadap kebutuhan pengguna dalam kondisi yang menyerupai operasional nyata bencana, mencakup:
- Keandalan fungsional saat operasi 4–8 jam berkelanjutan
- Kemudahan penggunaan oleh petugas BPBD non-teknis di bawah tekanan
- Ketahanan sistem terhadap gangguan jaringan dan lingkungan

### 14.2 Skenario Pengujian

| No | Skenario | Deskripsi |
|---|---|---|
| 1 | Aktivasi sistem | Menyalakan node IoT dan memverifikasi seluruh komponen aktif (sensor terbaca, MQTT terhubung, data muncul di dashboard koordinator). |
| 2 | Pencatatan distribusi offline + sync | Petugas mencatat distribusi offline lalu sync saat online, verifikasi data muncul di dashboard koordinator dengan timestamp yang benar. |
| 3 | Request logistik antar posko | Koordinator memproses request logistik dari posko, petugas lapangan menerima notifikasi update status request. |
| 4 | Ketahanan offline 1 jam | Memutus koneksi internet selama 1 jam, verifikasi mobile tetap berfungsi penuh dengan SQLite lokal, tidak ada data loss saat koneksi pulih. |
| 5 | Prediksi AI dan Rationale Chips | Memverifikasi prediksi AI dan Rationale Chips tampil real-time di mobile dan dashboard, dengan narasi Bahasa Indonesia yang dapat dipahami koordinator non-teknis. |

### 14.3 Metode Pelaksanaan

- **Durasi**: Satu sesi berurutan selama 4 jam pada minggu ke-8 fase MVP.
- **Penguji eksternal**: 5 petugas BPBD representatif (alternatif jika tidak memungkinkan: mahasiswa STEI sebagai proxy yang dibrief tentang konteks BPBD).
- **Parameter observasi**:
  - Waktu penyelesaian per tugas (dengan stopwatch)
  - Jumlah kesalahan input atau klik salah
  - Komentar verbal penguji selama dan setelah sesi
  - Rating subjektif kemudahan pada skala 1–5

### 14.4 Parameter Evaluasi

| Aspek Evaluasi | Indikator | Target | Hasil |
|---|---|---|---|
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |
| [Akan diisi setelah OT&E] | [Akan diisi] | [Akan diisi] | [Akan diisi] |

> Catatan: Bagian ini akan diisi oleh tim pengembang setelah eksekusi OT&E pada minggu ke-8 fase MVP.

### 14.5 Hasil Observasi

> Catatan: Bagian ini akan diisi setelah eksekusi OT&E. Hasil observasi akan mencakup: respons sistem terhadap kondisi pemicu yang disimulasikan, eksekusi kontrol manual via aplikasi, ketahanan saat koneksi diputus, tampilan data real-time di dashboard, dan catatan kendala selama pengujian.

### 14.6 Kesimpulan

> Catatan: Bagian ini akan diisi setelah seluruh pengujian dan evaluasi selesai. Kesimpulan akan mencakup: apakah sistem Log-Shield menunjukkan performa yang stabil dan dapat diandalkan dalam skenario operasional dasar; apakah seluruh fungsi utama (F01–F10) berjalan sesuai ekspektasi; apakah diperlukan revisi atau penyempurnaan lebih lanjut sebelum deployment pilot; dan apakah sistem siap dimanfaatkan dalam skala target yang direncanakan (1 kabupaten BPBD pilot pada fase pasca-MVP).

---

*Dokumen ini diekstrak dari Kelompok 09 — Deliverable 4 Log-Shield, II3240 Rekayasa Sistem dan Teknologi Informasi, Institut Teknologi Bandung, 2026.*

# Dataset Gunung Meletus

Folder ini berisi dataset skenario erupsi gunung api di Indonesia dan sudah mengikuti schema canonical Log-Shield.

## Basis Kejadian

Data dibuat dari beberapa snapshot lokal:

- Erupsi Gunung Lewotobi Laki-laki, Flores Timur, NTT: 7, 8, 22, dan 27 November 2024.
- Erupsi Gunung Ibu, Halmahera Barat, Maluku Utara: 18 dan 19 Januari 2025.
- Erupsi Gunung Ruang, Sulawesi Utara: data pengungsi kampung terdampak.

## File

- `gunung_meletus_pengungsi.csv`: normalisasi snapshot pengungsi dari file sumber.
- `logshield_gunung_meletus.csv`: dataset canonical harian per posko dan item logistik.

## Item Logistik Tambahan

Selain item umum seperti beras, air, selimut, dan hygiene kit, skenario gunung meletus menambahkan item khas erupsi:

- `masker`
- `obat_ispa`
- `popok_bayi`
- `pembalut`
- `protein_kaleng`
- `tikar`

## Pola Data

Pola time series dibuat untuk 45 hari per posko:

- fase awal erupsi memiliki kebutuhan lebih tinggi;
- hari abu vulkanik meningkatkan kebutuhan masker dan obat ISPA;
- stok masuk secara periodik;
- distribusi tidak selalu memenuhi seluruh request;
- kebutuhan dipengaruhi jumlah pengungsi, bayi, balita, lansia, ibu hamil, ibu menyusui, dan disabilitas.

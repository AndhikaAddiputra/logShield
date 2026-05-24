# IoT/ESP32 — Panduan Testing

> Catatan: Kode firmware ESP32 berada di repository terpisah.
> Panduan ini untuk referensi parameter test saat integrasi.

## 1. Akurasi Load Cell HX711

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Akurasi ±gram | ±5g dari berat referensi | Letakkan beban kalibrasi (100g, 500g, 1kg), bandingkan pembacaan |
| Linieritas | R² > 0.99 | 5 titik beban, regresi linear |
| Drift suhu | < 2g/°C | Ukur di 25°C dan 35°C |

## 2. Latensi MQTT

| Metrik | Target | Cara Ukur |
|--------|--------|-----------|
| Publish time (ESP32 → Broker) | < 500ms p95 | `millis()` sebelum dan sesudah `client.publish()` |
| End-to-end (ESP32 → Backend) | < 2s p95 | Timestamp di payload vs `created_at` di CouchDB |
| Reconnect time | < 5s | Matikan WiFi, hidupkan lagi, ukur sampai `on_connect` |

## 3. NVS Buffer (Offline)

| Skenario | Langkah | Expected |
|----------|---------|----------|
| Offline 1 jam | Matikan broker, biarkan ESP32 jalan | Data tersimpan di NVS, tidak hilang |
| Setelah reconnect | Nyalakan broker lagi | Semua data terkirim, urut sesuai timestamp |
| Buffer overflow | Isi > 100 records tanpa koneksi | Record lama di-overwrite, tidak crash |

## 4. Deep Sleep

| Metrik | Target |
|--------|--------|
| Konsumsi saat sleep | < 50µA |
| Wake interval akurasi | ±1 detik dari konfigurasi |
| Data setelah wake | Tidak ada data korup |

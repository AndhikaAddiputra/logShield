# Mobile App — Panduan Testing Manual

## 1. Offline 72 Jam

| # | Langkah | Expected |
|---|---------|----------|
| 1 | Login, biarkan data termuat penuh | Dashboard, posko, request muncul |
| 2 | Aktifkan Airplane Mode | Aplikasi tetap bisa di-navigasi |
| 3 | Buka DashboardPage | Data dari localStorage masih tampil |
| 4 | Buka LogisticsPage | Daftar request dari cache muncul |
| 5 | Matikan Airplane Mode setelah 5 menit | Aplikasi kembali normal tanpa error |

## 2. SQLite Sync

| # | Langkah | Expected |
|---|---------|----------|
| 1 | Online, login | Data tersimpan ke SQLite lokal |
| 2 | Airplane Mode, buat request baru | Request tersimpan di SQLite, muncul di list lokal |
| 3 | Online lagi | Request otomatis dikirim ke backend |
| 4 | Cek web dashboard | Request muncul di halaman Logistics |

## 3. UI Responsiveness

| # | Langkah | Expected |
|---|---------|----------|
| 1 | Rotate device landscape→portrait | Layout menyesuaikan, tidak ada overflow |
| 2 | Slow network (throttle to 3G) | Loading indicator muncul, tidak crash |
| 3 | Scroll panjang di DashboardPage | Smooth scroll, tidak ada lag |

## 4. Android / iOS Build

```bash
cd apps/mobile-app
npx cap sync
npx cap open android   # Build APK
npx cap open ios       # Build IPA via Xcode
```

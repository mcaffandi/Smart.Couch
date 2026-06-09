# Dokumen Rancangan Target & Latihan (Sports Science Logic)

Dokumen ini menjelaskan bagaimana aplikasi **SmartCoach** menghitung persentase pencapaian target, estimasi waktu penyelesaian (ETA), dan mendesain porsi latihan secara medis menggunakan kaidah *Sports Science*.

## 1. Prinsip Dasar Porsi Latihan: 80/20 (Polarized Training)
Aplikasi ini memaksa pengguna untuk membangun *aerobic base* terlebih dahulu (Zona 2) sebelum menambahkan intensitas tinggi. 
- **Lari Santai (Easy Run / Recovery / Long Run Z2):** Menguasai ~80% dari total volume latihan mingguan. Fungsinya untuk membuka kapiler darah, meningkatkan efisiensi mitokondria, dan menurunkan denyut jantung (Resting HR).
- **Lari Intensitas (Tempo / Interval):** Hanya diberikan maksimal 1x seminggu (~20% volume) untuk meningkatkan *Lactate Threshold* dan *VO2Max* tanpa berisiko *overtraining*.
- **Adaptasi Jantung:** Ketika jantung sudah "adem" (efisiensi detak jantung rendah di *pace* yang sama meningkat), sistem baru akan merekomendasikan transisi *pace* atau peningkatan *load*.

## 2. Perbedaan Menu Latihan Spesifik
- **Target 5K:** Puncak jarak *Long Run* dibatasi (maksimal ~60 menit). Fokus pada *speed endurance* (*Tempo Run* 25 menit) untuk mempertahankan kecepatan dalam jarak menengah.
- **Target 10K:** Puncak jarak *Long Run* ditarik lebih panjang (75-90 menit). Sesi *speedwork* menggunakan repetisi pendek yang lebih intens (misal: 5x400m) untuk melatih kapasitas anaerobik dan ketahanan otot kaki.

---

## 3. Logika "Goal Progress" di Dashboard

Untuk memberikan kepuasan instan dan akurasi, kita menggunakan pendekatan hibrida: Kalibrasi manual + Pergerakan kumulatif dari latihan berjalan.

### A. Turun Berat Badan (Weight Loss)
- **Dasar Medis:** Defisit ~7.700 kkal = pembakaran 1 kg lemak tubuh.
- **Metode Hybrid:** 
  1. Pengguna melakukan *Update Berat Badan* saat menimbang untuk kalibrasi.
  2. Sistem mengakumulasi *Kalori Terbakar* setiap selesai lari (Estimasi: `Jarak(km) x Berat(kg) x 1.036`).
  3. Estimasi berat turun secara instan per sesi latihan berdasarkan kalori, lalu dikalibrasi ulang saat input berat manual.
- **Progress (%):** `(Total Defisit Kalori Tercapai / Target Total Kalori) x 100%`.
- **ETA:** Berdasarkan rata-rata kalori terbakar per minggu (Minggu tersisa = Sisa Kalori Target / Kalori Terbakar Mingguan).

### B. Turun HR (Membangun Kapasitas Aerobik Jantung)
- **Dasar Medis:** Membangun pembuluh darah kapiler baru butuh sekitar 40-50 jam volume akumulasi latihan di Zona 2 (Detak Jantung Rendah).
- **Progress (%):** `(Total Jam Lari di Zona 2 / 50 Jam) x 100%`.
- **ETA:** Berdasarkan akumulasi rata-rata jam Zona 2 per minggu.

### C. Race Target (5K / 10K / Marathon)
- **Dasar Medis:** Kesiapan jarak tempuh dilihat dari *Peak Long Run* (Jarak maksimal lari terjauh dalam 1 sesi di bulan terakhir).
- **Progress (%):** `(Jarak Peak Long Run Saat Ini / Jarak Peak Target) x 100%`. *(Contoh: Target Marathon butuh peak 32km).*
- **ETA:** Prinsip adaptasi jaringan ikat dan tulang (*Rule of 10%*). Estimasi waktu didapat dari: `(Target Peak - Current Peak) / Peningkatan Jarak Mingguan yang Direkomendasikan`.

### D. Maintenance / Kesehatan (Menjaga Kebugaran)
- **Dasar Medis:** Berdasarkan rekomendasi Badan Kesehatan Dunia (WHO).
- **Target:** 150 menit kardio intensitas sedang per minggu.
- **Progress (%):** `(Total menit latihan minggu ini / 150 menit) x 100%`.
- **ETA:** Bersifat persisten (terus diulang setiap minggu). Status berupa indikator ketercapaian (misal: *"Kurang 45 Menit"*).

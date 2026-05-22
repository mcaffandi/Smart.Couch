# SmartCoach AI - Project Resume / Log

Dokumen ini berisi rangkuman fitur dan perubahan yang telah diimplementasikan pada project SmartCoach AI.

## Fitur Utama yang Telah Selesai
1. **Local & Privacy First**: Semua data disimpan di dalam `localStorage` browser. Tidak ada data yang dikirim ke server. Keamanan dan privasi data 100% terjaga.
2. **Multi-Profile Support**: Bisa membuat banyak profil pengguna di satu browser.
3. **Data Importer**:
   - Mendukung file **Garmin Export (.zip)** (Otomatis ekstrak data lari dan tidur).
   - Mendukung file **Strava/General (.gpx)** (Membaca jarak, durasi, heart rate, dan GPS rute).
4. **Dashboard Analitik**:
   - Menampilkan total jarak, sesi, rata-rata HR, dan Max HR aktual.
   - Grafik tren lari dan persentase Zona HR (Z1-Z5).
   - Korelasi antara skor tidur di hari lari vs hari tidak lari.
5. **Rencana Latihan (Training Plan)**:
   - Generate jadwal lari mingguan yang disesuaikan dengan Goal (Marathon, 10K, Turun HR, dll), Umur, Target Pace, dan Hari Latihan yang dipilih.
   - Cross-training otomatis (Yoga, Core, Recovery) di hari istirahat.
6. **Riwayat Lari (Run History) & Route Minimap**:
   - Menampilkan daftar riwayat lari.
   - Secara dinamis menggambar **Minimap Rute Lari** berbasis garis lintang/bujur (SVG path) langsung dari file GPX.
7. **Race Prediction**:
   - Prediksi waktu untuk 5K, 10K, Half Marathon, dan Full Marathon berdasarkan best pace latihan terakhir menggunakan rumus Pete Riegel.
8. **UI/UX Aesthetics**:
   - Desain Dark Mode modern (vibrant colors, glassmorphism, rounded corners).
   - Animasi mikro dan *full-screen upload overlay*.

---

## Log Aktivitas & Progress (Terbaru)

### 📅 21 Mei 2026

#### **Step 1: Konfigurasi Git Ignore**
- **Deskripsi**: Menambahkan folder `resume/` ke dalam `.gitignore` di root folder agar file log/resume lokal ini tidak di-push ke git.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 19:18:16 WIB

#### **Step 2: Perbaikan Bug Presistensi Modal Profil**
- **Deskripsi**: Memperbaiki tombol "✓ Simpan" pada modal profil (`src/App.jsx`) agar memanggil fungsi `saveAndSyncData`. Sebelum perbaikan, perubahan nama tampilan, umur, berat, tinggi, dan jenis kelamin yang disimpan lewat modal hanya ter-update di state React dan akan hilang (ter-reset) jika halaman di-refresh.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 19:18:21 WIB

#### **Step 3: Pengujian Fungsionalitas & Verifikasi Sinkronisasi**
- **Deskripsi**: Melakukan pengujian fungsionalitas login dan modal profil via browser otomatis. Berhasil masuk dengan akun Anonim (Firebase Auth), mengisi data profil baru (Budi, 30 tahun, Pria, 70kg, 175cm), melihat kalkulasi BMI otomatis yang akurat (22.9 - Normal), melakukan refresh halaman, dan memverifikasi data profil tersebut berhasil tersimpan permanen di Local Storage & tersinkronisasi.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 19:22:36 WIB

#### **Step 4: Desain Ulang Landing Page & Bento Grid Layout**
- **Deskripsi**: Mengubah tampilan landing page generik menjadi desain premium mirip produk SaaS modern. Mengimplementasikan pola grid titik-titik (dot-grid) pada latar belakang, efek sorotan warna ungu, memperbaiki konflik CSS kelas `.btn-secondary` dari `index.css` dengan membuat `.btn-outline-landing`, mendesain ulang tata letak fitur menggunakan Bento Grid yang simetris lengkap dengan visual preview pada masing-masing card (file import dengan format `.zip`, `.gpx`, dan `.xlsx`/`.csv`, dial skor tidur, tabel waktu race, dan kalender), serta memperbaiki tumpang tindih (overlap) teks "Ready to Run" dengan memisahkannya ke wadah vertikal di bawah lingkaran dial.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 19:51:44 WIB

#### **Step 5: Penambahan Kebijakan Privasi & Label Versi Aplikasi**
- **Deskripsi**: Menambahkan informasi penjaminan privasi data latihan dan profil pengguna pada halaman Landing Page dan Login Screen (ikon gembok hijau). Menampilkan label versi aplikasi (`v2.0.0`) di bagian footer Landing Page dan bagian bawah sidebar utama agar pengguna mengetahui versi rilis sistem yang aktif.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 20:13:01 WIB

#### **Step 6: Integrasi Banner Kesiapan Latihan di Dashboard Utama**
- **Deskripsi**: Menampilkan notifikasi / banner Kesiapan Latihan (Training Readiness) berdasarkan skor tidur terbaru langsung di bagian atas tab menu "Dashboard" (dashboard utama). Memudahkan pengguna melihat kesiapan fisiknya seketika setelah login tanpa harus masuk ke tab "Analisis Tidur" terlebih dahulu.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 20:24:31 WIB

#### **Step 7: Redesain Widget Kesiapan Latihan Menyelaraskan dengan Tema Landing Page**
- **Deskripsi**: Merancang ulang tampilan notifikasi Kesiapan Latihan di tab "Dashboard" dan "Analisis Tidur" menggunakan komponen `.readiness-card` premium. Menghadirkan dial lingkaran (`.readiness-dial`) beserta teks status pemulihan di bawahnya dan efek spotlight ungu redup yang selaras dengan estetika Landing Page.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 20:28:39 WIB

#### **Step 8: Standarisasi Skema Warna Kesiapan Latihan & Tidur (Aturan Golden Ratio 60-30-10)**
- **Deskripsi**: Menyamakan skema warna indikator status pemulihan dengan menerapkan aturan 60-30-10. Menggunakan warna latar gelap sebagai 60% dominan, warna abu-abu netral untuk kartu/border/teks sebagai 30% sekunder, dan warna aksen yang tajam (Emerald Green `#10b981` untuk Prima, Amber `#f59e0b` untuk Cukup, dan Red `#ef4444` untuk Rendah) sebagai 10% aksen fungsional untuk memudahkan pemahaman pengguna.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 20:31:10 WIB

#### **Step 9: Pengurangan Kebisingan Visual (Visual Noise) Pada Riwayat Tidur**
- **Deskripsi**: Menghapus pewarnaan latar belakang dan border dinamis pada seluruh kartu riwayat tidur di tab "Analisis Tidur". Kartu kini menggunakan warna abu-abu gelap netral yang seragam, sedangkan warna indikator status (hijau/amber/merah) hanya diterapkan pada teks angka skor tidur saja untuk kenyamanan membaca pengguna.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-21 20:32:17 WIB

### 📅 22 Mei 2026

#### **Step 10: Dukungan Bilingual Penuh (ID/EN)**
- **Deskripsi**: Menambahkan fitur multi-bahasa (Bahasa Indonesia dan English) secara menyeluruh pada aplikasi, termasuk Landing Page, form otentikasi, dashboard analitik, rencana latihan, dan modal ekspor kartu pencapaian. Pilihan bahasa tersimpan otomatis di `localStorage`.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-22 18:51:00 WIB

#### **Step 11: Algoritma Kesiapan Latihan Berbasis Sports-Science**
- **Deskripsi**: Meningkatkan algoritma kesiapan latihan yang sebelumnya statis menjadi model dinamis yang mengevaluasi periode istirahat sejak lari terakhir. Mengkalkulasi penalti kelelahan dan bonus pemulihan bertahap untuk akurasi data yang lebih presisi.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-22 18:51:00 WIB

#### **Step 12: Peningkatan Interaksi Input Profil Sidebar**
- **Deskripsi**: Mengganti kolom input teks konvensional untuk variabel umur dan target pace dengan komponen Range Slider yang interaktif dan presisi, lengkap dengan lencana status dinamis.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-22 18:51:00 WIB

#### **Step 13: Redesain Visual Sidebar & Ikon Toggle**
- **Deskripsi**: Meningkatkan estetika visual pada komponen sidebar, mendesain ulang kartu akun aktif dengan gradasi latar belakang dan *hover glow* ungu. Mengganti ikon toggle panel dengan ikon yang lebih intuitif (*double chevron* & *hamburger menu*).
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-22 18:51:00 WIB

#### **Step 14: Template Data Excel Dinamis & Bug Fixes**
- **Deskripsi**: Melokalisasi penamaan berkas `.xlsx` dan sheet ekspor Excel. Selain itu, menyelesaikan sejumlah perbaikan (*bug fixes*) termasuk tag HTML yang tidak tertutup, penyelaras pewarnaan dial kesiapan latihan, serta *drop shadow* pada teks kanvas hasil ekspor.
- **Status**: Selesai
- **Waktu Selesai**: 2026-05-22 18:51:00 WIB

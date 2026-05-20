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

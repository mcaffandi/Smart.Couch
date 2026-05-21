# EnduraUP — Changelog

---

## [Uncommitted] — 2026-05-21 · Firestore Database Sync & Landing Page Refactor

### ✨ Fitur Baru

#### Widget Kesiapan Latihan (Training Readiness) Premium di Dashboard & Analisis Tidur
- Mengintegrasikan widget informasi Kesiapan Latihan (`.readiness-card`) langsung di bagian teratas tab menu "Dashboard" dan "Analisis Tidur".
- Menampilkan visual dial progress melingkar (`.readiness-dial`) beserta teks status pemulihan di bawahnya (Prima / Cukup / Rendah) dan efek spotlight ungu redup yang senada dengan Landing Page.
- Menerapkan aturan **Golden Ratio Warna (60-30-10)**: 60% warna latar belakang gelap netral, 30% warna panel sekunder abu-abu, dan hanya 10% warna aksen kontras (Emerald Green `#10b981` untuk Prima, Amber `#f59e0b` untuk Cukup, Red `#ef4444` untuk Rendah) guna menjaga kenyamanan membaca pengguna tanpa membingungkan mata.

#### Fitur Ekspor Gambar Stats/Pencapaian (Square Card Generator)
- **Deskripsi**: Menambahkan ikon tombol "Bagikan" minimalis di samping judul utama halaman yang aktif ketika user memiliki data aktivitas.
- **Kemampuan**: Membuka modal interaktif yang secara dinamis me-render gambar berukuran 1:1 (Square, resolusi tinggi 1080x1080) menggunakan HTML5 Canvas. Mendukung Web Share API untuk membagikan kartu secara native langsung ke WhatsApp/Instagram tanpa harus mengunduh berkas terlebih dahulu.
- **Kustomisasi & Tema Ceria (Sunrise Fun)**: Pengguna dapat memilih tipe statistik serta mengubah skema warna/tema. Selain tema gelap (Sleek Dark, Cyberpunk, Amethyst), sekarang tersedia tema terang yang segar dan ceria: **"Sunrise Fun"** dengan gradasi warna peach-pink-orange yang lembut dan elegan.
- **Anti Overlap & Filter Tahunan**: Tata letak nilai dan satuan (unit) disusun secara vertikal/terpisah untuk menghindari teks bertumpuk akibat ketidaksesuaian pengukuran lebar font custom. Data ringkasan performa secara otomatis difilter per tahun (mengikuti tahun aktif terbaru yang memiliki data di database).
- **Personalisasi, Watermark, & Grid**: Menyertakan nama profil atlet secara langsung (misal: `AFANDI` tanpa prefix label `ATLET:` yang memakan ruang), menyematkan tautan website `enduraup.vercel.app` di footer, menggambar pola grid latar belakang yang canggih (technical grid overlay), serta menambahkan garis pembatas horizontal tipis untuk memisahkan header dan statistik agar terlihat sangat terstruktur dan rapi.
- **Tipografi Premium**: Menurunkan ketebalan font (*font-weight*) yang terlalu tebal (dari black 900 / extra-bold 800 menjadi bold 700 / semi-bold 600) untuk tampilan teks yang jauh lebih bersih, modern, dan tidak padat.

#### Penjaminan Privasi Data & Keamanan (Privacy Policy Note) & Versi Aplikasi
- Menambahkan jaminan privasi data aktivitas lari dan tidur langsung pada footer Landing Page dan form di Login Screen.
- Memasang ikon gembok hijau untuk menegaskan bahwa data pengguna tersimpan aman, terenkripsi, dan tidak dibagikan atau dijual ke pihak ketiga.
- Menampilkan label versi aplikasi (`v2.0.0`) di bagian footer Landing Page dan bagian bawah sidebar utama.
- **Pembersihan Form Login**: Mengubah input login dan daftar agar selalu bertipe `email` dengan label `Email Address` dan placeholder abu-abu `nama@email.com` baik ketika Firebase aktif maupun tidak. Hal ini menghindari autofill browser yang memaksa mengisi teks username mentah `admin` saat halaman pertama kali dimuat.

#### Desain Ulang Landing Page & Bento Grid Layout
- Mengganti layout landing page yang sebelumnya tampak generik (AI-generated) menjadi layout premium ala SaaS modern.
- Mengintegrasikan latar belakang pola grid titik-titik (dot-grid overlay) dan efek sorotan (spotlight glow) yang elegan.
- Menyusun fitur utama ke dalam tata letak **Bento Grid** yang simetris dan seimbang, lengkap dengan visualisasi preview:
  - Card Importer Data: preview berkas `.zip`, `.gpx`, dan `.xlsx` / `.csv` (Excel).
  - Card Kalender Latihan: preview hari latihan lari.
  - Card Korelasi Tidur: dial skor pemulihan berbentuk radial.
  - Card Prediksi Race: tabel perkiraan waktu lari 5K, 10K, dan Full Marathon.

#### Integrasi Database Cloud dengan Firebase Firestore
- Sinkronisasi profil dan data aktivitas lari/tidur otomatis ke cloud Firestore (koleksi `users`).
- Otomatis membuat dokumen pengguna baru di Firestore menggunakan data lokal jika dokumen belum ada di cloud.
- Penghapusan dokumen dari Firestore secara otomatis jika profil pengguna dihapus dari sistem.

#### Otentikasi Cloud (Firebase Auth)
- Login terintegrasi menggunakan Google Sign-In, Email/Password, dan masuk secara Anonim.
- Notifikasi Toast real-time untuk memberi tahu status sukses, warning, atau error otentikasi.

### 🐛 Bug Fix

#### Presistensi Penyimpanan Modal Profil
- **Masalah**: Menekan tombol "✓ Simpan" pada modal profil hanya memperbarui state React di memori. Data tidak pernah disimpan ke `localStorage` maupun Firestore, sehingga data hilang saat halaman di-refresh.
- **Fix**: Mengubah handler klik tombol "✓ Simpan" agar membuat objek profil yang diperbarui lengkap dan memanggil `saveAndSyncData(updated)`. Perubahan data Display Name, Berat, Tinggi, Umur, dan Jenis Kelamin kini tersimpan secara permanen.

#### Overlap Teks "Ready to Run" di Landing Page
- **Masalah**: Teks status pemulihan "Ready to Run" pada visualisasi dial skor tidur terpotong atau menabrak kurva batas bawah dial berbentuk lingkaran.
- **Fix**: Mengeluarkan label teks tersebut dari dalam lingkaran dial skor tidur, dan membungkus keduanya menggunakan susunan kolom flex vertikal agar terpisah dan terbaca dengan sempurna.

#### Visual Noise di Kartu Riwayat Tidur
- **Masalah**: Kartu-kartu riwayat tidur di tab Analisis Tidur diwarnai penuh pada bagian border dan latar belakangnya sesuai nilai skor (hijau/kuning/merah). Karena jumlah kartu sangat banyak, variasi warna yang bertumpuk dalam satu grid menimbulkan distraksi dan ketidaknyamanan visual.
- **Fix**: Menghapus pewarnaan border & background dinamis pada setiap kartu riwayat tidur agar seragam menggunakan warna netral sekunder. Warna indikator status (hijau/kuning/merah) kini hanya disematkan pada teks angka skor tidur saja.

#### Git Ignore untuk Resume
- Menambahkan direktori `resume/` ke dalam `.gitignore` di root project agar log pengerjaan proyek lokal tidak ikut ter-push ke repository git.



---

## [96b215fd] — 2026-05-21 · Profile UX Overhaul

### ✨ Fitur Baru

#### Profil Modal — View / Edit Mode
- Modal profil kini punya **dua mode**:
  - **View Mode** (default): menampilkan data profil sebagai stat chip — Umur, Kelamin, Berat, Tinggi
  - **Edit Mode**: muncul setelah klik tombol "Edit Profil", menampilkan form input lengkap
- Klik di luar modal atau tombol × untuk menutup tanpa menyimpan
- Klik "Batal" di edit mode kembali ke view mode tanpa perubahan

#### BMI Otomatis
- Dihitung real-time dari Berat (kg) dan Tinggi (cm)
- Muncul di **view mode** dan **edit mode** (live update)
- Kategori berwarna:
  - 🔵 Underweight `< 18.5`
  - 🟢 Normal `18.5 – 24.9`
  - 🟡 Overweight `25 – 29.9`
  - 🔴 Obese `≥ 30`

#### Field Profil Baru
| Field | Tipe | Keterangan |
|---|---|---|
| Nama Tampilan | Text | Ditampilkan di badge & header modal |
| Akun / Email | Read-only | Tidak bisa diubah |
| Umur | Number | 10–100 tahun |
| Jenis Kelamin | Select | Pria / Wanita |
| Berat | Number | 30–200 kg (step 0.5) |
| Tinggi | Number | 100–250 cm |

### 🐛 Bug Fix

#### Overlay Tidak Menutupi Sidebar
- **Masalah**: Modal dengan `position: fixed` tidak bisa menutupi `.sidebar` yang `position: sticky` karena sticky menciptakan stacking context baru
- **Fix**: Tambah CSS class `.profile-modal-backdrop` dengan `z-index: 999999` di level stylesheet global, memastikan overlay benar-benar fullscreen

#### Badge Tidak Bisa Diklik
- **Masalah**: `onClick` pada badge masih memanggil `setEditingName()` — state yang sudah dihapus — menyebabkan error silent
- **Fix**: Diganti ke `setEditDraft({})` + `setProfileEditMode(false)` + `setShowProfileModal(true)`

### 🎨 UI / UX

- **Badge sidebar** — hapus icon pensil (SVG), tampilan lebih bersih
- **Modal design** — flat dark card menggunakan CSS variables app (`var(--bg-surface)`, `var(--border)`, `var(--accent-purple)`) konsisten dengan komponen lain
- **Sidebar age & pace** — tampil abu-abu `—` jika nilai `null` (belum diisi)

### 🏗️ Perubahan Teknis

- Tambah state: `weight`, `height`, `gender`, `profileEditMode`
- `applyProfileChanges` menyimpan semua field baru ke localStorage
- `switchUser` dan Firebase auth listener memuat semua field profil baru
- `editDraft` sebagai objek staging — hanya di-commit ke state saat "Simpan"

---

## File yang Diubah

| File | Perubahan |
|---|---|
| `src/App.jsx` | State baru, modal view/edit, badge fix |
| `src/index.css` | `.profile-modal-backdrop` class, fix `.sidebar` transition |
| `src/AICoach.jsx` | Minor (dari sesi sebelumnya) |
| `src/LandingPage.jsx` | Minor (dari sesi sebelumnya) |
| `src/LoginScreen.jsx` | Minor (dari sesi sebelumnya) |
| `src/Logo.jsx` | Minor (dari sesi sebelumnya) |
| `src/RacePrediction.jsx` | Minor (dari sesi sebelumnya) |
| `src/RunHistory.jsx` | Minor (dari sesi sebelumnya) |
| `src/TrainingPlan.jsx` | Minor (dari sesi sebelumnya) |

---

## To Do / Next

- [x] Simpan profil ke Firebase Firestore (saat ini hanya localStorage)
- [ ] Validasi input: tidak bisa simpan umur < 10 atau tinggi > 250
- [ ] Foto/avatar upload untuk profil
- [ ] Umur & pace di sidebar otomatis grey saat user baru (clear localStorage)
- [ ] Chunk size optimization: bundle saat ini ~1.2MB (warning Vite > 500kB)

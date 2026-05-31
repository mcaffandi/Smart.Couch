# EnduraUP — Changelog

---

## [Uncommitted] — 2026-05-31 · Dynamic Recovery, Notification Center & Analytics UI

### ✨ Fitur Baru & Optimasi
- **Notification Center (Lonceng Notifikasi)**: Menambahkan menu *dropdown* notifikasi di Header Dashboard dengan tombol "Tandai Semua Dibaca" untuk mencatat riwayat pembaruan (misal penambahan waktu pemulihan saat sinkronisasi Strava selesai).
- **Time-Range Filter pada Trend Jarak**: Melengkapi grafik "Tren Jarak" (*TrendChart*) dengan tombol rentang waktu dinamis (*Semua, 1Y, 6M, 3M, 1M, 1W*). Mengubah logika pengelompokan secara otomatis menjadi **Harian (Daily)** jika *range* yang dipilih adalah 1M atau 1W, sehingga *chart* tetap menunjukkan pergerakan data yang akurat alih-alih garis lurus kosong.
- **Kalkulasi Pemulihan (Recovery) Dinamis ala Garmin**:
  - Mengubah titik mulai hitung mundur (*countdown*) waktu pemulihan dari awal lari menjadi **selesai lari** (`startTimeLocal + duration`).
  - Menyesuaikan sensitivitas *multiplier* zona *Heart Rate* menjadi lebih realistis dan linier (Zona 1/2 nambah lebih sedikit, persis seperti Garmin EPOC).
  - Teks `Pemulihan: Xh` dengan emoji diganti menjadi *badge premium* `Sisa: Xh` menggunakan ikon *Hourglass* SVG kustom.
- **Peningkatan Input Manual yang Organik**:
  - **Manual Run**: Menambahkan kolom **Waktu (Jam)** sehingga sinkronisasi *recovery decay* lebih presisi (sebelumnya sistem selalu mematok lari manual terjadi pada pukul 00:00).
  - **Manual Sleep**: 
    - Input durasi dipecah menjadi dua kolom terpisah: **Jam** dan **Menit** (tidak perlu kalkulasi desimal manual).
    - Memunculkan nilai *Score* di keterangan tombol (misal: "Score: 90") agar *user* lebih memahami kualitas tidurnya.
    - Mengintegrasikan fungsi **Organic Variance** (variasi acak -4 hingga +4) saat simulasi nilai, menjadikan grafik riwayat tidur manual terlihat bervariasi dan natural, layaknya membaca sensor dari jam tangan asli.

---

## [Uncommitted] — 2026-05-30 · Production UI Polish, Domain Switch & Share Card Filter

### ✨ Fitur Baru & Optimasi
- **Filter Rentang Waktu (Share Card)**: Menambahkan tombol filter dinamis (7 Hari, 1 Bulan, 6 Bulan, 1 Tahun) khusus untuk *template* Ringkasan Stats di modal Bagikan Pencapaian. Canvas akan dirender ulang secara *real-time* berdasarkan pilihan pengguna.
- **Transisi Domain Resmi**: Melakukan *find & replace* secara menyeluruh untuk mengganti domain lama `enduraup.vercel.app` menjadi domain *production* resmi `www.enduraup.space`. Ini mencakup tautan watermark di gambar canvas, teks *caption* *share* media sosial, tombol Salin Tautan, hingga *intent* WhatsApp/Twitter.

### 🎨 UI / UX (Premium Emoji-less Redesign)
- **SVG Flame Premium**: Menghapus seluruh penggunaan emoji bawaan OS (🔥) pada *Streak Badge* (Training Plan) dan tombol reaksi *Burn* (Komentar Blog) untuk menghindari fragmentasi desain antar perangkat. Emoji tersebut diganti secara permanen dengan *vector icon* SVG kustom yang lebih ramping, seragam, dan menyatu sempurna dengan skema warna aplikasi.
- **Pembersihan Teks Pesan**: Menghapus berbagai emoji dari teks pesan status konsistensi (*consistency message*) dan teks sapaan lainnya untuk mematuhi arahan desain UI/UX yang profesional, minimalis, dan *clean* (emoji-less).

### 🐛 Bug Fix
- **Canvas Re-render Fix**: Memasukkan `shareStatsPeriod` ke dalam struktur *dependency array* milik hook `useEffect` generator canvas. Perbaikan kritis ini memastikan *preview* gambar otomatis diperbarui saat pengguna mengganti filter rentang waktu.

---

## [Uncommitted] — 2026-05-29 · SEO Enhancements & PWA Optimization

### ✨ Fitur Baru & Optimasi
- **SEO & Meta Tags Tambahan**: Menambahkan metadata terstruktur (JSON-LD) `schema.org` untuk `WebApplication` agar pencarian Google lebih akurat.
- **PWA & Mobile Web App**: Menambahkan `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, dan mematikan `format-detection` untuk experience PWA yang lebih baik di iOS dan Safari.
- **Preconnect Fonts**: Menambahkan tag `preconnect` untuk Google Fonts guna mempercepat pemuatan font awal.
- **Open Graph**: Menambahkan `og:locale` dan `og:site_name` untuk meningkatkan *shareability* di media sosial.

---

## [Uncommitted] — 2026-05-27 · Pre-Release Polish & Architecture Simplification

### ✨ UI / UX Enhancements

#### Landing Page Redesign & Bento Grid
- Mengembalikan desain ulasan pelari (Testimonials) dari gaya Play Store *list* vertikal kembali ke tata letak **Bento Grid (Glassmorphism)** yang jauh lebih profesional dan elegan untuk Landing Page.
- Mengganti deretan *brand icon* yang terlihat kurang menyatu menjadi **Logotype bersih berbasis teks** (Garmin, Strava, Polar, Coros, Apple Watch, Suunto) dengan peningkatan `font-weight` dan presisi *letter-spacing*.
- Menyesuaikan proporsi *margin* dan *padding* antar-seksi agar transisi antar komponen (Fitur, Wall of Love, Footer) terlihat jauh lebih mengalir (*seamless*).

#### Sidebar & Feedback Modal
- Merapatkan jarak bawah (*footer gap*) pada sidebar (tombol Reset, Traktir, Logout) agar tidak ada kekosongan berlebih yang dihasilkan oleh *gap* bawaan sidebar.
- Menambahkan tombol interaktif **"Lihat Semua"** pada Feedback Modal. Modal akan memanjang secara mulus (*smooth expand*) dan langsung menampilkan seluruh *featured reviews* dari Firebase saat diklik.

### 🏗️ Perubahan Teknis & Refactoring

#### Penghapusan Fitur "Ajari AI"
- Mengembalikan AI Coach murni sebagai sistem **Hybrid Chatbot** tanpa campur tangan *user-generated rules* untuk menjaga keprofesionalan bot.
- Menghapus fitur "Ajari AI" sepenuhnya, termasuk elemen antarmuka (*form* input, tombol *toggle*), struktur *state* React terkait, hingga fungsi sinkronisasi *database* `bot_settings` di Firestore.
- Penanganan percakapan murni ditangani otomatis melalui kombinasi Regex *Local Dictionary* (instan) dan Groq LLM API (dinamis).

---

## [Uncommitted] — 2026-05-26 · AI Coach Training, Privacy Policy, & UI Enhancements

### ✨ Fitur Baru

#### "Ajari AI" (Train Bot ala SimSimi)
- Menambahkan fitur tersembunyi/kustom untuk melatih respons AI Coach.
- Menggunakan `customDictionary` yang terhubung langsung dengan koleksi `bot_settings/dictionary` di Firebase Firestore.
- Menyediakan UI *form* yang rapi untuk memasukkan kata kunci (trigger) dan jawaban kustom.

#### Kebijakan Privasi (Privacy Policy)
- Menambahkan tautan dan *modal pop-up* Kebijakan Privasi di layar Login.
- Memenuhi standar *compliance* untuk OAuth dan keamanan aplikasi publik dengan merinci pengumpulan, penggunaan, penyimpanan, dan hak penghapusan data.

#### Penghapusan Akun Permanen (Account Deletion)
- Menambahkan tombol "Hapus Akun" dengan peringatan merah di menu Profil.
- Secara otomatis mencabut otentikasi Firebase Auth (`deleteUser`) dan membersihkan seluruh rekam jejak aktivitas di Firestore serta `localStorage`.

#### Tombol Donasi Neon
- Menambahkan tombol "Traktir Kopi" di *sidebar* yang mengarah ke Saweria.
- Memberikan kelas CSS animasi kustom `neon-donate` dengan efek *pulsing glow* dan *hover* yang elegan bergaya *gold/amber*.

### 🎨 UI / UX

#### Konsistensi Sistem Icon (Lucide-React)
- Menghapus penggunaan emoji robot (🤖) dan *inline SVG* bawaan yang terkesan jadul/murah.
- Mengganti seluruh *icon* AI Coach dengan *vector icon* premium dari pustaka `lucide-react` (`Bot`, `MessageSquare`, `Send`, `X`, `Brain`, `Sparkles`).

#### Penyederhanaan Toggle Tema
- Menghapus opsi tema "System" (💻) untuk meminimalisir beban kognitif pengguna.
- Mengganti emoji (☀️/🌙) dengan *icon* modern (`Sun`/`Moon`).
- Menghapus emoji lambaian tangan (👋) pada sapaan *dashboard* agar teks lebih bersih.

### 🐛 Bug Fix

#### Kalender Adaptif & Parsing Waktu
- **Masalah**: Fitur Kalender gagal memuat (blank) jika data `startTimeLocal` dari API Garmin masuk dalam format Date Object alih-alih string murni.
- **Fix**: Mengamankan *parsing* di `utils.js` agar mampu memproses format Date, angka *timestamp*, maupun *string* sehingga tidak lagi *error* saat *rendering*.

---

## [Uncommitted] — 2026-05-23 · Sidebar UX Simplification & Profile Settings Centricity

### 🎨 UI / UX

#### Pembersihan Sidebar Utama
- Memindahkan semua pengaturan target dan rutinitas (Goal Utama, Program Style, Target Pace, dan Hari Latihan) yang sebelumnya menumpuk di sidebar kiri (menyebabkan clutter visual) ke dalam **Modal Edit Profil**.
- Sidebar kini tampil lebih rapi, minimalis, dan difokuskan murni untuk navigasi, informasi akun aktif, serta fungsionalitas impor data (upload ZIP/GPX/Excel).
- Tombol aksi "Apply & Analyze" di sidebar dihapus, perannya kini digantikan secara otomatis oleh tombol "✓ Simpan" pada modal profil.

#### Profil Modal yang Lebih Komprehensif
- **View Mode**: Modal profil kini tidak hanya menampilkan data fisik (Umur, Berat, dll), melainkan juga merangkum metrik **Target & Latihan** dalam bentuk grid Stat Card yang rapi.
- **Edit Mode**: Memasukkan opsi dropdown dan slider premium (range slider untuk target pace) untuk pengaturan jadwal latihan ke dalam form edit profil.
- Perubahan setting segera di-apply dan disinkronisasikan ke Firebase / local storage secara instan saat pengguna menekan tombol Simpan di dalam modal profil.

#### Redesain Dashboard Performance Cards
- Menyempurnakan tampilan kartu performa di Dashboard agar terlihat lebih premium dan terstruktur.

---

## [Uncommitted] — 2026-05-22 · Bilingual Support, Sidebar UX Overhaul & Sports-Science Training Readiness

### ✨ Fitur Baru

#### Dukungan Bilingual Penuh (Bahasa Indonesia & English)
- Menambahkan switcher bahasa (ID/EN) di pojok kanan atas sidebar dengan persistensi otomatis di `localStorage`.
- Melokalisasi seluruh bagian aplikasi secara dinamis:
  - **Landing Page**: Header, tombol CTA, bento grid preview cards, jaminan privasi data, dan footer.
  - **Login / Register Screen**: Input form, label, tombol login anonim/social, validasi email/password, dan dialog registrasi.
  - **Dashboard & Analisis**: Menu navigasi tab, profil pengguna (umur/pace/hari latihan), rekomendasi pace lari, grafik jarak bulanan, grafik zona detak jantung, korelasi tidur, histori lari, dan rekomendasi AI Coach.
  - **Rencana Latihan (Training Plan)**: Tabel kalender latihan, status cross-training, serta ekspor berkas kalender format `.ics`.
  - **Ekspor Kartu Pencapaian**: Tombol "Bagikan", slider kustomisasi, petunjuk watermark, dan ekspor visual canvas.

#### Algoritma Kesiapan Latihan Terkini (Current Training Readiness) Dinamis
- Menggantikan visual dial kesiapan latihan statis (sebelumnya hanya membaca skor tidur) dengan model kalkulasi olahraga (*sports-science recovery*) yang dinamis:
  - Menghitung **hari istirahat (Rest Days)** sejak lari terakhir (`daysSinceLastRun`) relatif terhadap **tanggal hari ini (tanggal lokal sistem)** alih-alih `latestSleepDate` untuk menghindari anomali.
  - Memberikan penyesuaian skor berupa penalti kelelahan aktif jika baru lari hari ini (`-20`) atau kemarin (`-10`).
  - Memberikan bonus pemulihan bertahap untuk istirahat 3 hari (`+10%`) dan istirahat $\ge$ 4 hari (`+15%` bonus dengan batas bawah skor minimal `80%` jika skor tidur malam terakhir $\ge 50\%$).
  - Menampilkan keterangan ringkasan kalkulasi secara dinamis baik dalam Bahasa Indonesia maupun English (misal: *"Lo udah istirahat 4 hari. Kesiapan fisik pulih maksimal..."*).

#### Input Profil Sidebar Berbasis Range Slider (Scroll/Tarik)
- Menggantikan input angka umur konvensional yang memiliki bug *aggressive intermediate clamping* dengan **Range Slider Umur** (rentang 10-100 tahun) dilengkapi lencana status dinamis (`31 Tahun` / `Belum diatur`).
- Menggantikan kolom input angka kembar target pace dengan **Range Slider Target Pace** (rentang 3:00/km - 10:00/km) dengan tingkat presisi geser 5 detik (`step="0.083333"`) dan visualisasi lencana penunjuk dinamis.

#### Peningkatan Visual & Desain Premium Sidebar
- **Kartu Akun Aktif**: Mendesain ulang dengan linear gradient latar belakang (`linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))`), efek hover glow ungu, transisi transformasi 3D `translateY(-1px)`, dan indikator sunting (ikon pena).
- **Tombol Toggle Desktop**: Mengubah ikon tombol sembunyikan/collapse panel menjadi ikon **double chevron kiri** (`chevrons-left`), dan ikon tampilkan/expand panel menjadi ikon **menu hamburger** (`menu`).

#### Template Data Excel Lokalisasi Dinamis
- Menyesuaikan format nama berkas Excel yang diunduh (`Template_Data_EnduraUP.xlsx` untuk ID, `EnduraUP_Data_Template.xlsx` untuk EN).
- Melokalisasi nama sheet ("Riwayat Lari" / "Run History", "Kualitas Tidur" / "Sleep Quality", "Panduan Pengisian" / "Instructions Guide"), kolom header, data isian, dan teks panduan pengisian instruksi secara real-time berdasarkan bahasa aktif.

### 🏗️ Perubahan Teknis & Bug Fix
- Memperbaiki tag penutup HTML/JSX pada kontainer `.sidebar-logo` di `App.jsx` yang sebelumnya tidak ditutup sehingga menyebabkan kegagalan compile esbuild pada asides.
- Menyelaraskan pewarnaan dial kesiapan latihan (hijau/kuning/merah) agar sinkron dengan skor kesiapan baru yang telah disesuaikan.
- Menambahkan efek **drop shadow** (`shadowColor: rgba(0,0,0,0.5)`, `shadowBlur: 8`, offset 2px) pada teks brand header canvas ("EnduraUP" dan "AI Running & Recovery Coach") pada tema Sunrise Fun kartu pencapaian agar terbaca dengan jelas di atas background retro sunrise yang cerah.
- Mengubah rujukan profil awal (`DEFAULT_PROFILE` di `utils.js`) agar umur (`age`) dan target pace (`targetPace`) bernilai `null` secara default bagi pengguna baru.
- Menambahkan validasi anti-crash pada pembaca rekomendasi tempo (`getPaceRecommendations`) agar mengembalikan tanda strip `—` saat target pace kosong.
- Menghapus komponen `PaceInput` yang sudah tidak digunakan di `App.jsx` untuk menjaga kebersihan codebase.

---

## [Uncommitted] — 2026-05-21 · Retro Groovy Background & Warm Text Palette

### 🎨 UI / UX

#### Ganti Background Landing Page → Retro Groovy (`retro_sunrise.jpg`)
- Mengganti background solid gelap (`#09090b`) dengan gambar ilustrasi retro groovy bergaya 70s (`/retro_sunrise.jpg`) yang penuh warna — teal, oranye hangat, kuning emas, krem putih, dengan aksen planet Saturnus, roket, dan peace sign.
- Menambahkan **dark warm overlay** `rgba(12, 8, 4, 0.72)` di atas gambar sehingga semua teks tetap terbaca dengan nyaman tanpa harus mencerahkan latar berlebihan.

#### Penyesuaian Warna Teks (Warm Cream Palette)
Seluruh warna teks diubah dari nuansa dingin (`#ffffff`, `#a1a1aa`, `#71717a`) ke nuansa hangat yang serasi dengan palet retro:

| Elemen | Sebelum | Sesudah |
|---|---|---|
| Teks utama (hero, heading) | `#ffffff` | `#fdf6e3` (warm cream) |
| Teks subtitle / body | `#a1a1aa` (abu-abu) | `#d4c9a8` / `#c8b89a` (cream warm) |
| Badge "V2.0 Now Live" | ungu `#c4b5fd` | amber `#fde68a` |
| Badge dot | ungu `#a78bfa` | amber `#f59e0b` |
| Tombol CTA utama | putih solid | gradien amber-oranye `#f59e0b → #e07c24` |
| Tombol "Learn More" | border putih | border cream semi-transparan |
| Logo gradient | `#fff → #a78bfa` | `#fdf6e3 → #f59e0b` |
| Text gradient hero | ungu-biru | `#f59e0b → #ef8c38 → #20b2aa` |
| Bento glass panels | `rgba(20,20,23,0.35)` | `rgba(10,6,2,0.55)` lebih gelap |
| Footer text | `#3f3f46` | `#8a7860` (sepia warm) |

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

### Kesiapan Latihan (Training Load) & Strava Sync
- [x] **Strava Sync Mode di Admin**: Tambahkan opsi konfigurasi `Fast Sync` (ambil 5 aktivitas terbaru saja) vs `Full Sync` di Admin Dashboard.
- [x] **Modifikasi Strava Fetcher**: Sesuaikan `App.jsx` untuk membaca pengaturan mode sync dan mengubah parameter `per_page` API Strava secara dinamis.
- [x] **Kalkulasi Training Load**: Buat logika untuk menghitung beban latihan (Training Load / Recovery Time) secara otomatis dari `Heart Rate` dan `Durasi`.
- [x] **UI Sisa Recovery Time**: Tambahkan badge indikator `Sisa Recovery: X Jam` di komponen Kesiapan Latihan (Readiness).
- [x] **Notifikasi Beban Latihan**: Buat Pop-up Notif setelah sync yang menampilkan penambahan Recovery Time, atau meminta input RPE jika data HR kosong.

### Ekstra
- [x] Simpan profil ke Firebase Firestore (saat ini hanya localStorage)
- [x] Validasi input: tidak bisa simpan umur < 10 atau tinggi > 250
- [x] Foto/avatar upload untuk profil
- [x] Umur & pace di sidebar otomatis grey saat user baru (clear localStorage)
- [x] Chunk size optimization: bundle saat ini ~1.2MB (warning Vite > 500kB)
- [ ] **Blog / Edukasi Artikel (Programmatic SEO)**: Buat fitur artikel Markdown bersumber dari Firestore. Tampilkan di Landing Page & Sidebar Dashboard. Tambahkan fitur CRUD khusus untuk *role* Admin.

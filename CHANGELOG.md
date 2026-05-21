# EnduraUP — Changelog

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

- [ ] Simpan profil ke Firebase Firestore (saat ini hanya localStorage)
- [ ] Validasi input: tidak bisa simpan umur < 10 atau tinggi > 250
- [ ] Foto/avatar upload untuk profil
- [ ] Umur & pace di sidebar otomatis grey saat user baru (clear localStorage)
- [ ] Chunk size optimization: bundle saat ini ~1.2MB (warning Vite > 500kB)

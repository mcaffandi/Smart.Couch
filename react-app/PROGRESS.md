# EnduraUP - Progress & Tracker

## Selesai Hari Ini (3 Juni 2026)

### 1. Upgrade Request System (Admin Dashboard)
- [x] Tombol konfirmasi WhatsApp dihapus.
- [x] Fitur request status PRO dibuat berjalan secara internal via Firebase Firestore (`upgrade_requests` collection).
- [x] Admin Dashboard sekarang punya tab baru: **Requests**, lengkap dengan badge indikator jumlah request pending.
- [x] Fitur Action Admin: **Approve** (dengan input berapa bulan masa aktif PRO) dan **Tolak** request.
- [x] Kolom **Nominal** ditambahkan agar admin gampang mencocokkan transfer dengan *mutasi* rekening (contoh: Rp 29.042).

### 2. File Upload & Firebase Storage
- [x] User wajib **mengunggah (upload) bukti transfer** sebelum bisa membuat permintaan Upgrade PRO.
- [x] Gambar dikirim ke Firebase Storage (`upgrade_receipts/`).
- [x] URL Gambar bukti tersimpan di Firestore dan bisa dilihat oleh Admin di Dashboard dengan mengklik "Lihat Bukti".
- [x] `FIREBASE_RULES.md` sudah diperbarui dengan aturan (Security Rules) lengkap untuk Firestore dan Storage.

### 3. Payment Gateway UI (PremiumModal)
- [x] Flow upgrade dirubah total menjadi **2 langkah (Checkout Style)** ala e-commerce / Xendit.
- [x] UI bersih, profesional, elegan, mode layar penuh khusus invoice.
- [x] Auto-generate **3 digit kode unik (2 digit)** agar nominal pembayaran gampang dilacak.
- [x] Auto-generate **Order ID** (e.g. `INV-ENDURA-XXXXX`).
- [x] Fitur **Salin / Copy Rekening** untuk memudahkan *copy-paste* ke mobile banking.
- [x] Desain minimalis tanpa gradient norak.

### 4. Admin Security & Dashboard Layout
- [x] Fallback sesi admin via `localStorage` dan `sessionStorage` agar admin tidak diblokir PIN-nya walau loading Firebase telat.
- [x] URL hash `#admin` diganti menjadi URL rahasia `#hq-enduraup-secure` agar tidak mudah ditebak. 
- [x] Akses dashboard admin kini Full-Width (100%) menghilangkan area hitam tidak terpakai di kanan/kiri.
- [x] Emoji mahkota 👑 norak pada nama user PRO diganti dengan icon Vector `Crown` dari Lucide.


## To-Do List (Untuk Besok / Selanjutnya)
- [ ] *Testing* ulang flow approval PRO memakai data asli / akun teman untuk meyakinkan semuanya nyambung 100%.
- [ ] (*Bila Perlu*) Menambahkan fitur pembatalan otomatis jika user tidak kunjung mentransfer dalam 24 jam.
- [x] Fitur edit profile / custom avatar.
- [ ] ... (Tulis target selanjutnya di sini)

---
*Silakan baca dan edit file ini untuk tracking apa yang perlu dikerjakan selanjutnya!*

# EnduraUP - Firestore Security Rules

Copy dan paste seluruh kode di bawah ini ke tab **Rules** di Firebase Console (bagian Firestore Database). 

Rules ini sudah diperbarui dengan fungsi `isAdmin()` supaya data tetap aman (tidak sembarang user bisa menghapus/mengubah blog), namun Admin tetap bisa melihat data pelari di Admin Dashboard.

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
  
    // Fungsi bantuan untuk mengecek apakah user yang mengakses adalah Admin
    function isAdmin() {
      return request.auth != null && request.auth.token.email in ['m.c.affandi@gmail.com', 'affanbelajar@gmail.com'];
    }

    match /testimonials/{doc} {
      // Semua orang boleh membaca testimonials
      allow read: if true;
      // HANYA Admin yang boleh menambah atau menghapus testimonials
      allow write: if isAdmin();
    }
    
    match /blogs/{blogId} {
      // Semua orang boleh membaca artikel blog
      allow read: if true;
      // HANYA Admin yang boleh menulis, mengedit, atau menghapus artikel blog
      allow write: if isAdmin();
    }
    
    match /comments/{commentId} {
      // Semua orang boleh membaca komentar
      allow read: if true;
      // User yang terdaftar (login) boleh membuat komentar
      allow create: if request.auth != null;
      // User yang terdaftar boleh mengedit/menghapus
      allow update, delete: if request.auth != null;
    }
    
    match /users/{userId} {
      // INI YANG PALING PENTING UNTUK ADMIN DASHBOARD & SINKRONISASI DATA:
      // User HANYA bisa mengakses datanya sendiri, KECUALI dia adalah Admin.
      // userId sekarang bisa berupa email (untuk menyatukan akun) atau UID.
      allow read, write: if request.auth != null && (request.auth.uid == userId || request.auth.token.email.lower() == userId || isAdmin());
    }
    
    match /settings/{doc} {
      // Semua orang boleh membaca settings (seperti goal_race_date)
      allow read: if true;
      // Hanya Admin yang boleh mengubah pengaturan global
      allow write: if isAdmin();
    }
    
    match /stats/{doc} {
      // Semua orang boleh membaca dan mengupdate statistik visitor
      allow read, write: if true;
    }
    
    match /upgrade_requests/{reqId} {
      // User bisa bikin request, admin bisa baca dan edit
      allow read: if isAdmin() || (request.auth != null && request.auth.uid == resource.data.userId);
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
    
    match /feedback/{feedbackId} {
      // Semua orang boleh membaca testimoni
      allow read: if true;
      // User yang login boleh mengirim testimoni
      allow create: if request.auth != null;
      // Hanya Admin yang boleh mengedit (misalnya mengubah status 'featured') atau menghapus
      allow update, delete: if isAdmin();
    }
    
    match /{document=**} {
      // Kunci mati semua koleksi lain yang tidak dideklarasikan di atas
      allow read, write: if false;
    }
  }
}
```

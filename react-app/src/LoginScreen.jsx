import { useState } from 'react';
import Logo from './Logo';
import { 
  isConfigured as isFirebaseConfigured, 
  auth, 
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously
} from './firebase';

export default function LoginScreen({ onLoginSuccess, usersList, addToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Local storage auth legacy fallback
  const getAuthDb = () => {
    try {
      const raw = localStorage.getItem('smartcoach_auth_users');
      const db = raw ? JSON.parse(raw) : {};
      if (!db['admin']) {
        db['admin'] = 'admin123';
        localStorage.setItem('smartcoach_auth_users', JSON.stringify(db));
      }
      return db;
    } catch (e) {
      const fallback = { admin: 'admin123' };
      localStorage.setItem('smartcoach_auth_users', JSON.stringify(fallback));
      return fallback;
    }
  };

  const saveAuthDb = (db) => {
    try {
      localStorage.setItem('smartcoach_auth_users', JSON.stringify(db));
    } catch (e) {}
  };

  const handleLocalSubmit = (e) => {
    e.preventDefault();
    const cleanUser = email.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      addToast('Username dan password wajib diisi.', 'error');
      return;
    }

    const db = getAuthDb();

    if (isRegister) {
      if (db[cleanUser]) {
        addToast('Username sudah terdaftar.', 'error');
        return;
      }

      const isLegacyClaim = usersList.includes(cleanUser);
      db[cleanUser] = cleanPass;
      saveAuthDb(db);

      if (!isLegacyClaim) {
        try {
          const rawList = localStorage.getItem('smartcoach_users_list');
          const currentList = rawList ? JSON.parse(rawList) : ['Profil Utama'];
          if (!currentList.includes(cleanUser)) {
            currentList.push(cleanUser);
            localStorage.setItem('smartcoach_users_list', JSON.stringify(currentList));
          }
        } catch (err) {}
      }

      addToast(isLegacyClaim ? 'Berhasil mengamankan profil lama lo!' : 'Akun berhasil dibuat!');
      onLoginSuccess(cleanUser);
    } else {
      const registeredPassword = db[cleanUser];
      if (usersList.includes(cleanUser) && !registeredPassword) {
        addToast('Profil ini belum memiliki password. Silakan Daftar untuk membuat password.', 'warning');
        setIsRegister(true);
        return;
      }

      if (!registeredPassword || registeredPassword !== cleanPass) {
        addToast('Username atau password salah.', 'error');
        return;
      }

      addToast(`Selamat datang kembali, ${cleanUser}!`);
      onLoginSuccess(cleanUser);
    }
  };

  const handleFirebaseSubmit = async (e) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      addToast('Email dan password wajib diisi.', 'error');
      return;
    }

    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        addToast('Akun Firebase berhasil didaftarkan!');
        const userIdentifier = userCredential.user.email;
        onLoginSuccess(userIdentifier);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        addToast('Berhasil masuk menggunakan Firebase!');
        const userIdentifier = userCredential.user.email;
        onLoginSuccess(userIdentifier);
      }
    } catch (error) {
      console.error(error);
      let errorMsg = 'Gagal melakukan otentikasi.';
      if (error.code === 'auth/email-already-in-use') errorMsg = 'Email ini sudah terdaftar.';
      if (error.code === 'auth/weak-password') errorMsg = 'Password minimal terdiri dari 6 karakter.';
      if (error.code === 'auth/invalid-email') errorMsg = 'Format email tidak valid.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMsg = 'Email atau password salah.';
      }
      addToast(errorMsg, 'error');
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      addToast(`Selamat datang, ${result.user.displayName || 'User'}!`);
      const userIdentifier = result.user.email || result.user.displayName;
      onLoginSuccess(userIdentifier);
    } catch (error) {
      console.error(error);
      addToast('Gagal masuk menggunakan akun Google.', 'error');
    }
  };

  const handleAnonymousSignIn = async () => {
    try {
      const result = await signInAnonymously(auth);
      addToast('Masuk sebagai Pengguna Anonim.');
      const userIdentifier = `Anonim-${result.user.uid.substring(0, 4)}`;
      onLoginSuccess(userIdentifier);
    } catch (error) {
      console.error(error);
      addToast('Gagal masuk secara anonim.', 'error');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon" style={{ background: 'transparent', width: 'auto', height: 'auto' }}>
            <Logo size={48} />
          </div>
          <h2 className="login-title">EnduraUP</h2>
          <p className="login-subtitle">Garmin Connect Export &amp; Training Planner</p>
        </div>

        <form onSubmit={isFirebaseConfigured ? handleFirebaseSubmit : handleLocalSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">{isFirebaseConfigured ? 'Email Address' : 'Username'}</label>
            <input
              type={isFirebaseConfigured ? 'email' : 'text'}
              className="form-input"
              placeholder={isFirebaseConfigured ? 'nama@domain.com' : 'Masukkan username...'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-input"
              placeholder="Masukkan password..."
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 22, height: 42 }}>
            {isRegister ? 'Daftar & Masuk' : 'Masuk ke Dashboard'}
          </button>
        </form>

        {isFirebaseConfigured && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
              <span style={{ padding: '0 10px' }}>atau masuk dengan</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}
                onClick={handleGoogleSignIn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: 8 }}>
                  <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 15.02 1 12 1 7.28 1 3.22 3.72 1.25 7.68l3.86 3C6.02 7.74 8.78 5.04 12 5.04z" />
                  <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.97h3.89c2.28-2.1 3.56-5.19 3.56-8.69z" />
                  <path fill="#FBBC05" d="M5.11 14.78A7.12 7.12 0 0 1 4.7 12c0-.98.17-1.92.47-2.78L1.3 6.22A11.94 11.94 0 0 0 0 12c0 2.08.4 4.06 1.11 5.89l4-3.11z" />
                  <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.89-2.97c-1.08.72-2.48 1.16-4.07 1.16-3.22 0-5.98-2.7-6.97-5.64l-3.86 3C3.22 20.28 7.28 23 12 23z" />
                </svg>
                Google
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}
                onClick={handleAnonymousSignIn}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Anonim
              </button>
            </div>
          </>
        )}

        <div className="login-footer" style={{ marginTop: 20 }}>
          {isRegister ? (
            <p>
              Sudah punya akun?{' '}
              <button className="login-link-btn" onClick={() => setIsRegister(false)}>
                Masuk di sini
              </button>
            </p>
          ) : (
            <p>
              Belum punya akun?{' '}
              <button className="login-link-btn" onClick={() => setIsRegister(true)}>
                Daftar baru
              </button>
            </p>
          )}

          {!isFirebaseConfigured && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 14, background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)' }}>
              ⚠️ Firebase Auth belum dikonfigurasi. Berjalan dalam mode database lokal.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

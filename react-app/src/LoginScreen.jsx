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

export default function LoginScreen({ onLoginSuccess, usersList, addToast, lang = 'id' }) {
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

  const handleLocalAuth = (e, isRegister) => {
    if (e) e.preventDefault();
    const cleanUser = email.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      addToast(lang === 'id' ? 'Username dan password wajib diisi.' : 'Username and password are required.', 'error');
      return;
    }

    const db = getAuthDb();

    if (isRegister) {
      if (db[cleanUser]) {
        addToast(lang === 'id' ? 'Username sudah terdaftar.' : 'Username is already registered.', 'error');
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

      addToast(
        isLegacyClaim 
          ? (lang === 'id' ? 'Berhasil mengamankan profil lama lo!' : 'Successfully secured your old profile!')
          : (lang === 'id' ? 'Akun berhasil dibuat!' : 'Account created successfully!')
      );
      setShowRegisterModal(false);
      onLoginSuccess(cleanUser);
    } else {
      const registeredPassword = db[cleanUser];
      if (usersList.includes(cleanUser) && !registeredPassword) {
        addToast(
          lang === 'id' 
            ? 'Profil ini belum memiliki password. Silakan Daftar untuk membuat password.'
            : 'This profile does not have a password yet. Please Register to create a password.', 
          'warning'
        );
        setShowRegisterModal(true);
        return;
      }

      if (!registeredPassword || registeredPassword !== cleanPass) {
        addToast(lang === 'id' ? 'Username atau password salah.' : 'Invalid username or password.', 'error');
        return;
      }

      addToast(lang === 'id' ? `Selamat datang kembali, ${cleanUser}!` : `Welcome back, ${cleanUser}!`);
      onLoginSuccess(cleanUser);
    }
  };

  const handleFirebaseAuth = async (e, isRegister) => {
    if (e) e.preventDefault();
    if (loading) return;
    const cleanEmail = email.trim();
    const cleanPass = password.trim();

    if (!cleanEmail || !cleanPass) {
      addToast(lang === 'id' ? 'Email dan password wajib diisi.' : 'Email and password are required.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
        addToast(lang === 'id' ? 'Akun Firebase berhasil didaftarkan!' : 'Firebase account registered successfully!');
        setShowRegisterModal(false);
        const userIdentifier = userCredential.user.email;
        onLoginSuccess(userIdentifier);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
        addToast(lang === 'id' ? 'Berhasil masuk menggunakan Firebase!' : 'Successfully signed in with Firebase!');
        const userIdentifier = userCredential.user.email;
        onLoginSuccess(userIdentifier);
      }
    } catch (error) {
      console.error(error);
      let errorMsg = lang === 'id' ? 'Gagal melakukan otentikasi.' : 'Failed to authenticate.';
      if (error.code === 'auth/email-already-in-use') {
        errorMsg = lang === 'id' ? 'Email ini sudah terdaftar.' : 'This email is already registered.';
      }
      if (error.code === 'auth/weak-password') {
        errorMsg = lang === 'id' ? 'Password minimal terdiri dari 6 karakter.' : 'Password must be at least 6 characters.';
      }
      if (error.code === 'auth/invalid-email') {
        errorMsg = lang === 'id' ? 'Format email tidak valid.' : 'Invalid email format.';
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        errorMsg = lang === 'id' ? 'Email atau password salah.' : 'Invalid email or password.';
      }
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      addToast(lang === 'id' ? `Selamat datang, ${result.user.displayName || 'User'}!` : `Welcome, ${result.user.displayName || 'User'}!`);
      const userIdentifier = result.user.email || result.user.displayName;
      onLoginSuccess(userIdentifier);
    } catch (error) {
      console.error(error);
      addToast(lang === 'id' ? 'Gagal masuk menggunakan akun Google.' : 'Failed to sign in with Google.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const result = await signInAnonymously(auth);
      addToast(lang === 'id' ? 'Masuk sebagai Pengguna Anonim.' : 'Logged in as Anonymous.');
      const userIdentifier = `Anonim-${result.user.uid.substring(0, 4)}`;
      onLoginSuccess(userIdentifier);
    } catch (error) {
      console.error(error);
      addToast(lang === 'id' ? 'Gagal masuk secara anonim.' : 'Failed to sign in anonymously.', 'error');
    } finally {
      setLoading(false);
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

        <form onSubmit={(e) => isFirebaseConfigured ? handleFirebaseAuth(e, false) : handleLocalAuth(e, false)} className="login-form">
          <div className="form-group">
            <label className="form-label">{lang === 'id' ? 'Alamat Email / Username' : 'Email Address / Username'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={lang === 'id' ? 'nama@email.com atau username' : 'email@domain.com or username'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group" style={{ marginTop: 14 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder={lang === 'id' ? 'Masukkan password...' : 'Enter password...'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: '40px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px'
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: 22, height: 42 }} disabled={loading}>
            {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Masuk ke Dashboard' : 'Sign in to Dashboard')}
          </button>
        </form>

        {isFirebaseConfigured && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: 'var(--text-muted)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
              <span style={{ padding: '0 10px' }}>{lang === 'id' ? 'atau masuk dengan' : 'or sign in with'}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }}></div>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', height: 40 }}
                onClick={handleGoogleSignIn}
                disabled={loading}
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
                disabled={loading}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                {lang === 'id' ? 'Anonim' : 'Anonymous'}
              </button>
            </div>
          </>
        )}

        <div className="login-footer" style={{ marginTop: 20 }}>
          <p>
            {lang === 'id' ? 'Belum punya akun?' : "Don't have an account?"}{' '}
            <button className="login-link-btn" onClick={() => setShowRegisterModal(true)}>
              {lang === 'id' ? 'Daftar baru' : 'Register here'}
            </button>
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '16px',
            background: 'var(--bg-card)',
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981', flexShrink: 0 }}>
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ textAlign: 'left' }}>
              {lang === 'id' 
                ? 'Privasi Terjamin: Data aktivitas & profil Anda aman bersama kami.' 
                : 'Privacy Guaranteed: Your activity & profile data are secure with us.'}
            </span>
          </div>

          {!isFirebaseConfigured && (
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 14, background: 'var(--hover-overlay)', padding: '6px 10px', borderRadius: 4, border: '1px solid var(--border)' }}>
              {lang === 'id' 
                ? '⚠️ Firebase Auth belum dikonfigurasi. Berjalan dalam mode database lokal.' 
                : '⚠️ Firebase Auth is not configured. Running in local database mode.'}
            </div>
          )}
        </div>
      </div>

      {showRegisterModal && (
        <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowRegisterModal(false); }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '92vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {lang === 'id' ? 'Daftar Akun Baru' : 'Register New Account'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                  {lang === 'id' ? 'Buat profil untuk mulai latihan' : 'Create a profile to start training'}
                </div>
              </div>
              <button onClick={() => setShowRegisterModal(false)}
                style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: 'inherit', flexShrink: 0 }}
              >×</button>
            </div>
            <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <form onSubmit={(e) => isFirebaseConfigured ? handleFirebaseAuth(e, true) : handleLocalAuth(e, true)} className="login-form">
                <div className="form-group">
                  <label className="form-label">{lang === 'id' ? 'Alamat Email / Username' : 'Email Address / Username'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={lang === 'id' ? 'nama@email.com atau username' : 'email@domain.com or username'}
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoFocus
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
                <div className="form-group" style={{ marginTop: 14 }}>
                  <label className="form-label">Password</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder={lang === 'id' ? 'Masukkan password...' : 'Enter password...'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={loading}
                      style={{ paddingRight: '40px' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{
                        position: 'absolute',
                        right: '10px',
                        background: 'none',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '4px'
                      }}
                    >
                      {showPassword ? (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                          <line x1="1" y1="1" x2="23" y2="23" />
                        </svg>
                      ) : (
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                          <circle cx="12" cy="12" r="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
                <button type="submit" className="btn btn-primary" style={{ marginTop: 22, height: 42 }} disabled={loading}>
                  {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Daftar & Masuk' : 'Register & Sign In')}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

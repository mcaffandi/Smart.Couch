import { useState } from 'react';

export default function LoginScreen({ onLoginSuccess, usersList, addToast }) {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (!cleanUser || !cleanPass) {
      addToast('Username dan password wajib diisi.', 'error');
      return;
    }

    const db = getAuthDb();

    if (isRegister) {
      // REGISTER FLOW
      if (db[cleanUser]) {
        addToast('Username sudah terdaftar.', 'error');
        return;
      }

      // Check if username already exists in local profiles list (e.g. Profil Utama legacy data)
      const isLegacyClaim = usersList.includes(cleanUser);

      // Register user
      db[cleanUser] = cleanPass;
      saveAuthDb(db);

      // Add to users list if not already present
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
      // LOGIN FLOW
      const registeredPassword = db[cleanUser];
      
      // Special case: if user exists in profiles list but not in credentials database (unclaimed legacy profile)
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

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">SC</div>
          <h2 className="login-title">SmartCoach AI</h2>
          <p className="login-subtitle">Garmin Connect Export &amp; Training Planner</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label className="form-label">Username</label>
            <input
              type="text"
              className="form-input"
              placeholder="Masukkan username..."
              value={username}
              onChange={e => setUsername(e.target.value)}
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
            {isRegister ? 'Daftar &amp; Masuk' : 'Masuk ke Dashboard'}
          </button>
        </form>

        <div className="login-footer">
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
        </div>
      </div>
    </div>
  );
}

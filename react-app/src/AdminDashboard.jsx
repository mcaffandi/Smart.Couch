import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export default function AdminDashboard({ onBack }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_PIN = '210421'; // Simple hardcoded PIN

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchUsers = async () => {
      try {
        if (!db) {
           console.log("Firebase not configured");
           setLoading(false);
           return;
        }
        const querySnapshot = await getDocs(collection(db, "users"));
        const data = [];
        querySnapshot.forEach((doc) => {
          data.push({ id: doc.id, data: doc.data() });
        });
        setUsers(data);
      } catch (err) {
        console.error("Gagal ambil data admin:", err);
      }
      setLoading(false);
    };
    fetchUsers();
  }, [isAuthenticated]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
    } else {
      alert("PIN Salah!");
      setPin('');
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)' }}>
        <div style={{ background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border)', width: 320, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 10 }}>🔒 Admin Area</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>Masukkan PIN untuk mengakses data.</p>
          <form onSubmit={handlePinSubmit}>
            <input 
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '12px', textAlign: 'center', letterSpacing: '4px', fontSize: 24, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', marginBottom: 20 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Buka Dashboard</button>
          </form>
          <button onClick={onBack} className="btn btn-secondary" style={{ width: '100%', padding: '12px', marginTop: 10 }}>Kembali</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Loading Data Admin...</div>;

  const totalUsers = users.length;
  const totalRuns = users.reduce((acc, user) => acc + (user.data?.running_activities?.length || 0), 0);
  const totalSleepLogs = users.reduce((acc, user) => acc + Object.keys(user.data?.sleep_records || {}).length, 0);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 4 }}>EnduraUP - Admin Dashboard</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Analisis Performa Web & Kebutuhan Bisnis</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>Kembali ke Web</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Pelari Aktif</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--accent-purple)' }}>{totalUsers}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Sesi Lari Dicatat</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#10b981' }}>{totalRuns}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Log Tidur</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#38bdf8' }}>{totalSleepLogs}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
        <h3 style={{ margin: 0, marginBottom: 20 }}>Daftar Pengguna Terbaru</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Email / ID</th>
                <th style={{ padding: '12px 16px' }}>Nama</th>
                <th style={{ padding: '12px 16px' }}>Tujuan Latihan</th>
                <th style={{ padding: '12px 16px' }}>Target Pace</th>
                <th style={{ padding: '12px 16px' }}>Aktivitas Lari</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontSize: 14, wordBreak: 'break-all' }}>
                    {u.data?.email || (u.id.substring(0, 10) + '...')}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>
                    {u.data?.displayName || u.data?.profile?.displayName || 'Anonim'}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4 }}>
                      {u.data?.profile?.goal || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>{u.data?.profile?.targetPace ? u.data.profile.targetPace + ' /km' : '-'}</td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: 'var(--accent-purple)' }}>{u.data?.running_activities?.length || 0} sesi</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data atau tidak ada akses Firebase.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

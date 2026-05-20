import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  loadUsersList, saveUsersList, getCurrentUser, saveCurrentUser,
  loadUserData, saveUserData, deleteUserData,
  msToDate, getPaceRecommendations, getHRZones, mergeData, parseGarminZip, parseGpxFile
} from './utils';
import { TrendChart, HRZoneChart } from './Charts';
import RunHistory from './RunHistory';
import TrainingPlan from './TrainingPlan';
import RacePrediction from './RacePrediction';
import LoginScreen from './LoginScreen';
import AICoach from './AICoach';
import LandingPage from './LandingPage';
import Logo from './Logo';

// ─── Toast component ──────────────────────────────────────────────────────────
function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="collapsible-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ fontSize: 12, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {open && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

// ─── Number input ─────────────────────────────────────────────────────────────
function NumberInput({ value, onChange, min, max, step = 1, label }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="number-input-group">
        <button type="button" onClick={() => onChange(Math.max(min ?? -Infinity, parseFloat((value - step).toFixed(2))))}>−</button>
        <input
          type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        <button type="button" onClick={() => onChange(Math.min(max ?? Infinity, parseFloat((value + step).toFixed(2))))}>+</button>
      </div>
    </div>
  );
}
function PaceInput({ value, onChange, label }) {
  const m = Math.floor(value);
  const s = Math.round((value - m) * 60);

  const setM = (newM) => onChange(newM + s / 60);
  const setS = (newS) => onChange(m + newS / 60);

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="number-input-group" style={{ flex: 1 }}>
          <button type="button" onClick={() => setM(Math.max(3, m - 1))}>−</button>
          <input type="number" value={m} onChange={e => setM(Math.max(3, parseInt(e.target.value) || 0))} style={{ textAlign: 'center' }} />
          <button type="button" onClick={() => setM(Math.min(15, m + 1))}>+</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, color: 'var(--text-muted)' }}>:</div>
        <div className="number-input-group" style={{ flex: 1 }}>
          <button type="button" onClick={() => setS(s - 5 < 0 ? 55 : s - 5)}>−</button>
          <input type="number" value={s} onChange={e => setS(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))} style={{ textAlign: 'center' }} />
          <button type="button" onClick={() => setS(s + 5 >= 60 ? 0 : s + 5)}>+</button>
        </div>
      </div>
    </div>
  );
}
// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State: data ─────────────────────────────────────────────────────────────
  const [sessionUser, setSessionUser] = useState(() => sessionStorage.getItem('smartcoach_session') || null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [usersList, setUsersList] = useState(() => loadUsersList());
  const [data, setData] = useState(() => loadUserData(getCurrentUser()));
  const [toasts, setToasts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('smartcoach_sidebar_collapsed') === 'true');
  const fileInputRef = useRef(null);

  // ── State: profile ───────────────────────────────────────────────────────────
  const [age, setAge] = useState(() => data.profile?.age ?? 31);
  const [goal, setGoal] = useState(() => data.profile?.goal ?? 'maintenance');
  const [programStyle, setProgramStyle] = useState(() => data.profile?.programStyle ?? 'sedang');
  const [targetPace, setTargetPace] = useState(() => data.profile?.targetPace ?? 5.0);
  const [selectedDays, setSelectedDays] = useState(() => data.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);

  const allDays = useMemo(() => [
    { key: 'Senin', label: 'Sen' },
    { key: 'Selasa', label: 'Sel' },
    { key: 'Rabu', label: 'Rab' },
    { key: 'Kamis', label: 'Kam' },
    { key: 'Jumat', label: 'Jum' },
    { key: 'Sabtu', label: 'Sab' },
    { key: 'Minggu', label: 'Min' }
  ], []);

  const toggleDay = useCallback((dayKey) => {
    setSelectedDays(prev => {
      if (prev.includes(dayKey)) {
        return prev.filter(d => d !== dayKey);
      } else {
        return [...prev, dayKey];
      }
    });
  }, []);

  // ── State: manual inputs ─────────────────────────────────────────────────────
  const [manualRun, setManualRun] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0],
    distance: 5.0,
    duration: 30,
    avgHr: 145,
    maxHr: 180,
  });
  const [manualSleep, setManualSleep] = useState({
    date: new Date().toISOString().split('T')[0],
    quality: 'cukup',
    duration: 7.0,
  });

  // ── State: active tab ────────────────────────────────────────────────────────
  const [tab, setTab] = useState('dashboard');
  const [showLanding, setShowLanding] = useState(true);

  // ── State: user profiles ─────────────────────────────────────────────────────
  const switchUser = (username) => {
    saveCurrentUser(username);
    setCurrentUser(username);
    const uData = loadUserData(username);
    setData(uData);
    setAge(uData.profile?.age ?? 31);
    setGoal(uData.profile?.goal ?? 'maintenance');
    setProgramStyle(uData.profile?.programStyle ?? 'sedang');
    setTargetPace(uData.profile?.targetPace ?? 5.0);
    setSelectedDays(uData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);
    addToast(`Masuk sebagai ${username}`);
  };

  const createNewUser = () => {
    const name = prompt('Masukkan nama profil baru:');
    if (!name) return;
    const cleanName = name.trim();
    if (!cleanName) return;
    if (usersList.includes(cleanName)) {
      addToast('Nama profil sudah ada.', 'error');
      return;
    }
    const updatedList = [...usersList, cleanName];
    setUsersList(updatedList);
    saveUsersList(updatedList);
    switchUser(cleanName);
  };

  const deleteCurrentUser = () => {
    if (usersList.length <= 1) {
      addToast('Tidak bisa menghapus satu-satunya profil.', 'error');
      return;
    }
    if (!confirm(`Hapus profil "${currentUser}" beserta seluruh datanya?`)) return;
    
    const updatedList = usersList.filter(u => u !== currentUser);
    setUsersList(updatedList);
    saveUsersList(updatedList);
    deleteUserData(currentUser);
    switchUser(updatedList[0]);
  };

  // ── Toast helper ─────────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = 'success') => {
    const id = Date.now();
    setToasts(ts => [...ts, { id, msg, type }]);
    setTimeout(() => setToasts(ts => ts.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const runActs = data.running_activities ?? [];
  const sleepRecs = data.sleep_records ?? {};
  const actualMaxHR = data.max_hr ?? 0;

  const totalDist = runActs.reduce((s, a) => s + (a.distance ?? 0) / 100000, 0);
  const totalSessions = runActs.length;
  const avgHR = runActs.length
    ? runActs.reduce((s, a) => s + (a.avgHr ?? 0), 0) / runActs.filter(a => a.avgHr).length
    : 0;

  const sortedSleepDates = Object.keys(sleepRecs).sort().reverse();
  const latestSleepDate = sortedSleepDates[0] ?? null;
  const latestSleepScore = latestSleepDate ? sleepRecs[latestSleepDate].score : null;

  const runDates = new Set(runActs.map(a => a.startTimeLocal ? msToDate(a.startTimeLocal) : null).filter(Boolean));
  const runDayScores = Object.entries(sleepRecs).filter(([d]) => runDates.has(d)).map(([, v]) => v.score);
  const nonRunDayScores = Object.entries(sleepRecs).filter(([d]) => !runDates.has(d)).map(([, v]) => v.score);
  const avgRunSleep = runDayScores.length ? (runDayScores.reduce((s, v) => s + v, 0) / runDayScores.length).toFixed(1) : null;
  const avgNonRunSleep = nonRunDayScores.length ? (nonRunDayScores.reduce((s, v) => s + v, 0) / nonRunDayScores.length).toFixed(1) : null;

  const paces = getPaceRecommendations(targetPace);
  const hrZones = getHRZones(actualMaxHR || (220 - age));

  // Actual best pace from ALL stored runs (same unit logic as RacePrediction)
  const actualBestPace = useMemo(() => {
    const valid = runActs
      .filter(a => a.distance >= 300000 && a.duration > 0)
      .map(a => (a.duration / 60000) / (a.distance / 100000))
      .filter(p => p >= 3 && p <= 20)
      .sort((a, b) => a - b);
    return valid[0] ?? null; // fastest (lowest) pace = best
  }, [runActs]);

  // ── File upload (Garmin ZIP & Strava GPX) ──────────────────────────────────
  const handleFileUpload = async (file) => {
    if (!file) return;
    const isZip = file.name.toLowerCase().endsWith('.zip');
    const isGpx = file.name.toLowerCase().endsWith('.gpx');

    if (!isZip && !isGpx) {
      addToast('Pilih file .zip atau .gpx yang valid', 'error');
      return;
    }
    setIsUploading(true);
    try {
      let incoming;
      if (isZip) {
        const JSZip = (await import('jszip')).default;
        incoming = await parseGarminZip(file, JSZip);
      } else {
        incoming = await parseGpxFile(file);
      }

      if (!incoming.running_activities.length) {
        addToast('Tidak ada data lari ditemukan di file ini', 'error');
        setIsUploading(false);
        return;
      }
      const merged = mergeData(data, incoming);
      merged.profile = { age, goal, programStyle, targetPace, selectedDays };
      setData(merged);
      saveUserData(currentUser, merged);
      addToast(`Berhasil import ${incoming.running_activities.length} sesi lari.`);
      setSidebarOpen(false);
    } catch (e) {
      console.error(e);
      addToast('Gagal membaca file. Pastikan format valid.', 'error');
    }
    setIsUploading(false);
  };

  // ── Save manual run ───────────────────────────────────────────────────────────
  const saveManualRun = () => {
    const epochMs = new Date(manualRun.date).getTime();
    const newRun = {
      startTimeLocal: epochMs,
      distance: manualRun.distance * 100000,
      duration: manualRun.duration * 60000,
      avgHr: manualRun.avgHr,
      maxHr: manualRun.maxHr,
      activityType: 'running',
      name: manualRun.name.trim() || 'Manual Run',
    };
    const updated = {
      ...data,
      running_activities: [...data.running_activities, newRun],
      max_hr: Math.max(data.max_hr ?? 0, manualRun.maxHr),
      profile: { age, goal, programStyle, targetPace, selectedDays }
    };
    setData(updated);
    saveUserData(currentUser, updated);
    addToast('Sesi lari berhasil disimpan.');
    setSidebarOpen(false);
  };

  // ── Save manual sleep ─────────────────────────────────────────────────────────
  const saveManualSleep = () => {
    const scoreMap = { pulas: 90, cukup: 75, kurang: 55, begadang: 30 };
    const score = scoreMap[manualSleep.quality] ?? 75;
    const updated = {
      ...data,
      sleep_records: {
        ...data.sleep_records,
        [manualSleep.date]: { score, duration: manualSleep.duration },
      },
      profile: { age, goal, programStyle, targetPace, selectedDays }
    };
    setData(updated);
    saveUserData(currentUser, updated);
    addToast('Data tidur berhasil disimpan.');
    setSidebarOpen(false);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────────
  const handleReset = () => {
    const updated = {
      running_activities: [],
      sleep_records: {},
      max_hr: 0,
      profile: { age, goal, programStyle, targetPace, selectedDays }
    };
    setData(updated);
    saveUserData(currentUser, updated);
    setConfirmReset(false);
    setTab('dashboard');
    addToast('Semua data berhasil dihapus.', 'error');
    setSidebarOpen(false);
  };

  // ── Apply profile changes ─────────────────────────────────────────────────────
  const applyProfileChanges = () => {
    const updated = {
      ...data,
      profile: { age, goal, programStyle, targetPace, selectedDays }
    };
    setData(updated);
    saveUserData(currentUser, updated);
    addToast('Profil diperbarui & disimpan.');
    setTab('dashboard');
    setSidebarOpen(false);
  };

  const hasData = runActs.length > 0 || Object.keys(sleepRecs || {}).length > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  if (!sessionUser) {
    if (showLanding) {
      return <LandingPage onGetStarted={() => setShowLanding(false)} />;
    }
    return (
      <>
        <Toast toasts={toasts} />
        <LoginScreen
          onLoginSuccess={(user) => {
            setSessionUser(user);
            sessionStorage.setItem('smartcoach_session', user);
            if (!usersList.includes(user)) {
              const updatedList = [...usersList, user];
              setUsersList(updatedList);
              saveUsersList(updatedList);
            }
            switchUser(user);
          }}
          usersList={usersList}
          addToast={addToast}
        />
      </>
    );
  }

  return (
    <div className="app-layout">
      {/* Mobile Top Bar Header */}
      <header className="mobile-header">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={24} />
          <div>
            <div className="sidebar-logo-text">EndurAI</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AI Coach</div>
          </div>
        </div>
        <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(true)}>
          Profil &amp; Data
        </button>
      </header>

      {/* Sidebar Backdrop Overlay for Mobile */}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Global Uploading Overlay */}
      {isUploading && (
        <div className="global-upload-overlay animate-fade-in">
          <div className="spinner"></div>
          <h2 style={{ marginTop: 24, fontSize: 20, fontWeight: 700 }}>Menganalisis Data...</h2>
          <p style={{ marginTop: 8, color: 'var(--text-muted)' }}>Tunggu sebentar ya, file kamu sedang diproses.</p>
        </div>
      )}

      {/* ═══════════════════════════════ SIDEBAR ═══════════════════════════════ */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Logo */}
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            <div>
              <div className="sidebar-logo-text">EndurAI</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Coach</div>
            </div>
          </div>
          {/* Collapse sidebar button (desktop only) */}
          <button 
            className="sidebar-toggle-btn-desktop" 
            style={{ width: 28, height: 28 }}
            onClick={() => {
              setSidebarCollapsed(true);
              localStorage.setItem('smartcoach_sidebar_collapsed', 'true');
            }}
            title="Sembunyikan Panel"
            aria-label="Collapse Sidebar"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <path d="M9 3v16" />
              <path d="m16 15-3-3 3-3" />
            </svg>
          </button>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>

        <div className="sidebar-divider" />

        {/* Active Account Info */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div className="sidebar-section-title">Akun Aktif</div>
          <div className="user-profile-badge">
            <div className="user-avatar">{currentUser.substring(0, 2).toUpperCase()}</div>
            <div className="user-name-info">
              <div className="username-text">{currentUser}</div>
              <div className="role-text">Atlet EndurAI</div>
            </div>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Profile */}
        <div>
          <div className="sidebar-section-title">User Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <NumberInput label="Umur" value={age} onChange={setAge} min={10} max={100} />

            <div className="form-group">
              <label className="form-label">Goal Utama</label>
              <select className="form-select" value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="maintenance">Maintenance</option>
                <option value="weightloss">Weight Loss</option>
                <option value="10k">10K Race</option>
                <option value="marathon">Marathon</option>
                <option value="turun-hr">Turun Detak Jantung (HR)</option>
                <option value="health">General Health</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Target Program</label>
              <select className="form-select" value={programStyle} onChange={e => setProgramStyle(e.target.value)}>
                <option value="ngepush">Ngepush — Target Dekat</option>
                <option value="sedang">Sedang — Bertahap</option>
                <option value="santai">Santai — Jangka Panjang</option>
              </select>
            </div>

            <PaceInput label="Target Pace (min/km)" value={targetPace} onChange={setTargetPace} />

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Hari Latihan</span>
                <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>{selectedDays.length === 0 ? 'Auto (Disarankan)' : `${selectedDays.length}x Seminggu`}</span>
              </label>
              <div className="day-selector-container">
                <div className="day-selector-grid">
                  {allDays.map(d => {
                    const isActive = selectedDays.includes(d.key);
                    return (
                      <button
                        key={d.key}
                        type="button"
                        className={`day-btn ${isActive ? 'active' : ''}`}
                        title={d.key}
                        onClick={() => toggleDay(d.key)}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Analisis button */}
          <button
            className="btn btn-primary"
            style={{ marginTop: 16 }}
            onClick={applyProfileChanges}
          >
            Terapkan &amp; Analisis
          </button>
        </div>

        <div className="sidebar-divider" />

        {/* Import Data */}
        <div>
          <div className="sidebar-section-title">Impor / Tambah Data</div>

          {/* Garmin ZIP */}
          <div style={{ marginBottom: 10 }}>
            <input
              ref={fileInputRef} type="file" accept=".zip,.gpx" style={{ display: 'none' }}
              onChange={e => handleFileUpload(e.target.files[0])}
            />
            <div
              className={`file-upload-area ${isUploading ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div>
                  <div className="loading-bar" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Memproses ZIP…</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload data lari (.zip / .gpx)</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>maks 200MB</div>
                </>
              )}
            </div>
          </div>

          {/* Manual Run */}
          <Collapsible title="Tambah Sesi Lari Manual">
            <div className="form-group">
              <label className="form-label">Judul / Nama Lari</label>
              <input
                className="form-input"
                type="text"
                placeholder="cth: Morning Run, Senayan Loop..."
                value={manualRun.name}
                onChange={e => setManualRun(r => ({ ...r, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={manualRun.date} onChange={e => setManualRun(r => ({ ...r, date: e.target.value }))} />
            </div>
            <NumberInput label="Jarak (km)" value={manualRun.distance} onChange={v => setManualRun(r => ({ ...r, distance: v }))} min={0.1} step={0.1} />
            <NumberInput label="Durasi (menit)" value={manualRun.duration} onChange={v => setManualRun(r => ({ ...r, duration: v }))} min={1} />
            <NumberInput label="Avg HR (bpm)" value={manualRun.avgHr} onChange={v => setManualRun(r => ({ ...r, avgHr: v }))} min={40} max={220} />
            <NumberInput label="Max HR (bpm)" value={manualRun.maxHr} onChange={v => setManualRun(r => ({ ...r, maxHr: v }))} min={100} max={250} />
            <button className="btn btn-primary" onClick={saveManualRun}>Simpan Lari</button>
          </Collapsible>

          {/* Manual Sleep */}
          <Collapsible title="Catat Tidur Semalam">
            <div className="form-group">
              <label className="form-label">Tanggal</label>
              <input className="form-input" type="date" value={manualSleep.date} onChange={e => setManualSleep(s => ({ ...s, date: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Kualitas Tidur</label>
              <select className="form-select" value={manualSleep.quality} onChange={e => setManualSleep(s => ({ ...s, quality: e.target.value }))}>
                <option value="pulas">Sangat Pulas & Segar</option>
                <option value="cukup">Cukup Baik</option>
                <option value="kurang">Kurang Nyenyak</option>
                <option value="begadang">Begadang / Sangat Kurang</option>
              </select>
            </div>
            <NumberInput label="Durasi Tidur (jam)" value={manualSleep.duration} onChange={v => setManualSleep(s => ({ ...s, duration: v }))} min={1} max={24} step={0.5} />
            <button className="btn btn-primary" onClick={saveManualSleep}>Simpan Tidur</button>
          </Collapsible>
        </div>

        <div className="sidebar-divider" style={{ marginTop: 'auto' }} />

        {/* Reset */}
        {!confirmReset ? (
          <button
            className="btn btn-danger"
            onClick={() => setConfirmReset(true)}
          >
            Reset &amp; Hapus Semua Data
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, textAlign: 'center' }}>
              Hapus semua data? Tidak bisa di-undo.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                className="btn btn-danger"
                style={{ flex: 1 }}
                onClick={handleReset}
              >
                Ya, Hapus
              </button>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirmReset(false)}
              >
                Batal
              </button>
            </div>
          </div>
        )}

        {hasData && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 6 }}>
            {totalSessions} sesi lari · {Object.keys(sleepRecs).length} malam tidur tersimpan
          </div>
        )}

        <div className="sidebar-divider" style={{ margin: '8px 0' }} />

        <button
          className="btn btn-secondary"
          onClick={() => {
            setSessionUser(null);
            sessionStorage.removeItem('smartcoach_session');
            addToast('Berhasil keluar.');
          }}
        >
          Logout / Keluar
        </button>
      </aside>

      {/* ═══════════════════════════════ MAIN ══════════════════════════════════ */}
      <main className="main-content">
        {/* Header */}
        <div className="page-header" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {sidebarCollapsed && (
              <button 
                className="sidebar-toggle-btn-desktop"
                onClick={() => {
                  setSidebarCollapsed(false);
                  localStorage.setItem('smartcoach_sidebar_collapsed', 'false');
                }}
                title="Tampilkan Panel"
                aria-label="Expand Sidebar"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="18" x="3" y="3" rx="2" />
                  <path d="M9 3v16" />
                  <path d="m14 9 3 3-3 3" />
                </svg>
              </button>
            )}
            <h1 className="page-title" style={{ margin: 0 }}>EndurAI</h1>
          </div>
          <p className="page-subtitle">Ubah Data Lari &amp; Tidur lo Jadi Rencana Latihan Personal</p>
        </div>

        {!hasData ? (
          /* Empty state */
          <div className="empty-state animate-fade-in">
            <h2 className="empty-state-title">Selamat Datang</h2>
            <p className="empty-state-desc">Database lokal masih kosong. Mulai dengan menambahkan data lo.</p>
            <div className="empty-state-steps">
              <div 
                className="empty-step" 
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="empty-step-num">1</div>
                <div><strong>Upload data lari (.zip / .gpx)</strong> untuk import riwayat lari dan rute lo secara langsung. <i>(Klik di sini)</i></div>
              </div>
              <div className="empty-step">
                <div className="empty-step-num">2</div>
                <div><strong>Atau input manual</strong> sesi lari dan data tidur melalui sidebar kiri. Data disimpan permanen di browser lo.</div>
              </div>
              <div className="empty-step">
                <div className="empty-step-num">3</div>
                <div>Set profil (umur, goal, target pace) untuk rekomendasi jadwal yang dipersonalisasi.</div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="tabs">
              {[
                { key: 'dashboard', label: 'Dashboard' },
                { key: 'training', label: 'Rencana Latihan' },
                { key: 'race', label: 'Race Prediction' },
                { key: 'history', label: 'Riwayat Lari' },
                { key: 'sleep', label: 'Analisis Tidur' },
              ].map(t => (
                <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ─────────────────── DASHBOARD ─────────────────── */}
            {tab === 'dashboard' && (
              <div className="animate-fade-in">
                {/* Metrics */}
                <div className="metrics-grid">
                  {[
                    { label: 'Total Jarak', value: totalDist.toFixed(1), unit: 'km', color: '#818cf8' },
                    { label: 'Total Sesi', value: totalSessions, unit: 'kali', color: '#fb7185' },
                    { label: 'Avg Heart Rate', value: avgHR ? Math.round(avgHR) : '–', unit: 'bpm', color: '#34d399' },
                    { label: 'Actual Max HR', value: actualMaxHR || '–', unit: 'bpm', color: '#fbbf24' },
                  ].map((m, i) => (
                    <div className="metric-card animate-fade-in" key={i} style={{ '--accent-color': m.color, animationDelay: `${i * 0.06}s` }}>
                      <div className="metric-label">{m.label}</div>
                      <div className="metric-value">
                        {m.value}
                        <span className="metric-unit">{m.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {actualMaxHR > 0 && (
                  <div className="info-card purple" style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Detak Jantung:</strong>{' '}
                      Estimasi Max HR berdasarkan umur ({age} tahun) adalah <strong>{220 - age} bpm</strong>,
                      tapi data mencatat hingga <strong style={{ color: '#fbbf24' }}>{actualMaxHR} bpm</strong>.
                      Zona latihan lo dikalkulasi pakai data aktual yang lebih akurat.
                    </div>
                  </div>
                )}

                {/* Charts */}
                <TrendChart activities={runActs} />

                {actualMaxHR > 0 && (
                  <HRZoneChart zones={hrZones} avgHr={avgHR ? Math.round(avgHR) : 0} />
                )}

                <AICoach activities={data.running_activities} profile={{ age, goal, targetPace }} />

                {/* Sleep correlation summary */}
                {avgRunSleep && avgNonRunSleep && (
                  <div>
                    <div className="section-header">
                      <h2 className="section-title">Korelasi Tidur &amp; Lari</h2>
                    </div>
                    <div className="sleep-grid">
                      <div className="sleep-card">
                        <div className="sleep-card-label" style={{ color: '#818cf8' }}>Tidur Setelah Lari</div>
                        <div className="sleep-card-value">{avgRunSleep}<span className="metric-unit">/100</span></div>
                      </div>
                      <div className="sleep-card">
                        <div className="sleep-card-label" style={{ color: '#94a3b8' }}>Tidur Tanpa Lari</div>
                        <div className="sleep-card-value">{avgNonRunSleep}<span className="metric-unit">/100</span></div>
                      </div>
                    </div>
                    {parseFloat(avgRunSleep) > parseFloat(avgNonRunSleep) ? (
                      <div className="alert alert-success">
                        Lari meningkatkan kualitas tidur lo sebesar <strong>{(parseFloat(avgRunSleep) - parseFloat(avgNonRunSleep)).toFixed(1)} poin</strong>.
                      </div>
                    ) : (
                      <div className="alert alert-info">
                        Tidur lo cenderung lebih baik di hari tidak lari (selisih {(parseFloat(avgNonRunSleep) - parseFloat(avgRunSleep)).toFixed(1)} poin). Coba evaluasi recovery-mu.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─────────────────── TRAINING PLAN ─────────────────── */}
            {tab === 'training' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">Rekomendasi Jadwal Mingguan</h2>
                </div>
                <TrainingPlan
                  activities={data.running_activities}
                  programStyle={programStyle}
                  goal={goal}
                  paces={paces}
                  latestSleepScore={latestSleepScore}
                  actualBestPace={actualBestPace}
                  targetPace={targetPace}
                  selectedDays={selectedDays}
                />

                <div className="info-card purple" style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Tips:</strong> Naikkan volume maksimal <strong>10% per minggu</strong>.
                    Jangan "balas dendam" lari jauh tiba-tiba setelah beberapa hari off — cedera bisa menghancurkan progress berbulan-bulan.
                    Konsistensi jauh lebih valuable dari satu sesi epic!
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────── RACE PREDICTION ─────────────────── */}
            {tab === 'race' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">Race Prediction</h2>
                </div>
                <RacePrediction activities={runActs} targetPace={targetPace} />
              </div>
            )}

            {/* ─────────────────── RUN HISTORY ─────────────────── */}
            {tab === 'history' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">Riwayat Sesi Lari ({totalSessions})</h2>
                </div>
                <RunHistory activities={runActs} />
              </div>
            )}

            {/* ─────────────────── SLEEP ANALYSIS ─────────────────── */}
            {tab === 'sleep' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">Analisis Tidur</h2>
                </div>

                {Object.keys(sleepRecs).length === 0 ? (
                  <div className="info-card">
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Belum ada data tidur. Catat tidur lo via sidebar atau upload file Garmin.</p>
                  </div>
                ) : (
                  <>
                    {latestSleepDate && (
                      <div className={`alert ${latestSleepScore >= 80 ? 'alert-success' : latestSleepScore >= 60 ? 'alert-warning' : 'alert-danger'}`} style={{ marginBottom: 20 }}>
                        <strong>Skor Tidur Terbaru ({latestSleepDate}):</strong> {latestSleepScore}/100{' '}
                        {latestSleepScore >= 80 ? '— Prima! Siap latihan keras.' : latestSleepScore >= 60 ? '— Cukup, tapi jangan overpush.' : '— Drop. Prioritaskan recovery dulu.'}
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                      {Object.entries(sleepRecs).sort(([a], [b]) => b.localeCompare(a)).map(([date, rec]) => {
                        const s = rec.score;
                        const color = s >= 80 ? '#34d399' : s >= 60 ? '#fbbf24' : '#fb7185';
                        return (
                          <div className="info-card" key={date} style={{ borderColor: `${color}30`, background: `${color}06` }}>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                              {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                              {runDates.has(date) && <span className="badge badge-easy" style={{ marginLeft: 8, padding: '1px 6px', fontSize: 10 }}>Lari</span>}
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 800, color }}>
                              {s}<span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>/100</span>
                            </div>
                            {rec.duration && (
                              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{rec.duration.toFixed(1)} jam</div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <Toast toasts={toasts} />
    </div>
  );
}

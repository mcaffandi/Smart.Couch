import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
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
import {
  auth,
  signOut,
  onAuthStateChanged,
  isConfigured as isFirebaseConfigured
} from './firebase';

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
  const isNull = value === null || value === undefined;
  const m = isNull ? '' : Math.floor(value);
  const s = isNull ? '' : Math.round((value - Math.floor(value)) * 60);

  const setM = (newM) => onChange(newM + (isNull ? 0 : (typeof s === 'number' ? s : 0)) / 60);
  const setS = (newS) => onChange((isNull ? 5 : (typeof m === 'number' ? m : 5)) + newS / 60);

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="number-input-group" style={{ flex: 1 }}>
          <button type="button" onClick={() => setM(Math.max(3, (isNull ? 5 : m) - 1))}>−</button>
          <input
            type="number"
            value={m}
            placeholder="—"
            onChange={e => setM(Math.max(3, parseInt(e.target.value) || 0))}
            style={{ textAlign: 'center', color: isNull ? 'var(--text-muted)' : 'var(--text-primary)' }}
          />
          <button type="button" onClick={() => setM(Math.min(15, (isNull ? 5 : m) + 1))}>+</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', fontWeight: 900, color: 'var(--text-muted)' }}>:</div>
        <div className="number-input-group" style={{ flex: 1 }}>
          <button type="button" onClick={() => setS((isNull ? 0 : s) - 5 < 0 ? 55 : (isNull ? 0 : s) - 5)}>−</button>
          <input
            type="number"
            value={s}
            placeholder="—"
            onChange={e => setS(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
            style={{ textAlign: 'center', color: isNull ? 'var(--text-muted)' : 'var(--text-primary)' }}
          />
          <button type="button" onClick={() => setS((isNull ? 0 : s) + 5 >= 60 ? 0 : (isNull ? 0 : s) + 5)}>+</button>
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
  const [age, setAge] = useState(() => data.profile?.age ?? null);
  const [displayName, setDisplayName] = useState(() => data.profile?.displayName ?? '');
  const [weight, setWeight] = useState(() => data.profile?.weight ?? null);
  const [height, setHeight] = useState(() => data.profile?.height ?? null);
  const [gender, setGender] = useState(() => data.profile?.gender ?? '');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editDraft, setEditDraft] = useState({});
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [goal, setGoal] = useState(() => data.profile?.goal ?? 'maintenance');
  const [programStyle, setProgramStyle] = useState(() => data.profile?.programStyle ?? 'sedang');
  const [targetPace, setTargetPace] = useState(() => data.profile?.targetPace ?? null);
  const [selectedDays, setSelectedDays] = useState(() => data.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userIdentifier = fbUser.email || fbUser.displayName || `Anonim-${fbUser.uid.substring(0, 4)}`;
        setSessionUser(userIdentifier);
        sessionStorage.setItem('smartcoach_session', userIdentifier);

        setUsersList(prev => {
          if (!prev.includes(userIdentifier)) {
            const updated = [...prev, userIdentifier];
            saveUsersList(updated);
            return updated;
          }
          return prev;
        });

        setCurrentUser(userIdentifier);
        saveCurrentUser(userIdentifier);
        const uData = loadUserData(userIdentifier);
        setData(uData);
        setAge(uData.profile?.age ?? null);
        setDisplayName(uData.profile?.displayName ?? '');
        setWeight(uData.profile?.weight ?? null);
        setHeight(uData.profile?.height ?? null);
        setGender(uData.profile?.gender ?? '');
        setGoal(uData.profile?.goal ?? 'maintenance');
        setProgramStyle(uData.profile?.programStyle ?? 'sedang');
        setTargetPace(uData.profile?.targetPace ?? null);
        setSelectedDays(uData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);
      }
    });

    return () => unsubscribe();
  }, []);

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
    setAge(uData.profile?.age ?? null);
    setDisplayName(uData.profile?.displayName ?? '');
    setWeight(uData.profile?.weight ?? null);
    setHeight(uData.profile?.height ?? null);
    setGender(uData.profile?.gender ?? '');
    setGoal(uData.profile?.goal ?? 'maintenance');
    setProgramStyle(uData.profile?.programStyle ?? 'sedang');
    setTargetPace(uData.profile?.targetPace ?? null);
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

  const downloadExcelTemplate = () => {
    try {
      const wb = XLSX.utils.book_new();

      // Sheet 1: Riwayat Lari
      const runHeaders = [
        ["Tanggal (YYYY-MM-DD)", "Nama Aktivitas", "Jarak (km)", "Durasi (menit)", "Avg HR (bpm)", "Max HR (bpm)"],
        ["2026-05-20", "Morning Run BSD", 5.2, 32, 142, 168],
        ["2026-05-18", "Easy Run Senayan", 8.0, 52, 138, 155]
      ];
      const wsRuns = XLSX.utils.aoa_to_sheet(runHeaders);

      wsRuns['!cols'] = [
        { wch: 22 }, // Tanggal
        { wch: 25 }, // Nama Aktivitas
        { wch: 12 }, // Jarak
        { wch: 15 }, // Durasi
        { wch: 14 }, // Avg HR
        { wch: 14 }  // Max HR
      ];
      XLSX.utils.book_append_sheet(wb, wsRuns, "Riwayat Lari");

      // Sheet 2: Kualitas Tidur
      const sleepHeaders = [
        ["Tanggal (YYYY-MM-DD)", "Skor Tidur (1-100)", "Durasi Tidur (jam)"],
        ["2026-05-20", 85, 7.5],
        ["2026-05-19", 68, 6.0]
      ];
      const wsSleep = XLSX.utils.aoa_to_sheet(sleepHeaders);
      wsSleep['!cols'] = [
        { wch: 22 }, // Tanggal
        { wch: 18 }, // Skor
        { wch: 18 }  // Durasi
      ];
      XLSX.utils.book_append_sheet(wb, wsSleep, "Kualitas Tidur");

      XLSX.writeFile(wb, "Template_Data_EnduraUP.xlsx");
      addToast("Template Excel terunduh!");
    } catch (e) {
      console.error(e);
      addToast("Gagal mengunduh template Excel", "error");
    }
  };

  const handleExcelUpload = async (file) => {
    if (!file) return;
    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const dataArr = new Uint8Array(e.target.result);
          const workbook = XLSX.read(dataArr, { type: 'array' });

          let newRuns = [];
          let newSleep = {};
          let maxHrFound = 0;

          const parseExcelDateVal = (val) => {
            if (!val) return null;
            if (typeof val === 'number') {
              const date = new Date(Math.round((val - 25569) * 86400 * 1000));
              return isNaN(date.getTime()) ? null : date;
            }
            const date = new Date(val);
            return isNaN(date.getTime()) ? null : date;
          };

          // Process "Riwayat Lari" sheet
          const runSheetName = workbook.SheetNames.find(name =>
            name.toLowerCase().includes('lari') || name.toLowerCase().includes('run')
          );
          if (runSheetName) {
            const runSheet = workbook.Sheets[runSheetName];
            const runRows = XLSX.utils.sheet_to_json(runSheet);
            runRows.forEach(row => {
              const keys = Object.keys(row);
              const dateKey = keys.find(k => k.toLowerCase().includes('tanggal') || k.toLowerCase().includes('date'));
              const nameKey = keys.find(k => k.toLowerCase().includes('nama') || k.toLowerCase().includes('activity') || k.toLowerCase().includes('name'));
              const distKey = keys.find(k => k.toLowerCase().includes('jarak') || k.toLowerCase().includes('distance'));
              const durKey = keys.find(k => k.toLowerCase().includes('durasi') || k.toLowerCase().includes('duration'));
              const avgHrKey = keys.find(k => k.toLowerCase().includes('avg') || k.toLowerCase().includes('rata-rata'));
              const maxHrKey = keys.find(k => k.toLowerCase().includes('max') || k.toLowerCase().includes('maks'));

              const dateVal = dateKey ? row[dateKey] : null;
              const nameVal = nameKey ? row[nameKey] : "Lari Excel";
              const distVal = distKey ? parseFloat(row[distKey]) : null;
              const durVal = durKey ? parseFloat(row[durKey]) : null;
              const avgHrVal = avgHrKey ? parseInt(row[avgHrKey]) : null;
              const maxHrVal = maxHrKey ? parseInt(row[maxHrKey]) : null;

              const parsedDate = parseExcelDateVal(dateVal);
              if (parsedDate && distVal !== null && !isNaN(distVal) && durVal !== null && !isNaN(durVal)) {
                newRuns.push({
                  startTimeLocal: parsedDate.getTime(),
                  distance: distVal * 100000, // km to cm
                  duration: durVal * 60000,    // minutes to ms
                  avgHr: avgHrVal && !isNaN(avgHrVal) ? avgHrVal : null,
                  maxHr: maxHrVal && !isNaN(maxHrVal) ? maxHrVal : null,
                  activityType: 'running',
                  name: String(nameVal).trim(),
                });
                if (maxHrVal && !isNaN(maxHrVal) && maxHrVal > maxHrFound) {
                  maxHrFound = maxHrVal;
                }
              }
            });
          }

          // Process "Kualitas Tidur" sheet
          const sleepSheetName = workbook.SheetNames.find(name =>
            name.toLowerCase().includes('tidur') || name.toLowerCase().includes('sleep')
          );
          if (sleepSheetName) {
            const sleepSheet = workbook.Sheets[sleepSheetName];
            const sleepRows = XLSX.utils.sheet_to_json(sleepSheet);
            sleepRows.forEach(row => {
              const keys = Object.keys(row);
              const dateKey = keys.find(k => k.toLowerCase().includes('tanggal') || k.toLowerCase().includes('date'));
              const scoreKey = keys.find(k => k.toLowerCase().includes('skor') || k.toLowerCase().includes('score') || k.toLowerCase().includes('kualitas'));
              const durKey = keys.find(k => k.toLowerCase().includes('durasi') || k.toLowerCase().includes('duration') || k.toLowerCase().includes('tidur'));

              const dateVal = dateKey ? row[dateKey] : null;
              const scoreVal = scoreKey ? parseInt(row[scoreKey]) : null;
              const durVal = durKey ? parseFloat(row[durKey]) : null;

              const parsedDate = parseExcelDateVal(dateVal);
              if (parsedDate && scoreVal !== null && !isNaN(scoreVal)) {
                const dateStr = parsedDate.toISOString().split('T')[0];
                newSleep[dateStr] = {
                  score: Math.min(100, Math.max(0, scoreVal)),
                  duration: durVal && !isNaN(durVal) ? durVal : 7.0
                };
              }
            });
          }

          if (newRuns.length === 0 && Object.keys(newSleep).length === 0) {
            addToast('Tidak ada data lari atau tidur yang valid ditemukan di file Excel.', 'error');
            setIsUploading(false);
            return;
          }

          // Merge and save
          const mergedRuns = [...data.running_activities];
          newRuns.forEach(r => {
            const idx = mergedRuns.findIndex(ex => ex.startTimeLocal === r.startTimeLocal);
            if (idx === -1) {
              mergedRuns.push(r);
            } else {
              mergedRuns[idx] = { ...mergedRuns[idx], ...r };
            }
          });

          const mergedSleep = { ...data.sleep_records, ...newSleep };
          const mergedMaxHr = Math.max(data.max_hr || 0, maxHrFound);

          const updated = {
            ...data,
            running_activities: mergedRuns,
            sleep_records: mergedSleep,
            max_hr: mergedMaxHr,
            profile: { age, goal, programStyle, targetPace, selectedDays }
          };

          setData(updated);
          saveUserData(currentUser, updated);
          addToast(`Import Excel Berhasil: ${newRuns.length} sesi lari & ${Object.keys(newSleep).length} data tidur.`);
          setSidebarOpen(false);
        } catch (err) {
          console.error(err);
          addToast('Gagal memproses file Excel. Cek format template.', 'error');
        }
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (e) {
      console.error(e);
      addToast('Gagal membaca file Excel.', 'error');
      setIsUploading(false);
    }
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
      profile: { age, displayName, weight, height, gender, goal, programStyle, targetPace, selectedDays }
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

      {/* ── Profile Edit Modal Overlay ───────────────────────────────────────── */}
      {showProfileModal && (() => {
        const d = editDraft;
        const curName = displayName || '';
        const curAge = age;
        const curGender = gender;
        const curWeight = weight;
        const curHeight = height;
        const initials = (curName || currentUser).substring(0, 2).toUpperCase();
        const bmi = curWeight && curHeight ? (curWeight / ((curHeight / 100) ** 2)).toFixed(1) : null;
        const bmiCat = bmi ? (bmi < 18.5 ? { l: 'Underweight', c: '#60a5fa' } : bmi < 25 ? { l: 'Normal', c: '#34d399' } : bmi < 30 ? { l: 'Overweight', c: '#fbbf24' } : { l: 'Obese', c: '#fb7185' }) : null;

        const inp = { background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 500, padding: '9px 12px', width: '100%', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' };
        const lbl = { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 5 };
        const onF = e => (e.target.style.borderColor = 'var(--accent-purple)');
        const onB = e => (e.target.style.borderColor = 'var(--border)');

        const closeModal = () => { setEditDraft({}); setProfileEditMode(false); setShowProfileModal(false); };

        // ── Stat chip (view mode) ────────────────────────────────────────────────
        const Stat = ({ label, value, unit }) => (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: value ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: value ? 'normal' : 'italic' }}>
              {value ? <>{value}<span style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 2 }}>{unit}</span></> : '—'}
            </div>
          </div>
        );

        return (
          <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, maxHeight: '92vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ padding: '18px 18px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--border)' }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: curName ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: curName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {curName || 'Belum ada nama'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser}</div>
                </div>
                <button onClick={closeModal}
                  style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-muted)', cursor: 'pointer', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontFamily: 'inherit', flexShrink: 0 }}
                >×</button>
              </div>

              <div style={{ padding: '18px', display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* ── VIEW MODE ── */}
                {!profileEditMode ? (<>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <Stat label="Umur" value={curAge} unit="thn" />
                    <Stat label="Kelamin" value={curGender === 'pria' ? 'Pria' : curGender === 'wanita' ? 'Wanita' : null} unit="" />
                    <Stat label="Berat" value={curWeight} unit="kg" />
                    <Stat label="Tinggi" value={curHeight} unit="cm" />
                  </div>
                  {bmiCat && (
                    <div style={{ background: `${bmiCat.c}12`, border: `1px solid ${bmiCat.c}40`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>BMI</span>
                      <span style={{ fontSize: 16, fontWeight: 800, color: bmiCat.c }}>{bmi} <span style={{ fontSize: 11, fontWeight: 600 }}>— {bmiCat.l}</span></span>
                    </div>
                  )}
                  <button onClick={() => { setEditDraft({ displayName: curName, age: curAge, gender: curGender, weight: curWeight, height: curHeight }); setProfileEditMode(true); }}
                    style={{ padding: '10px', borderRadius: 8, background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, width: '100%' }}
                  >Edit Profil</button>
                </>) : (<>

                {/* ── EDIT MODE ── */}
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Identitas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div>
                      <label style={lbl}>Nama Tampilan</label>
                      <input autoFocus type="text" placeholder="Nama kamu..." style={inp}
                        value={d.displayName ?? ''} onChange={e => setEditDraft(p => ({ ...p, displayName: e.target.value }))} onFocus={onF} onBlur={onB} />
                    </div>
                    <div>
                      <label style={lbl}>Akun / Email</label>
                      <input type="text" style={{ ...inp, color: 'var(--text-muted)', cursor: 'not-allowed' }} value={currentUser} readOnly />
                    </div>
                  </div>

                  <div style={{ height: 1, background: 'var(--border)' }} />
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Data Fisik</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={lbl}>Umur (tahun)</label>
                      <input type="number" min={10} max={100} placeholder="—" style={inp}
                        value={d.age ?? ''} onChange={e => { const v = e.target.value; setEditDraft(p => ({ ...p, age: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
                    </div>
                    <div>
                      <label style={lbl}>Jenis Kelamin</label>
                      <select style={{ ...inp, cursor: 'pointer' }} value={d.gender ?? ''} onChange={e => setEditDraft(p => ({ ...p, gender: e.target.value }))} onFocus={onF} onBlur={onB}>
                        <option value="">— Pilih —</option>
                        <option value="pria">Pria</option>
                        <option value="wanita">Wanita</option>
                      </select>
                    </div>
                    <div>
                      <label style={lbl}>Berat (kg)</label>
                      <input type="number" min={30} max={200} step={0.5} placeholder="—" style={inp}
                        value={d.weight ?? ''} onChange={e => { const v = e.target.value; setEditDraft(p => ({ ...p, weight: v === '' ? null : parseFloat(v) || null })); }} onFocus={onF} onBlur={onB} />
                    </div>
                    <div>
                      <label style={lbl}>Tinggi (cm)</label>
                      <input type="number" min={100} max={250} placeholder="—" style={inp}
                        value={d.height ?? ''} onChange={e => { const v = e.target.value; setEditDraft(p => ({ ...p, height: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
                    </div>
                  </div>

                  {/* Live BMI in edit mode */}
                  {(() => { const ew = d.weight; const eh = d.height; if (!ew || !eh) return null; const eb = (ew / ((eh / 100) ** 2)).toFixed(1); const ec = eb < 18.5 ? { l: 'Underweight', c: '#60a5fa' } : eb < 25 ? { l: 'Normal', c: '#34d399' } : eb < 30 ? { l: 'Overweight', c: '#fbbf24' } : { l: 'Obese', c: '#fb7185' }; return <div style={{ background: `${ec.c}12`, border: `1px solid ${ec.c}40`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>BMI</span><span style={{ fontSize: 15, fontWeight: 800, color: ec.c }}>{eb} <span style={{ fontSize: 11, fontWeight: 600 }}>— {ec.l}</span></span></div>; })()}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setEditDraft({}); setProfileEditMode(false); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}
                    >Batal</button>
                    <button onClick={() => {
                      if (d.displayName !== undefined) setDisplayName(d.displayName.trim());
                      if (d.age !== undefined) setAge(d.age);
                      if (d.weight !== undefined) setWeight(d.weight);
                      if (d.height !== undefined) setHeight(d.height);
                      if (d.gender !== undefined) setGender(d.gender);
                      setEditDraft({}); setProfileEditMode(false); setShowProfileModal(false);
                    }}
                      style={{ flex: 2, padding: '10px', borderRadius: 8, background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}
                    >✓ Simpan</button>
                  </div>
                </>)}
              </div>
            </div>
          </div>
        );
      })()}


      {/* Mobile Top Bar Header */}
      <header className="mobile-header">
        <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={24} />
          <div>
            <div className="sidebar-logo-text">EnduraUP</div>
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
              <div className="sidebar-logo-text">EnduraUP</div>
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
        <div>
          <div className="sidebar-section-title" style={{ marginBottom: 8 }}>Akun Aktif</div>
          <button
            type="button"
            onClick={() => { setEditDraft({}); setProfileEditMode(false); setShowProfileModal(true); }}
            style={{
              width: '100%', background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '10px 12px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              transition: 'border-color 0.15s, background 0.15s', textAlign: 'left',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(129,140,248,0.5)'; e.currentTarget.style.background = 'var(--bg-card-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg-card)'; }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 800, color: '#fff',
            }}>
              {(displayName || currentUser).substring(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: displayName ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: displayName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || 'Isi nama profil...'}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentUser}</div>
            </div>
          </button>
        </div>

        <div className="sidebar-divider" />

        {/* Profile */}
        <div>
          <div className="sidebar-section-title">User Profile</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Age — empty/grey placeholder when not set */}
            <div className="form-group">
              <label className="form-label">Umur</label>
              <div className="number-input-group">
                <button type="button" onClick={() => setAge(prev => Math.max(10, (prev ?? 25) - 1))}>−</button>
                <input
                  type="number"
                  value={age ?? ''}
                  min={10}
                  max={100}
                  placeholder="—"
                  onChange={e => {
                    const v = e.target.value;
                    setAge(v === '' ? null : Math.min(100, Math.max(10, parseInt(v) || 10)));
                  }}
                  style={{ color: age === null ? 'var(--text-muted)' : 'var(--text-primary)' }}
                />
                <button type="button" onClick={() => setAge(prev => Math.min(100, (prev ?? 24) + 1))}>+</button>
              </div>
            </div>

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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sidebar-section-title" style={{ marginBottom: 0 }}>Impor / Tambah Data</div>

          {/* Unified Upload Area */}
          <div>
            <input
              ref={fileInputRef} type="file" accept=".zip,.gpx,.xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const name = file.name.toLowerCase();
                if (name.endsWith('.zip') || name.endsWith('.gpx')) {
                  handleFileUpload(file);
                } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                  handleExcelUpload(file);
                } else {
                  addToast('Format file tidak didukung', 'error');
                }
              }}
            />
            <div
              className={`file-upload-area ${isUploading ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer' }}
            >
              {isUploading ? (
                <div>
                  <div className="loading-bar" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Memproses data…</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>Upload data lari / tidur</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    Format: .zip, .gpx, .xlsx, .csv (maks 200MB)
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        downloadExcelTemplate();
                      }}
                      style={{
                        fontSize: 11,
                        color: '#60a5fa',
                        textDecoration: 'underline',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Unduh template Excel / CSV
                    </span>
                  </div>
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
          onClick={async () => {
            if (isFirebaseConfigured && auth.currentUser) {
              try {
                await signOut(auth);
              } catch (e) {
                console.error("Signout error", e);
              }
            }
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
            <h1 className="page-title" style={{ margin: 0 }}>EnduraUP</h1>
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
              <div
                className="empty-step"
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
                onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                <div className="empty-step-num">2</div>
                <div>
                  <strong>Impor via Excel / CSV</strong> untuk menambahkan riwayat lari dan data tidur sekaligus.{' '}
                  <span
                    onClick={e => { e.stopPropagation(); downloadExcelTemplate(); }}
                    style={{ textDecoration: 'underline', color: '#60a5fa', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    Unduh template di sini
                  </span>
                  {' '}atau klik kotak ini untuk mengunggah file.
                </div>
              </div>
              <div className="empty-step">
                <div className="empty-step-num">3</div>
                <div><strong>Atau input manual</strong> sesi lari &amp; tidur atau set profil (umur, goal, target pace) melalui sidebar kiri.</div>
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

                    <div className="sleep-history-grid">
                      {Object.entries(sleepRecs).sort(([a], [b]) => b.localeCompare(a)).map(([date, rec]) => {
                        const s = rec.score;
                        const color = s >= 80 ? '#34d399' : s >= 60 ? '#fbbf24' : '#fb7185';
                        return (
                          <div className="sleep-history-card" key={date} style={{ borderColor: `${color}30`, background: `${color}06` }}>
                            <div className="sleep-card-left">
                              <div className="sleep-card-date">
                                {new Date(date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                {runDates.has(date) && <span className="badge badge-easy" style={{ marginLeft: 8, padding: '1px 6px', fontSize: 10 }}>Lari</span>}
                              </div>
                              {rec.duration && (
                                <div className="sleep-card-dur">{rec.duration.toFixed(1)} jam tidur</div>
                              )}
                            </div>
                            <div className="sleep-card-right" style={{ color }}>
                              <span className="sleep-score-big">{s}</span>
                              <span className="sleep-score-lbl">/100</span>
                            </div>
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

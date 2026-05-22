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
  db,
  signOut,
  onAuthStateChanged,
  isConfigured as isFirebaseConfigured
} from './firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

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
    <div className="form-group" style={{ opacity: isNull ? 0.75 : 1 }}>
      {label && <label className="form-label">{label}</label>}
      <div style={{ display: 'flex', gap: 6 }}>
        <div className="number-input-group" style={{ flex: 1, border: isNull ? '1px dashed var(--border)' : '1px solid var(--border)' }}>
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
        <div className="number-input-group" style={{ flex: 1, border: isNull ? '1px dashed var(--border)' : '1px solid var(--border)' }}>
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
  const [avatar, setAvatar] = useState(() => data.profile?.avatar ?? null);
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
        setAvatar(uData.profile?.avatar ?? null);
        setGoal(uData.profile?.goal ?? 'maintenance');
        setProgramStyle(uData.profile?.programStyle ?? 'sedang');
        setTargetPace(uData.profile?.targetPace ?? null);
        setSelectedDays(uData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);
        
        syncFromFirestore(userIdentifier);
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

  // ── State: share performance card modal ──────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTemplate, setShareTemplate] = useState('vo2');
  const [shareTheme, setShareTheme] = useState('dark');
  const [retroImageLoaded, setRetroImageLoaded] = useState(false);
  const retroImageRef = useRef(null);

  useEffect(() => {
    const img = new Image();
    img.src = '/retro_sunrise.jpg';
    img.onload = () => {
      retroImageRef.current = img;
      setRetroImageLoaded(true);
    };
  }, []);

  // ── State: user profiles ─────────────────────────────────────────────────────
  const syncFromFirestore = useCallback(async (username) => {
    if (!isFirebaseConfigured || !auth.currentUser) return;
    const userIdentifier = auth.currentUser.email || auth.currentUser.displayName || `Anonim-${auth.currentUser.uid.substring(0, 4)}`;
    if (username !== userIdentifier) return;

    try {
      const userDocRef = doc(db, 'users', username);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const cloudData = userDocSnap.data();
        setData(cloudData);
        setAge(cloudData.profile?.age ?? null);
        setDisplayName(cloudData.profile?.displayName ?? '');
        setWeight(cloudData.profile?.weight ?? null);
        setHeight(cloudData.profile?.height ?? null);
        setGender(cloudData.profile?.gender ?? '');
        setAvatar(cloudData.profile?.avatar ?? null);
        setGoal(cloudData.profile?.goal ?? 'maintenance');
        setProgramStyle(cloudData.profile?.programStyle ?? 'sedang');
        setTargetPace(cloudData.profile?.targetPace ?? null);
        setSelectedDays(cloudData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);
        localStorage.setItem(`smartcoach_data_user_${username}`, JSON.stringify(cloudData));
      } else {
        const localData = loadUserData(username);
        await setDoc(userDocRef, localData);
      }
    } catch (e) {
      console.error('Failed to sync from Firestore:', e);
    }
  }, []);

  const saveAndSyncData = useCallback((updatedData) => {
    setData(updatedData);
    saveUserData(currentUser, updatedData);
    if (isFirebaseConfigured && auth.currentUser) {
      const userIdentifier = auth.currentUser.email || auth.currentUser.displayName || `Anonim-${auth.currentUser.uid.substring(0, 4)}`;
      if (currentUser === userIdentifier) {
        const userDocRef = doc(db, 'users', userIdentifier);
        setDoc(userDocRef, updatedData).catch(e => {
          console.error('Failed to sync save to Firestore:', e);
        });
      }
    }
  }, [currentUser]);

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
    setAvatar(uData.profile?.avatar ?? null);
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

    if (isFirebaseConfigured && auth.currentUser) {
      const userIdentifier = auth.currentUser.email || auth.currentUser.displayName || `Anonim-${auth.currentUser.uid.substring(0, 4)}`;
      if (currentUser === userIdentifier) {
        deleteDoc(doc(db, 'users', currentUser)).catch(e => {
          console.error('Failed to delete doc from Firestore:', e);
        });
      }
    }

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

  const vo2max = useMemo(() => {
    if (!actualBestPace) return null;
    const vel = 1000 / actualBestPace; // m/min
    const o2 = -4.60 + 0.182258 * vel + 0.000104 * vel * vel;
    const result = Math.round(o2 / 0.85);
    return Math.min(90, Math.max(10, result));
  }, [actualBestPace]);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!showShareModal || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set resolution: 1080x1080 for high resolution square post
    canvas.width = 1080;
    canvas.height = 1080;

    // Draw background based on theme
    if (shareTheme === 'dark') {
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#09090b');
      grad.addColorStop(1, '#18181b');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Spotlight glow
      const radial = ctx.createRadialGradient(200, 200, 50, 200, 200, 600);
      radial.addColorStop(0, 'rgba(167, 139, 250, 0.08)');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (shareTheme === 'cyber') {
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#020617');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Pink glow
      const radialPink = ctx.createRadialGradient(900, 100, 50, 900, 100, 500);
      radialPink.addColorStop(0, 'rgba(236, 72, 153, 0.08)');
      radialPink.addColorStop(1, 'transparent');
      ctx.fillStyle = radialPink;
      ctx.fillRect(0, 0, 1080, 1080);

      // Cyan glow
      const radialCyan = ctx.createRadialGradient(100, 900, 50, 100, 900, 500);
      radialCyan.addColorStop(0, 'rgba(6, 182, 212, 0.08)');
      radialCyan.addColorStop(1, 'transparent');
      ctx.fillStyle = radialCyan;
      ctx.fillRect(0, 0, 1080, 1080);
    } else if (shareTheme === 'sunrise') {
      // Cream base
      ctx.fillStyle = '#fdf8f0';
      ctx.fillRect(0, 0, 1080, 1080);
      // TOP IMAGE ZONE: retro image in top 38% — COVER (no stretch, crop center)
      if (retroImageRef.current) {
        const img = retroImageRef.current;
        const tW = 1080, tH = 420;
        const imgAspect = img.naturalWidth / img.naturalHeight;
        const tAspect   = tW / tH;
        let srcX, srcY, srcW, srcH;
        if (imgAspect > tAspect) {
          // image wider → crop left/right
          srcH = img.naturalHeight;
          srcW = img.naturalHeight * tAspect;
          srcX = (img.naturalWidth - srcW) / 2;
          srcY = 0;
        } else {
          // image taller → crop top/bottom
          srcW = img.naturalWidth;
          srcH = img.naturalWidth / tAspect;
          srcX = 0;
          srcY = (img.naturalHeight - srcH) / 2;
        }
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(0, 0, tW, tH, [24, 24, 0, 0]); }
        else { ctx.rect(0, 0, tW, tH); }
        ctx.clip();
        ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, tW, tH);
        ctx.restore();
      }
    } else { // purple theme
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#311042');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);

      // Spotlight glow
      const radial = ctx.createRadialGradient(540, 540, 50, 540, 540, 700);
      radial.addColorStop(0, 'rgba(216, 180, 254, 0.05)');
      radial.addColorStop(1, 'transparent');
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, 1080, 1080);
    }

    const isLight = shareTheme === 'sunrise';
    
    // Core text colors — sunrise: dark warm text on white glass
    const textPrimary   = isLight ? '#1a120a' : '#ffffff';
    const textSecondary = isLight ? '#7c4a1e' : 'rgba(255, 255, 255, 0.5)';
    const textMuted     = isLight ? 'rgba(60, 35, 10, 0.55)' : 'rgba(255, 255, 255, 0.25)';
    const borderStroke  = isLight ? 'rgba(200, 120, 40, 0.35)' : (shareTheme === 'cyber' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(167, 139, 250, 0.2)');

    // 1. Draw Glassmorphic Card Backing
    // Sunrise → warm white frosted glass; others → dark
    const glassStyle = isLight
      ? 'rgba(255, 248, 235, 0.84)'
      : (shareTheme === 'cyber' ? 'rgba(2, 6, 23, 0.85)' : (shareTheme === 'dark' ? 'rgba(9, 9, 11, 0.85)' : 'rgba(30, 27, 75, 0.85)'));

    const fillRoundedRect = (cCtx, x, y, width, height, radius, fillStyle) => {
      cCtx.fillStyle = fillStyle;
      cCtx.beginPath();
      cCtx.moveTo(x + radius, y);
      cCtx.lineTo(x + width - radius, y);
      cCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
      cCtx.lineTo(x + width, y + height - radius);
      cCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      cCtx.lineTo(x + radius, y + height);
      cCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
      cCtx.lineTo(x, y + radius);
      cCtx.quadraticCurveTo(x, y, x + radius, y);
      cCtx.closePath();
      cCtx.fill();
    };

    // Hoist athlete name (used in both sunrise and dark header branches)
    const athleteName = displayName || (currentUser ? currentUser.split('@')[0] : 'PELARI');

    if (isLight) {
      // ── SUNRISE SPLIT LAYOUT ──────────────────────────────────────────────────
      // Brand in image zone (top-right) — larger for 1080px canvas
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = '800 52px Outfit, sans-serif';
      ctx.fillText('EnduraUP', 1030, 110);
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.font = '500 26px Inter, sans-serif';
      ctx.fillText('AI Running & Recovery Coach', 1030, 152);
      ctx.textAlign = 'left';

      // WHITE GLASS PANEL: bottom 62% (golden ratio major), rounded top
      const panelY = 420;
      ctx.beginPath();
      const pr = 48;
      ctx.moveTo(0, panelY + pr);
      ctx.arcTo(0, panelY, pr, panelY, pr);
      ctx.lineTo(1080 - pr, panelY);
      ctx.arcTo(1080, panelY, 1080, panelY + pr, pr);
      ctx.lineTo(1080, 1080); ctx.lineTo(0, 1080);
      ctx.closePath();
      ctx.fillStyle = 'rgba(255, 248, 235, 0.97)';
      ctx.fill();
      // Panel top border accent
      ctx.strokeStyle = 'rgba(192, 68, 10, 0.25)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(pr, panelY); ctx.lineTo(1080 - pr, panelY);
      ctx.stroke();

      // Athlete name at panel top — bigger
      ctx.fillStyle = '#1a120a';
      ctx.font = '700 46px Outfit, sans-serif';
      ctx.fillText(athleteName.toUpperCase(), 80, panelY + 64);
      ctx.fillStyle = 'rgba(124, 74, 30, 0.7)';
      ctx.font = '500 28px Inter, sans-serif';
      ctx.fillText('Performance Card', 80, panelY + 104);
      // Panel divider
      ctx.strokeStyle = 'rgba(160, 82, 28, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(80, panelY + 128); ctx.lineTo(1000, panelY + 128);
      ctx.stroke();

    } else {
      // ── DARK THEMES: standard inset card ─────────────────────────────────────
      fillRoundedRect(ctx, 60, 60, 960, 960, 24, glassStyle);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      for (let i = 80; i < 1000; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 80); ctx.lineTo(i, 960); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(80, i); ctx.lineTo(960, i); ctx.stroke();
      }
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 4;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(60, 60, 960, 960, 24); ctx.stroke(); }
      else { ctx.strokeRect(60, 60, 960, 960); }

      // Dark theme header
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 34px Outfit, sans-serif';
      ctx.fillText('EnduraUP', 100, 115);
      ctx.fillStyle = textSecondary;
      ctx.font = '500 17px Inter, sans-serif';
      ctx.fillText('AI Running & Recovery Coach', 100, 150);
      ctx.fillStyle = shareTheme === 'cyber' ? '#22d3ee' : '#a78bfa';
      ctx.font = '700 20px Inter, sans-serif';
      ctx.fillText(athleteName.toUpperCase(), 100, 182);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(100, 205); ctx.lineTo(980, 205); ctx.stroke();
    }

    // ── TEMPLATE CONTENT ──────────────────────────────────────────────────────
    // Sunrise and dark themes have SEPARATE layout blocks for clarity
    // Canvas: 1080×1080 | Panel starts: y=420 | Content starts: y=548

    if (isLight) {
      // ════════════════════════════════════════════════════════════════════
      // SUNRISE LAYOUT — all coordinates hardcoded, no overflow
      // Available: y=548 to y=960 (content) + y=960 to y=1080 (footer)
      // ════════════════════════════════════════════════════════════════════
      const lx = 80;   // left margin
      const rx = 1000; // right edge

      if (shareTemplate === 'vo2') {
        // Section label ── y=592
        ctx.fillStyle = textMuted;
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText('ESTIMASI VO2MAX', lx, 592);

        // Big number (150px) ── baseline y=748, cap top ~598 → nice gap after label
        ctx.fillStyle = '#c0440a';
        ctx.font = '700 150px Outfit, sans-serif';
        const textVal = vo2max ? vo2max.toFixed(0) : '–';
        ctx.fillText(textVal, lx, 748);

        // Unit ── y=790
        ctx.fillStyle = textSecondary;
        ctx.font = '500 32px Inter, sans-serif';
        ctx.fillText('ml/kg/min', lx, 790);

        // Separator ── y=828
        ctx.strokeStyle = 'rgba(160, 82, 28, 0.18)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(lx, 828); ctx.lineTo(rx, 828); ctx.stroke();

        // Fitness level ── y=886
        let fitnessLevel = 'Pemula';
        let fitnessDesc = 'Fokus pada konsistensi latihan dasar.';
        if (vo2max >= 62) { fitnessLevel = 'Elite / Profesional'; fitnessDesc = 'Performa puncak luar biasa.'; }
        else if (vo2max >= 57) { fitnessLevel = 'Sangat Baik (Top 10%)'; fitnessDesc = 'Tingkat kebugaran setara pelari kompetitif.'; }
        else if (vo2max >= 52) { fitnessLevel = 'Baik Sekali'; fitnessDesc = 'Kapasitas aerobik sangat kuat.'; }
        else if (vo2max >= 46) { fitnessLevel = 'Di Atas Rata-Rata'; fitnessDesc = 'Performa lari solid dan stabil.'; }
        else if (vo2max >= 38) { fitnessLevel = 'Rata-Rata'; fitnessDesc = 'Kondisi fisik sehat dan aktif.'; }
        else if (vo2max >= 30) { fitnessLevel = 'Di Bawah Rata-Rata'; fitnessDesc = 'Potensi peningkatan masih sangat besar.'; }

        ctx.fillStyle = textPrimary;
        ctx.font = '700 48px Outfit, sans-serif';
        ctx.fillText(fitnessLevel, lx, 886);

        // Fitness desc ── y=930
        ctx.fillStyle = textSecondary;
        ctx.font = '400 28px Inter, sans-serif';
        ctx.fillText(fitnessDesc, lx, 930);

      } else if (shareTemplate === 'stats') {
        // Section label ── y=592
        ctx.fillStyle = textMuted;
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText('RINGKASAN PERFORMA', lx, 592);

        const targetYear = (() => {
          let y = new Date().getFullYear();
          let acts = runActs.filter(a => a.startTimeLocal && new Date(a.startTimeLocal).getFullYear() === y);
          if (acts.length === 0 && runActs.length > 0) {
            const years = runActs.map(a => a.startTimeLocal ? new Date(a.startTimeLocal).getFullYear() : null).filter(Boolean);
            if (years.length > 0) y = Math.max(...years);
          }
          return y;
        })();

        const yearlyActs = runActs.filter(a => a.startTimeLocal && new Date(a.startTimeLocal).getFullYear() === targetYear);
        const yearlyDist = yearlyActs.reduce((s, a) => s + (a.distance ?? 0) / 100000, 0);
        const yearlySessions = yearlyActs.length;
        const hrActs = yearlyActs.filter(a => a.avgHr);
        const yearlyAvgHR = hrActs.length ? yearlyActs.reduce((s, a) => s + (a.avgHr ?? 0), 0) / hrActs.length : 0;
        const yearlyMaxHR = yearlyActs.reduce((max, a) => Math.max(max, a.maxHr ?? a.max_hr ?? 0), 0);

        // 2×2 grid — row1: y=630, row2: y=810 | col1: lx, col2: 580
        // Each metric: label(26px) → +104 value(80px) → +38 unit(24px)
        const drawM = (x, y, label, val, unit, color) => {
          ctx.fillStyle = textMuted;
          ctx.font = '600 26px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), x, y);
          ctx.fillStyle = color;
          ctx.font = '700 80px Outfit, sans-serif';
          ctx.fillText(val, x, y + 96);
          ctx.fillStyle = textSecondary;
          ctx.font = '500 24px Inter, sans-serif';
          ctx.fillText(unit.toUpperCase(), x, y + 132);
        };
        drawM(lx,  630, `Jarak (${targetYear})`,   yearlyDist.toFixed(1),                        'km',   '#c0440a');
        drawM(580, 630, `Latihan (${targetYear})`, yearlySessions.toString(),                    'sesi', '#2a9d8f');
        drawM(lx,  810, 'HR Rerata',               yearlyAvgHR ? Math.round(yearlyAvgHR).toString() : '–', 'bpm', '#0d626c');
        drawM(580, 810, 'HR Maks',                 yearlyMaxHR ? yearlyMaxHR.toString() : '–',   'bpm', '#b45309');

      } else { // race predictions
        // Section label ── y=592
        ctx.fillStyle = textMuted;
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText('PREDIKSI WAKTU RACE', lx, 592);

        const RIEGEL = 1.06;
        const RACES = [
          { label: '5 KM',          dist: 5000,  color: '#c0440a' },
          { label: '10 KM',         dist: 10000, color: '#2a9d8f' },
          { label: 'HALF MARATHON', dist: 21097, color: '#b45309' },
          { label: 'MARATHON',      dist: 42195, color: '#0d626c' }
        ];
        const bestRuns = runActs
          .filter(a => a.distance >= 300000 && a.duration > 0)
          .map(a => ({ distM: a.distance / 100, durationSec: a.duration / 1000, paceMinKm: (a.duration / 60000) / (a.distance / 100000) }))
          .filter(a => a.paceMinKm >= 3 && a.paceMinKm <= 20)
          .sort((a, b) => a.paceMinKm - b.paceMinKm);
        const ref = bestRuns[0] || (targetPace ? { distM: 5000, durationSec: targetPace * 60 * 5, paceMinKm: targetPace } : null);
        if (ref) {
          // 4 rows step 82px, starts at y=612, ends at 858. 
          // Bar height 68px, text ends at y=920. Perfect spacing above footer at 962.
          RACES.forEach((r, idx) => {
            const predSec = ref.durationSec * Math.pow(r.dist / ref.distM, RIEGEL);
            const h = Math.floor(predSec / 3600);
            const m = Math.floor((predSec % 3600) / 60);
            const sec = Math.round(predSec % 60);
            const timeStr = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
            const rowY = 612 + idx * 82;
            ctx.fillStyle = r.color;
            ctx.fillRect(lx, rowY, 6, 68);
            ctx.fillStyle = textMuted;
            ctx.font = '600 20px Inter, sans-serif';
            ctx.fillText(r.label, lx + 20, rowY + 18);
            ctx.fillStyle = textPrimary;
            ctx.font = '700 46px Outfit, sans-serif';
            ctx.fillText(timeStr, lx + 20, rowY + 62);
          });
        }
      }

      // ── SUNRISE FOOTER ── y=960 to y=1080
      ctx.strokeStyle = 'rgba(160, 82, 28, 0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(lx, 962); ctx.lineTo(rx, 962); ctx.stroke();
      ctx.fillStyle = textMuted;
      ctx.font = '400 22px Inter, sans-serif';
      ctx.fillText('Dibuat otomatis oleh EnduraUP AI Engine', lx, 994);
      ctx.fillStyle = '#c0440a';
      ctx.font = '600 26px Inter, sans-serif';
      ctx.fillText('enduraup.vercel.app', lx, 1034);

    } else {
      // ════════════════════════════════════════════════════════════════════
      // DARK THEMES LAYOUT — harmonized font scale
      // Canvas: 1080×1080 | Card: y=60 to y=1020 | Header: y=115-205
      // ════════════════════════════════════════════════════════════════════
      const p0 = 205;  // content start (after header divider)
      const px = 100;
      const pw = 980;

      if (shareTemplate === 'vo2') {
        // Section label ── 24px (was 20px)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText('ESTIMASI VO2MAX', px, p0 + 44);

        // Main number ── 160px (was 200px — too dominant)
        // Baseline at ~490, cap top ~360, nicely centred in upper half
        ctx.fillStyle = shareTheme === 'cyber' ? '#06b6d4' : '#818cf8';
        ctx.font = '700 160px Outfit, sans-serif';
        const textVal = vo2max ? vo2max.toFixed(0) : '–';
        ctx.fillText(textVal, px, 490);

        // Unit ── 28px (was 22px)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '500 28px Inter, sans-serif';
        ctx.fillText('ml/kg/min', px, 530);

        // Separator
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, 565); ctx.lineTo(pw, 565); ctx.stroke();

        // Fitness level ── 44px (was 34px)
        let fitnessLevel = 'Pemula';
        let fitnessDesc = 'Fokus pada konsistensi latihan dasar.';
        if (vo2max >= 62) { fitnessLevel = 'Elite / Profesional'; fitnessDesc = 'Performa puncak luar biasa.'; }
        else if (vo2max >= 57) { fitnessLevel = 'Sangat Baik (Top 10%)'; fitnessDesc = 'Tingkat kebugaran setara pelari kompetitif.'; }
        else if (vo2max >= 52) { fitnessLevel = 'Baik Sekali'; fitnessDesc = 'Kapasitas aerobik sangat kuat.'; }
        else if (vo2max >= 46) { fitnessLevel = 'Di Atas Rata-Rata'; fitnessDesc = 'Performa lari solid dan stabil.'; }
        else if (vo2max >= 38) { fitnessLevel = 'Rata-Rata'; fitnessDesc = 'Kondisi fisik sehat dan aktif.'; }
        else if (vo2max >= 30) { fitnessLevel = 'Di Bawah Rata-Rata'; fitnessDesc = 'Potensi peningkatan masih sangat besar.'; }

        ctx.fillStyle = '#ffffff';
        ctx.font = '700 44px Outfit, sans-serif';
        ctx.fillText(fitnessLevel, px, 632);

        // Desc ── 26px (was 22px)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
        ctx.font = '400 26px Inter, sans-serif';
        ctx.fillText(fitnessDesc, px, 672);

      } else if (shareTemplate === 'stats') {
        // Section label ── 24px (was 20px)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText('RINGKASAN PERFORMA', px, p0 + 44);

        const targetYear = (() => {
          let y = new Date().getFullYear();
          const acts = runActs.filter(a => a.startTimeLocal && new Date(a.startTimeLocal).getFullYear() === y);
          if (acts.length === 0 && runActs.length > 0) {
            const years = runActs.map(a => a.startTimeLocal ? new Date(a.startTimeLocal).getFullYear() : null).filter(Boolean);
            if (years.length > 0) y = Math.max(...years);
          }
          return y;
        })();

        const yearlyActs = runActs.filter(a => a.startTimeLocal && new Date(a.startTimeLocal).getFullYear() === targetYear);
        const yearlyDist = yearlyActs.reduce((s, a) => s + (a.distance ?? 0) / 100000, 0);
        const yearlySessions = yearlyActs.length;
        const hrActs = yearlyActs.filter(a => a.avgHr);
        const yearlyAvgHR = hrActs.length ? yearlyActs.reduce((s, a) => s + (a.avgHr ?? 0), 0) / hrActs.length : 0;
        const yearlyMaxHR = yearlyActs.reduce((max, a) => Math.max(max, a.maxHr ?? a.max_hr ?? 0), 0);

        // drawMetric: label 22px, value 90px, unit 22px — more balanced
        const drawMetric = (x, y, label, val, unit, color) => {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
          ctx.font = '600 22px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), x, y);
          ctx.fillStyle = color;
          ctx.font = '700 90px Outfit, sans-serif';
          ctx.fillText(val, x, y + 108);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
          ctx.font = '500 22px Inter, sans-serif';
          ctx.fillText(unit.toUpperCase(), x, y + 140);
        };

        // 2×2 grid: row1 at p0+80=285, row2 at p0+345=550
        drawMetric(px,  p0 + 80,  `Jarak (${targetYear})`,   yearlyDist.toFixed(1),                        'km',   '#818cf8');
        drawMetric(560, p0 + 80,  `Latihan (${targetYear})`, yearlySessions.toString(),                    'sesi', '#fb7185');
        drawMetric(px,  p0 + 345, 'HR Rerata',               yearlyAvgHR ? Math.round(yearlyAvgHR).toString() : '–', 'bpm', '#34d399');
        drawMetric(560, p0 + 345, 'HR Maks',                 yearlyMaxHR ? yearlyMaxHR.toString() : '–',   'bpm', '#fbbf24');

      } else { // race predictions
        // Section label ── 24px (was 20px)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText('PREDIKSI WAKTU RACE', px, p0 + 44);

        const RIEGEL = 1.06;
        const RACES = [
          { label: '5 KM',          dist: 5000,  color: '#818cf8' },
          { label: '10 KM',         dist: 10000, color: '#34d399' },
          { label: 'HALF MARATHON', dist: 21097, color: '#fbbf24' },
          { label: 'MARATHON',      dist: 42195, color: '#fb7185' }
        ];
        const bestRuns = runActs
          .filter(a => a.distance >= 300000 && a.duration > 0)
          .map(a => ({ distM: a.distance / 100, durationSec: a.duration / 1000, paceMinKm: (a.duration / 60000) / (a.distance / 100000) }))
          .filter(a => a.paceMinKm >= 3 && a.paceMinKm <= 20)
          .sort((a, b) => a.paceMinKm - b.paceMinKm);
        const ref = bestRuns[0] || (targetPace ? { distM: 5000, durationSec: targetPace * 60 * 5, paceMinKm: targetPace } : null);
        if (ref) {
          // 4 rows step 142px, starts at p0+80=285, ends at 711. 
          // Bar height 108px, text ends at y=821. Perfect gap before footer divider at 934.
          RACES.forEach((r, idx) => {
            const predSec = ref.durationSec * Math.pow(r.dist / ref.distM, RIEGEL);
            const h = Math.floor(predSec / 3600);
            const m = Math.floor((predSec % 3600) / 60);
            const sec = Math.round(predSec % 60);
            const timeStr = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
            const rowY = (p0 + 80) + idx * 142;
            ctx.fillStyle = r.color;
            ctx.fillRect(px, rowY, 6, 108);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
            ctx.font = '600 20px Inter, sans-serif';
            ctx.fillText(r.label, px + 20, rowY + 22);
            ctx.fillStyle = '#ffffff';
            ctx.font = '700 58px Outfit, sans-serif';
            ctx.fillText(timeStr, px + 20, rowY + 90);
          });
        }
      }

      // ── DARK FOOTER ── y=934
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 934); ctx.lineTo(pw, 934); ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText('Dibuat otomatis oleh EnduraUP AI Engine', px, 962);
      ctx.fillStyle = shareTheme === 'cyber' ? '#06b6d4' : '#a78bfa';
      ctx.font = '600 22px Inter, sans-serif';
      ctx.fillText('enduraup.vercel.app', px, 996);

    } // end else (dark themes)

  }, [showShareModal, shareTemplate, shareTheme, runActs, totalDist, totalSessions, avgHR, actualMaxHR, vo2max, targetPace, displayName, currentUser, avatar, retroImageLoaded]);


  const shareOrDownloadImage = async () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    try {
      if (navigator.share && navigator.canShare) {
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], `EnduraUP_Stats_${shareTemplate}.png`, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'EnduraUP Performance Card',
            text: 'Lihat pencapaian lari gue di EnduraUP! Gabung yuk di enduraup.vercel.app 🏃‍♂️🔥',
          });
          addToast('Berhasil membuka menu bagikan!');
          return;
        }
      }
    } catch (err) {
      console.warn('Sharing failed, falling back to download:', err);
    }
    
    // Fallback to direct download
    const link = document.createElement('a');
    link.download = `EnduraUP_Stats_${shareTemplate}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    addToast('Gambar berhasil diunduh! Siap dibagikan ke Instagram/WA.');
  };

  const copyLinkToClipboard = () => {
    navigator.clipboard.writeText('https://enduraup.vercel.app').then(() => {
      addToast('Link website berhasil disalin! Siap dibagikan.');
    }).catch(err => {
      console.error('Failed to copy link:', err);
      addToast('Gagal menyalin link.', 'error');
    });
  };

  const copyImageToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      const blob = await new Promise(resolve => canvasRef.current.toBlob(resolve, 'image/png'));
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      addToast('Gambar berhasil disalin ke clipboard! Siap di-paste (Ctrl+V/Cmd+V).');
    } catch (err) {
      console.error('Failed to copy image:', err);
      addToast('Gagal menyalin gambar. Silakan unduh gambar terlebih dahulu.', 'error');
    }
  };

  const shareToWhatsApp = () => {
    const text = encodeURIComponent('Lihat hasil analisis latihan lari dan performa VO2Max saya di EnduraUP! Cek di: https://enduraup.vercel.app 🏃‍♂️🔥');
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent('Lihat hasil analisis lari & performa VO2Max saya di EnduraUP! 🏃‍♂️🔥');
    const url = encodeURIComponent('https://enduraup.vercel.app');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  const shareToInstagram = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    link.download = `EnduraUP_Stats_${shareTemplate}_${Date.now()}.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
    addToast('Gambar diunduh! Silakan buka Instagram untuk membagikan ke Story/Feed dengan tag #EnduraUP');
  };

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
      saveAndSyncData(merged);
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

          saveAndSyncData(updated);
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
    saveAndSyncData(updated);
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
    saveAndSyncData(updated);
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
    saveAndSyncData(updated);
    setConfirmReset(false);
    setTab('dashboard');
    addToast('Semua data berhasil dihapus.', 'error');
    setSidebarOpen(false);
  };

  // ── Apply profile changes ─────────────────────────────────────────────────────
  const applyProfileChanges = () => {
    if (age !== null && age !== undefined && age < 10) {
      addToast('Umur tidak boleh kurang dari 10 tahun.', 'error');
      return;
    }
    const updated = {
      ...data,
      profile: { age, displayName, weight, height, gender, avatar, goal, programStyle, targetPace, selectedDays }
    };
    saveAndSyncData(updated);
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

  const rColor = latestSleepScore >= 80 ? '#10b981' : latestSleepScore >= 60 ? '#f59e0b' : '#ef4444';
  const rBgColor = latestSleepScore >= 80 ? 'rgba(16, 185, 129, 0.08)' : latestSleepScore >= 60 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';

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
                {d.avatar || avatar ? (
                  <img src={d.avatar || avatar} alt="Profile" style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, color: '#fff', flexShrink: 0 }}>{initials}</div>
                )}
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
                  {/* ── LOGIN PROMPT for anonymous users ── */}
                  {currentUser?.startsWith('Anonim-') && (
                    <div style={{
                      background: 'linear-gradient(135deg, rgba(129,140,248,0.08), rgba(167,139,250,0.05))',
                      border: '1px solid rgba(167,139,250,0.2)',
                      borderRadius: 10,
                      padding: '14px 16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ fontSize: 18, flexShrink: 0 }}>🔐</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 3 }}>
                            Kamu masuk sebagai Anonim
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                            Data kamu hanya tersimpan di perangkat ini. Masuk dengan akun untuk menyimpan data ke cloud dan akses dari mana saja.
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            if (isFirebaseConfigured && auth.currentUser) {
                              await signOut(auth);
                            }
                          } catch (e) { /* ignore */ }
                          sessionStorage.removeItem('smartcoach_session');
                          setSessionUser(null);
                          setShowLanding(false);
                          closeModal();
                        }}
                        style={{
                          padding: '9px 14px',
                          borderRadius: 8,
                          background: 'var(--accent-purple)',
                          border: 'none',
                          color: '#fff',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          fontSize: 13,
                          fontWeight: 700,
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 6,
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                          <polyline points="10 17 15 12 10 7"/>
                          <line x1="15" y1="12" x2="3" y2="12"/>
                        </svg>
                        Masuk / Buat Akun
                      </button>
                    </div>
                  )}
                  <button onClick={() => { setEditDraft({ displayName: curName, age: curAge, gender: curGender, weight: curWeight, height: curHeight, avatar: avatar }); setProfileEditMode(true); }}
                    style={{ padding: '10px', borderRadius: 8, background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, width: '100%' }}
                  >Edit Profil</button>
                </>) : (<>

                {/* ── EDIT MODE ── */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
                    <div style={{ position: 'relative', width: 52, height: 52, flexShrink: 0 }}>
                      {d.avatar ? (
                        <img src={d.avatar} alt="Avatar" style={{ width: 52, height: 52, borderRadius: 10, objectFit: 'cover', border: '1.5px solid var(--accent-purple)' }} />
                      ) : (
                        <div style={{ width: 52, height: 52, borderRadius: 10, background: 'linear-gradient(135deg,#818cf8,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 800, color: '#fff' }}>
                          {initials}
                        </div>
                      )}
                      <label htmlFor="avatar-upload" style={{ position: 'absolute', bottom: -4, right: -4, background: 'var(--accent-purple)', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', border: '1.5px solid var(--bg-surface)' }}>
                        <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 5v14M5 12h14"/>
                        </svg>
                      </label>
                      <input id="avatar-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 200 * 1024) {
                          addToast('Ukuran foto terlalu besar. Maksimal 200 KB.', 'error');
                          return;
                        }
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setEditDraft(prev => ({ ...prev, avatar: reader.result }));
                        };
                        reader.readAsDataURL(file);
                      }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Foto Profil</div>
                      <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Maksimal 200 KB (JPEG/PNG)</div>
                      {d.avatar && (
                        <button onClick={() => setEditDraft(prev => ({ ...prev, avatar: null }))} style={{ background: 'none', border: 'none', color: '#fb7185', fontSize: 9, padding: 0, marginTop: 2, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit', fontWeight: 600 }}>Hapus Foto</button>
                      )}
                    </div>
                  </div>

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
                      const finalDisplayName = d.displayName !== undefined ? d.displayName.trim() : (displayName || '');
                      const finalAge = d.age !== undefined ? d.age : age;
                      const finalWeight = d.weight !== undefined ? d.weight : weight;
                      const finalHeight = d.height !== undefined ? d.height : height;
                      const finalGender = d.gender !== undefined ? d.gender : gender;
                      const finalAvatar = d.avatar !== undefined ? d.avatar : avatar;

                      if (finalAge !== null && finalAge !== undefined && finalAge < 10) {
                        addToast('Umur tidak boleh kurang dari 10 tahun.', 'error');
                        return;
                      }
                      if (finalHeight !== null && finalHeight !== undefined && finalHeight > 250) {
                        addToast('Tinggi tidak boleh lebih dari 250 cm.', 'error');
                        return;
                      }

                      if (d.displayName !== undefined) setDisplayName(finalDisplayName);
                      if (d.age !== undefined) setAge(finalAge);
                      if (d.weight !== undefined) setWeight(finalWeight);
                      if (d.height !== undefined) setHeight(finalHeight);
                      if (d.gender !== undefined) setGender(finalGender);
                      setAvatar(finalAvatar);

                      const updated = {
                        ...data,
                        profile: {
                          ...(data.profile || {}),
                          displayName: finalDisplayName,
                          age: finalAge,
                          weight: finalWeight,
                          height: finalHeight,
                          gender: finalGender,
                          avatar: finalAvatar,
                          goal: data.profile?.goal ?? goal,
                          programStyle: data.profile?.programStyle ?? programStyle,
                          targetPace: data.profile?.targetPace ?? targetPace,
                          selectedDays: data.profile?.selectedDays ?? selectedDays
                        }
                      };
                      saveAndSyncData(updated);

                      setEditDraft({});
                      setProfileEditMode(false);
                      setShowProfileModal(false);
                      addToast('Profil diperbarui & disimpan.');
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
            {avatar ? (
              <img src={avatar} alt="Profile" style={{ width: 34, height: 34, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }} />
            ) : (
              <div style={{
                width: 34, height: 34, borderRadius: 8, flexShrink: 0,
                background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: '#fff',
              }}>
                {(displayName || currentUser).substring(0, 2).toUpperCase()}
              </div>
            )}
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
            <div className="form-group" style={{ opacity: age === null ? 0.75 : 1 }}>
              <label className="form-label">Umur</label>
              <div className="number-input-group" style={{ border: age === null ? '1px dashed var(--border)' : '1px solid var(--border)' }}>
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
        <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginTop: 12, opacity: 0.7 }}>
          v2.0.0
        </div>
      </aside>

      {/* ── Share Stats Modal Overlay ───────────────────────────────────────── */}
      {showShareModal && (
        <div 
          className="profile-modal-backdrop" 
          onClick={e => { if (e.target === e.currentTarget) setShowShareModal(false); }}
        >
          <div style={{ 
            background: 'var(--bg-surface)', 
            border: '1px solid var(--border)', 
            borderRadius: 16, 
            width: '100%', 
            maxWidth: 500, 
            maxHeight: '95vh', 
            overflowY: 'auto',
            padding: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 20
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Bagikan Pencapaian</h2>
              <button 
                onClick={() => setShowShareModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Template Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                Pilih Statistik
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'vo2', label: 'Estimasi VO2Max' },
                  { key: 'stats', label: 'Ringkasan Stats' },
                  { key: 'race', label: 'Prediksi Race' }
                ].map(t => (
                  <button
                    key={t.key}
                    onClick={() => setShareTemplate(t.key)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: '1px solid ' + (shareTemplate === t.key ? 'var(--accent-purple)' : 'var(--border)'),
                      background: shareTemplate === t.key ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
                      color: shareTemplate === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                Pilih Tema Desain
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'dark', label: 'Sleek Dark', color: 'linear-gradient(135deg, #09090b, #18181b)' },
                  { key: 'cyber', label: 'Cyberpunk', color: 'linear-gradient(135deg, #020617, #0f172a)' },
                  { key: 'purple', label: 'Amethyst', color: 'linear-gradient(135deg, #1e1b4b, #311042)' },
                  { key: 'sunrise', label: 'Sunrise Fun', color: 'linear-gradient(135deg, #fff1f2, #ffedd5)' }
                ].map(th => (
                  <button
                    key={th.key}
                    onClick={() => setShareTheme(th.key)}
                    style={{
                      flex: 1,
                      padding: '10px 8px',
                      borderRadius: 8,
                      border: '1px solid ' + (shareTheme === th.key ? (th.key === 'sunrise' ? '#e11d48' : '#ffffff') : 'var(--border)'),
                      background: th.color,
                      color: th.key === 'sunrise' ? '#be123c' : '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: shareTheme === th.key ? (th.key === 'sunrise' ? '0 0 10px rgba(225, 29, 72, 0.4)' : '0 0 10px rgba(167, 139, 250, 0.4)') : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Live Canvas Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
                Preview Gambar (Kotak 1:1)
              </label>
              <div style={{ 
                width: '100%', 
                aspectRatio: '1/1', 
                background: '#000', 
                borderRadius: 12, 
                overflow: 'hidden', 
                border: '1px solid var(--border)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
              }}>
                <canvas 
                  ref={canvasRef} 
                  style={{ width: '100%', height: '100%', display: 'block' }} 
                />
              </div>
            </div>

            {/* Download / Share Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Primary Download Button */}
              <button
                onClick={shareOrDownloadImage}
                className="btn btn-primary"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', fontSize: 14, width: '100%' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Unduh Gambar Performa (PNG)
              </button>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 12 }}>
                  Bagikan Langsung
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
                  {/* WhatsApp */}
                  <button
                    onClick={shareToWhatsApp}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(37, 211, 102, 0.08)', border: '1px solid rgba(37, 211, 102, 0.3)',
                      borderRadius: 10, padding: '10px 0', cursor: 'pointer', transition: 'all 0.15s', color: '#25D366'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(37, 211, 102, 0.08)'; }}
                    title="Bagikan ke WhatsApp"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>WA</span>
                  </button>

                  {/* Twitter / X */}
                  <button
                    onClick={shareToTwitter}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border)',
                      borderRadius: 10, padding: '10px 0', cursor: 'pointer', transition: 'all 0.15s', color: 'var(--text-primary)'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)'; }}
                    title="Bagikan ke Twitter / X"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4l11.733 16h4.267l-11.733 -16z" />
                      <path d="M4 20l6.768 -6.768m2.46 -2.46l6.772 -6.772" />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Twitter</span>
                  </button>

                  {/* Instagram */}
                  <button
                    onClick={shareToInstagram}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(225, 48, 108, 0.08)', border: '1px solid rgba(225, 48, 108, 0.3)',
                      borderRadius: 10, padding: '10px 0', cursor: 'pointer', transition: 'all 0.15s', color: '#E1306C'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(225, 48, 108, 0.08)'; }}
                    title="Bagikan ke Instagram"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>IG</span>
                  </button>

                  {/* Salin Gambar */}
                  <button
                    onClick={copyImageToClipboard}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(129, 140, 248, 0.08)', border: '1px solid rgba(129, 140, 248, 0.3)',
                      borderRadius: 10, padding: '10px 0', cursor: 'pointer', transition: 'all 0.15s', color: '#818cf8'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(129, 140, 248, 0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(129, 140, 248, 0.08)'; }}
                    title="Salin Gambar ke Clipboard"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Salin Gbr</span>
                  </button>

                  {/* Salin Link */}
                  <button
                    onClick={copyLinkToClipboard}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      background: 'rgba(167, 139, 250, 0.08)', border: '1px solid rgba(167, 139, 250, 0.3)',
                      borderRadius: 10, padding: '10px 0', cursor: 'pointer', transition: 'all 0.15s', color: '#a78bfa'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(167, 139, 250, 0.16)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(167, 139, 250, 0.08)'; }}
                    title="Salin Link Website"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                    </svg>
                    <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)' }}>Link</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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
            {hasData && (
              <button
                onClick={() => setShowShareModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 6,
                  borderRadius: '50%',
                  transition: 'all 0.15s',
                  width: 30,
                  height: 30,
                  marginTop: 2
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--bg-surface)';
                  e.currentTarget.style.color = 'var(--accent-purple)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'none';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
                title="Bagikan Kartu Performa (PNG)"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
              </button>
            )}
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
                {latestSleepDate && (
                  <div className="readiness-card animate-fade-in">
                    <div className="readiness-dial-wrapper">
                      <div className="readiness-dial" style={{ 
                        borderColor: rBgColor,
                        borderTopColor: rColor,
                        borderRightColor: rColor,
                      }}>
                        <div className="readiness-dial-value">{latestSleepScore}%</div>
                      </div>
                      <div className="readiness-dial-label" style={{ color: rColor }}>
                        {latestSleepScore >= 80 ? 'Prima' : latestSleepScore >= 60 ? 'Cukup' : 'Rendah'}
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rColor }}>
                          <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                        </svg>
                        Kesiapan Latihan Terkini
                      </h3>
                      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                        Berdasarkan rekaman tidur terakhir tanggal <strong>{latestSleepDate}</strong>, kesiapan fisik Anda berada di tingkat <strong>{latestSleepScore}%</strong>.{' '}
                        {latestSleepScore >= 80 
                          ? 'Tubuh Anda dalam kondisi prima dan siap untuk menerima latihan berintensitas tinggi hari ini.' 
                          : latestSleepScore >= 60 
                            ? 'Pemulihan Anda cukup baik. Silakan latihan, namun hindari memaksakan diri terlalu keras (overpush).' 
                            : 'Tingkat pemulihan rendah. Kami sangat menyarankan untuk memprioritaskan istirahat, hidrasi, dan pemulihan hari ini.'
                        }
                      </p>
                    </div>
                  </div>
                )}

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
                      <div className="readiness-card animate-fade-in">
                        <div className="readiness-dial-wrapper">
                          <div className="readiness-dial" style={{ 
                            borderColor: rBgColor,
                            borderTopColor: rColor,
                            borderRightColor: rColor,
                          }}>
                            <div className="readiness-dial-value">{latestSleepScore}%</div>
                          </div>
                          <div className="readiness-dial-label" style={{ color: rColor }}>
                            {latestSleepScore >= 80 ? 'Prima' : latestSleepScore >= 60 ? 'Cukup' : 'Rendah'}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rColor }}>
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                            Kesiapan Latihan Terkini
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                            Berdasarkan rekaman tidur terakhir tanggal <strong>{latestSleepDate}</strong>, kesiapan fisik Anda berada di tingkat <strong>{latestSleepScore}%</strong>.{' '}
                            {latestSleepScore >= 80 
                              ? 'Tubuh Anda dalam kondisi prima dan siap untuk menerima latihan berintensitas tinggi hari ini.' 
                              : latestSleepScore >= 60 
                                ? 'Pemulihan Anda cukup baik. Silakan latihan, namun hindari memaksakan diri terlalu keras (overpush).' 
                                : 'Tingkat pemulihan rendah. Kami sangat menyarankan untuk memprioritaskan istirahat, hidrasi, dan pemulihan hari ini.'
                            }
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="sleep-history-grid">
                      {Object.entries(sleepRecs).sort(([a], [b]) => b.localeCompare(a)).map(([date, rec]) => {
                        const s = rec.score;
                        const color = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
                        return (
                          <div className="sleep-history-card" key={date}>
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

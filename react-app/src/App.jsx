import ErrorBoundary from "./ErrorBoundary";
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
import AICoachChat from './AICoachChat';
import AICoach from './AICoach';
import LandingPage from './LandingPage';
import OnboardingWizard from './OnboardingWizard';
import AdminDashboard from './AdminDashboard';
import BlogModule from './Blog';
import Logo from './Logo';
import ExportGuideModal from './ExportGuideModal';
import FeedbackModal from './FeedbackModal';
import { Sun, Moon, Coffee } from 'lucide-react';
import { translations } from './translations';
import {
  auth,
  db,
  signOut,
  deleteUser,
  onAuthStateChanged,
  isConfigured as isFirebaseConfigured
} from './firebase';
import { doc, getDoc, setDoc, deleteDoc, increment } from 'firebase/firestore';

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
const ADMIN_EMAILS = ['m.c.affandi@gmail.com', 'affanbelajar@gmail.com'];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State: data ─────────────────────────────────────────────────────────────
  const [sessionUser, setSessionUser] = useState(() => sessionStorage.getItem('smartcoach_session') || null);
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const isAdmin = Boolean(currentUser && ADMIN_EMAILS.some(e => e.toLowerCase() === currentUser.trim().toLowerCase()));
  const [usersList, setUsersList] = useState(() => loadUsersList());
  const [data, setData] = useState(() => loadUserData(getCurrentUser()));
  const [toasts, setToasts] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('smartcoach_sidebar_collapsed') === 'true');
  const fileInputRef = useRef(null);
  const [lang, setLang] = useState(() => localStorage.getItem('smartcoach_lang') || 'id');
  const [theme, setTheme] = useState(() => localStorage.getItem('smartcoach_theme') || 'system');

  useEffect(() => {
    localStorage.setItem('smartcoach_lang', lang);
  }, [lang]);

  useEffect(() => {
    localStorage.setItem('smartcoach_theme', theme);
    if (theme === 'system') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const t = translations[lang] || translations.id;

  // ── State: profile ───────────────────────────────────────────────────────────
  const [age, setAge] = useState(() => data.profile?.age ?? null);
  const [displayName, setDisplayName] = useState(() => data.profile?.displayName ?? '');
  const [weight, setWeight] = useState(() => data.profile?.weight ?? null);
  const [height, setHeight] = useState(() => data.profile?.height ?? null);
  const [gender, setGender] = useState(() => data.profile?.gender ?? '');
  const [avatar, setAvatar] = useState(() => data.profile?.avatar ?? null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddRunModal, setShowAddRunModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(window.location.hash.toLowerCase() === '#admin');
  const [visitorCount, setVisitorCount] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [goal, setGoal] = useState(() => data.profile?.goal ?? 'maintenance');
  const [programStyle, setProgramStyle] = useState(() => data.profile?.programStyle ?? 'sedang');
  const [targetPace, setTargetPace] = useState(() => data.profile?.targetPace ?? null);
  const [selectedDays, setSelectedDays] = useState(() => data.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);

  useEffect(() => {
    const handleHashChange = () => {
      setShowAdmin(window.location.hash.toLowerCase() === '#admin');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured) return;

    // Visitor Counter
    const updateVisitorCount = async () => {
      try {
        const docRef = doc(db, 'stats', 'visitors');
        const hasVisited = sessionStorage.getItem('enduraup_visited');
        if (!hasVisited) {
          await setDoc(docRef, { count: increment(1) }, { merge: true });
          sessionStorage.setItem('enduraup_visited', 'true');
        }
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setVisitorCount(snap.data().count);
        } else {
          setVisitorCount(0);
        }
      } catch (e) {
        console.error("Visitor count error", e);
        setVisitorCount('Err');
      }
    };
    updateVisitorCount();

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
        setDisplayName(uData.profile?.displayName || fbUser.displayName || '');
        setWeight(uData.profile?.weight ?? null);
        setHeight(uData.profile?.height ?? null);
        setGender(uData.profile?.gender ?? '');
        setAvatar(uData.profile?.avatar || fbUser.photoURL || null);
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
    { key: 'Senin', label: translations[lang]?.daysShort[0] || 'Sen' },
    { key: 'Selasa', label: translations[lang]?.daysShort[1] || 'Sel' },
    { key: 'Rabu', label: translations[lang]?.daysShort[2] || 'Rab' },
    { key: 'Kamis', label: translations[lang]?.daysShort[3] || 'Kam' },
    { key: 'Jumat', label: translations[lang]?.daysShort[4] || 'Jum' },
    { key: 'Sabtu', label: translations[lang]?.daysShort[5] || 'Sab' },
    { key: 'Minggu', label: translations[lang]?.daysShort[6] || 'Min' }
  ], [lang]);

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
  const [tab, setTab] = useState(() => {
    if (window.location.pathname.startsWith('/blog')) return 'blog';
    return 'dashboard';
  });
  const [showLanding, setShowLanding] = useState(() => {
    return !window.location.pathname.startsWith('/blog');
  });
  const [blogView, setBlogView] = useState('list');

  // Handle browser routing (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/blog')) {
        setTab('blog');
        setShowLanding(false);
      } else {
        setTab('dashboard');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync tab state to URL
  useEffect(() => {
    const targetPath = tab === 'blog' ? '/blog' : '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  }, [tab]);

  // ── State: share performance card modal ──────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (showShareModal || showProfileModal || showAddRunModal || showSleepModal || showUploadModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showShareModal, showProfileModal, showAddRunModal, showSleepModal, showUploadModal]);
  const [shareTemplate, setShareTemplate] = useState('vo2');
  const [shareTheme, setShareTheme] = useState('dark');
  const [customCaption, setCustomCaption] = useState('Lihat pencapaian lari gue di EnduraUP! Gabung yuk di enduraup.vercel.app 🏃‍♂️🔥');
  const [retroImageLoaded, setRetroImageLoaded] = useState(false);
  const retroImageRef = useRef(null);

  const [customColor1, setCustomColor1] = useState('#fff1f2');
  const [customColor2, setCustomColor2] = useState('#ffedd5');

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
      const userDocRef = doc(db, 'users', auth.currentUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      if (userDocSnap.exists()) {
        const cloudData = userDocSnap.data();
        const localData = loadUserData(username);
        
        // Ensure running activities and sleep records are properly merged instead of blindly overwritten
        const mergedActivities = mergeData(localData, cloudData);

        const safeAge = cloudData.profile?.age ?? localData.profile?.age ?? null;
        const safeWeight = cloudData.profile?.weight ?? localData.profile?.weight ?? null;
        const safeHeight = cloudData.profile?.height ?? localData.profile?.height ?? null;
        const safeGender = cloudData.profile?.gender || localData.profile?.gender || '';
        const safeGoal = cloudData.profile?.goal ?? localData.profile?.goal ?? 'maintenance';
        const safeStyle = cloudData.profile?.programStyle ?? localData.profile?.programStyle ?? 'sedang';
        const safeTargetPace = cloudData.profile?.targetPace ?? localData.profile?.targetPace ?? null;
        const safeDays = cloudData.profile?.selectedDays ?? localData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu'];
        
        const safeData = {
          ...localData,
          ...cloudData,
          running_activities: mergedActivities.running_activities,
          sleep_records: mergedActivities.sleep_records,
          max_hr: mergedActivities.max_hr,
          profile: {
            ...(localData.profile || {}),
            ...(cloudData.profile || {}),
            displayName: cloudData.profile?.displayName || localData.profile?.displayName || auth.currentUser.displayName || '',
            avatar: cloudData.profile?.avatar || localData.profile?.avatar || auth.currentUser.photoURL || null,
            age: safeAge,
            weight: safeWeight,
            height: safeHeight,
            gender: safeGender,
            goal: safeGoal,
            programStyle: safeStyle,
            targetPace: safeTargetPace,
            selectedDays: safeDays
          }
        };

        setData(safeData);
        setAge(safeAge);
        setDisplayName(safeData.profile.displayName);
        setWeight(safeWeight);
        setHeight(safeHeight);
        setGender(safeGender);
        setAvatar(safeData.profile.avatar);
        setGoal(safeGoal);
        setProgramStyle(safeStyle);
        setTargetPace(safeTargetPace);
        setSelectedDays(safeDays);
        localStorage.setItem(`smartcoach_data_user_${username}`, JSON.stringify(safeData));

        // Push the merged safeData back to Firestore to ensure it stays fully synchronized
        setDoc(userDocRef, safeData).catch(e => {
          console.error('Failed to update synced data back to Firestore:', e);
        });
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
        const dataToSave = {
          ...updatedData,
          email: auth.currentUser.email || '',
          displayName: updatedData.profile?.displayName || auth.currentUser.displayName || `Anonim-${auth.currentUser.uid.substring(0, 4)}`,
          isAnonymous: auth.currentUser.isAnonymous,
          uid: auth.currentUser.uid
        };
        const userDocRef = doc(db, 'users', auth.currentUser.uid);
        setDoc(userDocRef, dataToSave).catch(e => {
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
        deleteDoc(doc(db, 'users', auth.currentUser.uid)).catch(e => {
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

  // ── Strava Integration ───────────────────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && isAdmin) {
      window.history.replaceState({}, document.title, window.location.pathname);
      
      const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
      const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
      
      if (!clientId || !clientSecret) {
        addToast(lang === 'id' ? 'Strava API Keys belum lengkap di .env!' : 'Strava API keys missing in .env!', 'error');
        return;
      }

      setIsUploading(true);
      addToast(lang === 'id' ? 'Menghubungkan ke Strava...' : 'Connecting to Strava...', 'info');

      fetch('https://www.strava.com/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          grant_type: 'authorization_code'
        })
      })
      .then(res => res.json())
      .then(tokenData => {
        if (!tokenData.access_token) throw new Error('No access token');
        
        return fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        });
      })
      .then(res => res.json())
      .then(activities => {
        if (!Array.isArray(activities)) throw new Error('Invalid Strava Data');
        
        let newRuns = [];
        activities.forEach(act => {
          if (act.type === 'Run') {
            const startDateLocal = new Date(act.start_date_local).getTime();
            newRuns.push({
              activityName: act.name,
              startTimeLocal: startDateLocal,
              distance: act.distance * 100, // meters to cm
              duration: act.moving_time * 1000, // seconds to ms
              avgHr: act.average_heartrate ? Math.round(act.average_heartrate) : null,
              maxHr: act.max_heartrate ? Math.round(act.max_heartrate) : null
            });
          }
        });

        if (newRuns.length === 0) {
          addToast(lang === 'id' ? 'Tidak ada lari baru di Strava' : 'No new runs found in Strava', 'info');
          setData(prev => {
            const updated = { ...prev, profile: { ...(prev.profile || {}), stravaConnected: true } };
            saveAndSyncData(updated);
            return updated;
          });
          setIsUploading(false);
          return;
        }

        setData(prev => {
          let mergedRuns = [...(prev.running_activities || [])];
          let addedCount = 0;
          newRuns.forEach(nr => {
            const exists = mergedRuns.find(er => Math.abs(er.startTimeLocal - nr.startTimeLocal) < 60000);
            if (!exists) {
              mergedRuns.push(nr);
              addedCount++;
            }
          });
          mergedRuns.sort((a,b) => a.startTimeLocal - b.startTimeLocal);
          
          let maxHr = prev.max_hr || 0;
          mergedRuns.forEach(r => {
            if (r.maxHr && r.maxHr > maxHr) maxHr = r.maxHr;
          });

          const updated = { 
            ...prev, 
            running_activities: mergedRuns, 
            max_hr: maxHr,
            profile: { ...(prev.profile || {}), stravaConnected: true }
          };
          saveAndSyncData(updated);
          
          addToast(lang === 'id' ? `Berhasil sync ${addedCount} lari baru dari Strava!` : `Successfully synced ${addedCount} new runs from Strava!`, 'success');
          return updated;
        });

        setIsUploading(false);
      })
      .catch(err => {
        console.error('Strava Error:', err);
        addToast(lang === 'id' ? 'Gagal narik data Strava!' : 'Failed to fetch Strava data!', 'error');
        setIsUploading(false);
      });
    }
  }, [isAdmin, saveAndSyncData, lang, addToast]);

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

  // Calculate days since last run relative to today's date
  const daysSinceLastRun = useMemo(() => {
    if (!runActs || runActs.length === 0) return null;
    const runDatesArray = runActs
      .map(a => a.startTimeLocal ? msToDate(a.startTimeLocal) : null)
      .filter(Boolean)
      .sort()
      .reverse();
    if (runDatesArray.length === 0) return null;
    const lastRunDate = runDatesArray[0];
    const todayStr = new Date().toISOString().split('T')[0];
    const dToday = new Date(todayStr);
    const dRun = new Date(lastRunDate);
    const diffTime = dToday - dRun;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [runActs]);

  // Adjust readiness score based on sleep score and running fatigue/rest
  const trainingReadiness = useMemo(() => {
    if (latestSleepScore === null) return null;
    let score = latestSleepScore;
    if (daysSinceLastRun === 0) {
      score = Math.max(30, score - 20);
    } else if (daysSinceLastRun === 1) {
      score = Math.max(40, score - 10);
    } else if (daysSinceLastRun === 2) {
      score = score;
    } else if (daysSinceLastRun === 3) {
      score = Math.min(100, score + 10);
    } else if (daysSinceLastRun >= 4 || daysSinceLastRun === null) {
      score = Math.min(100, score + 15);
      if (latestSleepScore >= 50) {
        score = Math.max(80, score);
      }
    }
    return Math.round(score);
  }, [latestSleepScore, daysSinceLastRun]);

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

  const streakWeeks = useMemo(() => {
    let streak = 0;
    const weeksMap = {};
    const msInWeek = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    (runActs || []).forEach(a => {
      if (!a.startTimeLocal) return;
      const d = new Date(a.startTimeLocal);
      const diffTime = now.getTime() - d.getTime();
      if (diffTime >= 0) {
        const weeksAgo = Math.floor(diffTime / msInWeek);
        weeksMap[weeksAgo] = (weeksMap[weeksAgo] || 0) + 1;
      }
    });
    let w = 0;
    if (weeksMap[0] > 0) {
      while (weeksMap[w] > 0) { streak++; w++; }
    } else if (weeksMap[1] > 0) {
      w = 1;
      while (weeksMap[w] > 0) { streak++; w++; }
    }
    return streak;
  }, [runActs]);

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
    } else if (shareTheme === 'custom') {
      const grad = ctx.createLinearGradient(0, 0, 1080, 1080);
      grad.addColorStop(0, customColor1);
      grad.addColorStop(1, customColor2);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1080, 1080);
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

    const getBrightness = (hex) => {
      if (!hex) return 0;
      hex = hex.replace('#', '');
      if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return (r * 299 + g * 587 + b * 114) / 1000;
    };
    const isCustomLight = shareTheme === 'custom' && ((getBrightness(customColor1) + getBrightness(customColor2)) / 2 > 135);
    const isLight = shareTheme === 'sunrise';
    
    // Core text colors
    const textPrimary   = isLight ? '#1a120a' : (isCustomLight ? '#1a1a1a' : '#ffffff');
    const textSecondary = isLight ? '#7c4a1e' : (isCustomLight ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.5)');
    const textMuted     = isLight ? 'rgba(60, 35, 10, 0.55)' : (isCustomLight ? 'rgba(0, 0, 0, 0.4)' : 'rgba(255, 255, 255, 0.25)');
    const borderStroke  = isLight ? 'rgba(200, 120, 40, 0.35)' : (isCustomLight ? 'rgba(0, 0, 0, 0.15)' : (shareTheme === 'cyber' ? 'rgba(6, 182, 212, 0.3)' : 'rgba(167, 139, 250, 0.2)'));

    // 1. Draw Glassmorphic Card Backing
    const glassStyle = isLight
      ? 'rgba(255, 248, 235, 0.84)'
      : (shareTheme === 'cyber' ? 'rgba(2, 6, 23, 0.85)' : (shareTheme === 'dark' ? 'rgba(9, 9, 11, 0.85)' : (shareTheme === 'custom' ? (isCustomLight ? 'rgba(255, 255, 255, 0.75)' : 'rgba(0, 0, 0, 0.7)') : 'rgba(30, 27, 75, 0.85)')));

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
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.font = '800 52px Outfit, sans-serif';
      ctx.fillText('EnduraUP', 1030, 110);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '500 26px Inter, sans-serif';
      ctx.fillText('AI Running & Recovery Coach', 1030, 152);
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
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
      ctx.fillText(lang === 'id' ? 'Kartu Performa' : 'Performance Card', 80, panelY + 104);
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
      ctx.fillStyle = textPrimary;
      ctx.font = '700 34px Outfit, sans-serif';
      ctx.fillText('EnduraUP', 100, 115);
      ctx.fillStyle = textSecondary;
      ctx.font = '500 17px Inter, sans-serif';
      ctx.fillText('AI Running & Recovery Coach', 100, 150);
      ctx.fillStyle = shareTheme === 'cyber' ? '#22d3ee' : (isCustomLight ? textPrimary : '#a78bfa');
      ctx.font = '700 20px Inter, sans-serif';
      ctx.fillText(athleteName.toUpperCase(), 100, 182);
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(100, 205); ctx.lineTo(980, 205); ctx.stroke();
      
      // Draw streak badge in top right for dark themes
      if (streakWeeks >= 1) {
        const streakText = `🔥 ${streakWeeks} WEEK STREAK`;
        ctx.font = '700 20px Inter, sans-serif';
        const sw = ctx.measureText(streakText).width;
        ctx.fillStyle = 'rgba(249, 115, 22, 0.15)'; // Orange background
        fillRoundedRect(ctx, 980 - sw - 30, 110, sw + 30, 44, 22, 'rgba(249, 115, 22, 0.15)');
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
        ctx.lineWidth = 1.5;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(980 - sw - 30, 110, sw + 30, 44, 22); ctx.stroke(); }
        ctx.fillStyle = '#f97316';
        ctx.fillText(streakText, 980 - sw - 15, 140);
      }
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
        ctx.fillText(lang === 'id' ? 'ESTIMASI VO2MAX' : 'ESTIMATED VO2MAX', lx, 592);

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
        let fitnessLevel = lang === 'id' ? 'Pemula' : 'Beginner';
        let fitnessDesc = lang === 'id' ? 'Fokus pada konsistensi latihan dasar.' : 'Focus on basic training consistency.';
        if (vo2max >= 62) {
          fitnessLevel = lang === 'id' ? 'Elite / Profesional' : 'Elite / Professional';
          fitnessDesc = lang === 'id' ? 'Performa puncak luar biasa.' : 'Exceptional peak performance.';
        } else if (vo2max >= 57) {
          fitnessLevel = lang === 'id' ? 'Sangat Baik (Top 10%)' : 'Very Good (Top 10%)';
          fitnessDesc = lang === 'id' ? 'Tingkat kebugaran setara pelari kompetitif.' : 'Fitness level on par with competitive runners.';
        } else if (vo2max >= 52) {
          fitnessLevel = lang === 'id' ? 'Baik Sekali' : 'Excellent';
          fitnessDesc = lang === 'id' ? 'Kapasitas aerobik sangat kuat.' : 'Very strong aerobic capacity.';
        } else if (vo2max >= 46) {
          fitnessLevel = lang === 'id' ? 'Di Atas Rata-Rata' : 'Above Average';
          fitnessDesc = lang === 'id' ? 'Performa lari solid dan stabil.' : 'Solid and stable running performance.';
        } else if (vo2max >= 38) {
          fitnessLevel = lang === 'id' ? 'Rata-Rata' : 'Average';
          fitnessDesc = lang === 'id' ? 'Kondisi fisik sehat dan aktif.' : 'Healthy and active physical condition.';
        } else if (vo2max >= 30) {
          fitnessLevel = lang === 'id' ? 'Di Bawah Rata-Rata' : 'Below Average';
          fitnessDesc = lang === 'id' ? 'Potensi peningkatan masih sangat besar.' : 'Potential for improvement is still huge.';
        }

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
        ctx.fillText(lang === 'id' ? 'RINGKASAN PERFORMA' : 'PERFORMANCE SUMMARY', lx, 592);

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
        drawM(lx,  630, lang === 'id' ? `Jarak (${targetYear})` : `Distance (${targetYear})`,   yearlyDist.toFixed(1),                        'km',   '#c0440a');
        drawM(580, 630, lang === 'id' ? `Latihan (${targetYear})` : `Workouts (${targetYear})`, yearlySessions.toString(),                    lang === 'id' ? 'sesi' : 'sessions', '#2a9d8f');
        drawM(lx,  810, lang === 'id' ? 'HR Rerata' : 'Avg HR',               yearlyAvgHR ? Math.round(yearlyAvgHR).toString() : '–', 'bpm', '#0d626c');
        drawM(580, 810, lang === 'id' ? 'HR Maks' : 'Max HR',                 yearlyMaxHR ? yearlyMaxHR.toString() : '–',   'bpm', '#b45309');

      } else { // race predictions
        // Section label ── y=592
        ctx.fillStyle = textMuted;
        ctx.font = '600 30px Inter, sans-serif';
        ctx.fillText(lang === 'id' ? 'PREDIKSI WAKTU RACE' : 'RACE TIME PREDICTION', lx, 592);

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
      ctx.fillText(lang === 'id' ? 'Dibuat otomatis oleh EnduraUP AI Engine' : 'Generated automatically by EnduraUP AI Engine', lx, 994);
      ctx.fillStyle = '#c0440a';
      ctx.font = '600 26px Inter, sans-serif';
      ctx.fillText('enduraup.vercel.app', lx, 1034);
      
      // Streak badge in footer for Sunrise theme
      if (streakWeeks >= 1) {
        const streakText = `🔥 ${streakWeeks} WEEK STREAK`;
        ctx.font = '700 22px Inter, sans-serif';
        const sw = ctx.measureText(streakText).width;
        fillRoundedRect(ctx, rx - sw - 30, 984, sw + 30, 46, 23, 'rgba(249, 115, 22, 0.1)');
        ctx.strokeStyle = 'rgba(249, 115, 22, 0.3)';
        ctx.lineWidth = 1.5;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(rx - sw - 30, 984, sw + 30, 46, 23); ctx.stroke(); }
        ctx.fillStyle = '#c2410c'; // darker orange for light theme
        ctx.fillText(streakText, rx - sw - 15, 1017);
      }

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
        ctx.fillStyle = textMuted;
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText(lang === 'id' ? 'ESTIMASI VO2MAX' : 'ESTIMATED VO2MAX', px, p0 + 44);

        // Main number ── 160px (was 200px — too dominant)
        // Baseline at ~490, cap top ~360, nicely centred in upper half
        ctx.fillStyle = shareTheme === 'cyber' ? '#06b6d4' : '#818cf8';
        ctx.font = '700 160px Outfit, sans-serif';
        const textVal = vo2max ? vo2max.toFixed(0) : '–';
        ctx.fillText(textVal, px, 490);

        // Unit ── 28px (was 22px)
        ctx.fillStyle = textSecondary;
        ctx.font = '500 28px Inter, sans-serif';
        ctx.fillText('ml/kg/min', px, 530);

        // Separator
        ctx.strokeStyle = borderStroke;
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px, 565); ctx.lineTo(pw, 565); ctx.stroke();

        // Fitness level ── 44px (was 34px)
        let fitnessLevel = lang === 'id' ? 'Pemula' : 'Beginner';
        let fitnessDesc = lang === 'id' ? 'Fokus pada konsistensi latihan dasar.' : 'Focus on basic training consistency.';
        if (vo2max >= 62) {
          fitnessLevel = lang === 'id' ? 'Elite / Profesional' : 'Elite / Professional';
          fitnessDesc = lang === 'id' ? 'Performa puncak luar biasa.' : 'Exceptional peak performance.';
        } else if (vo2max >= 57) {
          fitnessLevel = lang === 'id' ? 'Sangat Baik (Top 10%)' : 'Very Good (Top 10%)';
          fitnessDesc = lang === 'id' ? 'Tingkat kebugaran setara pelari kompetitif.' : 'Fitness level on par with competitive runners.';
        } else if (vo2max >= 52) {
          fitnessLevel = lang === 'id' ? 'Baik Sekali' : 'Excellent';
          fitnessDesc = lang === 'id' ? 'Kapasitas aerobik sangat kuat.' : 'Very strong aerobic capacity.';
        } else if (vo2max >= 46) {
          fitnessLevel = lang === 'id' ? 'Di Atas Rata-Rata' : 'Above Average';
          fitnessDesc = lang === 'id' ? 'Performa lari solid dan stabil.' : 'Solid and stable running performance.';
        } else if (vo2max >= 38) {
          fitnessLevel = lang === 'id' ? 'Rata-Rata' : 'Average';
          fitnessDesc = lang === 'id' ? 'Kondisi fisik sehat dan aktif.' : 'Healthy and active physical condition.';
        } else if (vo2max >= 30) {
          fitnessLevel = lang === 'id' ? 'Di Bawah Rata-Rata' : 'Below Average';
          fitnessDesc = lang === 'id' ? 'Potensi peningkatan masih sangat besar.' : 'Potential for improvement is still huge.';
        }

        ctx.fillStyle = textPrimary;
        ctx.font = '700 44px Outfit, sans-serif';
        ctx.fillText(fitnessLevel, px, 632);

        // Desc ── 26px (was 22px)
        ctx.fillStyle = textSecondary;
        ctx.font = '400 26px Inter, sans-serif';
        ctx.fillText(fitnessDesc, px, 672);

      } else if (shareTemplate === 'stats') {
        // Section label ── 24px (was 20px)
        ctx.fillStyle = textMuted;
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText(lang === 'id' ? 'RINGKASAN PERFORMA' : 'PERFORMANCE SUMMARY', px, p0 + 44);

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
          ctx.fillStyle = textMuted;
          ctx.font = '600 22px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), x, y);
          ctx.fillStyle = color;
          ctx.font = '700 90px Outfit, sans-serif';
          ctx.fillText(val, x, y + 108);
          ctx.fillStyle = textSecondary;
          ctx.font = '500 22px Inter, sans-serif';
          ctx.fillText(unit.toUpperCase(), x, y + 140);
        };

        // 2×2 grid: row1 at p0+80=285, row2 at p0+345=550
        drawMetric(px,  p0 + 80,  lang === 'id' ? `Jarak (${targetYear})` : `Distance (${targetYear})`,   yearlyDist.toFixed(1),                        'km',   '#818cf8');
        drawMetric(560, p0 + 80,  lang === 'id' ? `Latihan (${targetYear})` : `Workouts (${targetYear})`, yearlySessions.toString(),                    lang === 'id' ? 'sesi' : 'sessions', '#fb7185');
        drawMetric(px,  p0 + 345, lang === 'id' ? 'HR Rerata' : 'Avg HR',               yearlyAvgHR ? Math.round(yearlyAvgHR).toString() : '–', 'bpm', '#34d399');
        drawMetric(560, p0 + 345, lang === 'id' ? 'HR Maks' : 'Max HR',                 yearlyMaxHR ? yearlyMaxHR.toString() : '–',   'bpm', '#fbbf24');

      } else { // race predictions
        // Section label ── 24px (was 20px)
        ctx.fillStyle = textMuted;
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText(lang === 'id' ? 'PREDIKSI WAKTU RACE' : 'RACE TIME PREDICTION', px, p0 + 44);

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
            ctx.fillStyle = textMuted;
            ctx.font = '600 20px Inter, sans-serif';
            ctx.fillText(r.label, px + 20, rowY + 22);
            ctx.fillStyle = textPrimary;
            ctx.font = '700 58px Outfit, sans-serif';
            ctx.fillText(timeStr, px + 20, rowY + 90);
          });
        }
      }

      // ── DARK FOOTER ── y=934
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(px, 934); ctx.lineTo(pw, 934); ctx.stroke();
      ctx.fillStyle = textMuted;
      ctx.font = '400 18px Inter, sans-serif';
      ctx.fillText(lang === 'id' ? 'Dibuat otomatis oleh EnduraUP AI Engine' : 'Generated automatically by EnduraUP AI Engine', px, 962);
      ctx.fillStyle = shareTheme === 'cyber' ? '#06b6d4' : (isCustomLight ? textPrimary : '#a78bfa');
      ctx.font = '600 22px Inter, sans-serif';
      ctx.fillText('enduraup.vercel.app', px, 996);

    } // end else (dark themes)

  }, [showShareModal, shareTemplate, shareTheme, runActs, totalDist, totalSessions, avgHR, actualMaxHR, vo2max, targetPace, displayName, currentUser, avatar, retroImageLoaded, lang, customColor1, customColor2]);


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
            title: lang === 'id' ? 'Kartu Performa EnduraUP' : 'EnduraUP Performance Card',
            text: customCaption,
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

      const isId = lang === 'id';

      // Sheet 1: Riwayat Lari / Run History
      const runHeaders = isId ? [
        ["Tanggal (YYYY-MM-DD)", "Nama Aktivitas", "Jarak (km)", "Durasi (menit)", "Avg HR (bpm)", "Max HR (bpm)"],
        ["2026-05-20", "Morning Run BSD", 5.2, 32, 142, 168],
        ["2026-05-18", "Easy Run Senayan", 8.0, 52, 138, 155]
      ] : [
        ["Date (YYYY-MM-DD)", "Activity Name", "Distance (km)", "Duration (minutes)", "Avg HR (bpm)", "Max HR (bpm)"],
        ["2026-05-20", "BSD Morning Run", 5.2, 32, 142, 168],
        ["2026-05-18", "Senayan Easy Run", 8.0, 52, 138, 155]
      ];
      const wsRuns = XLSX.utils.aoa_to_sheet(runHeaders);

      wsRuns['!cols'] = [
        { wch: 22 }, // Tanggal / Date
        { wch: 25 }, // Nama Aktivitas / Activity Name
        { wch: 12 }, // Jarak / Distance
        { wch: 15 }, // Durasi / Duration
        { wch: 14 }, // Avg HR
        { wch: 14 }  // Max HR
      ];
      XLSX.utils.book_append_sheet(wb, wsRuns, isId ? "Riwayat Lari" : "Run History");

      // Sheet 2: Kualitas Tidur / Sleep Quality
      const sleepHeaders = isId ? [
        ["Tanggal (YYYY-MM-DD)", "Skor/Kualitas (0-100 atau kata: pulas/cukup/kurang/begadang)", "Durasi Tidur (jam)"],
        ["2026-05-20", "pulas", 7.5],
        ["2026-05-19", "", 6.0], // Kosong = otomatis dihitung dari durasi
        ["2026-05-18", 85, 8.0]
      ] : [
        ["Date (YYYY-MM-DD)", "Score/Quality (0-100 or keyword: pulas/cukup/kurang/begadang)", "Sleep Duration (hours)"],
        ["2026-05-20", "pulas", 7.5],
        ["2026-05-19", "", 6.0], // Empty = automatically calculated from duration
        ["2026-05-18", 85, 8.0]
      ];
      const wsSleep = XLSX.utils.aoa_to_sheet(sleepHeaders);
      wsSleep['!cols'] = [
        { wch: 22 }, // Tanggal / Date
        { wch: 55 }, // Skor / Kualitas / Score or Quality
        { wch: 22 }  // Durasi / Duration
      ];
      XLSX.utils.book_append_sheet(wb, wsSleep, isId ? "Kualitas Tidur" : "Sleep Quality");

      // Sheet 3: Panduan Pengisian / Instructions Guide
      const guideData = isId ? [
        ["PANDUAN PENGISIAN TEMPLATE EXCEL ENDURAUP"],
        [""],
        ["1. SHEET RIWAYAT LARI:"],
        ["   - Tanggal: Format harus YYYY-MM-DD (Contoh: 2026-05-20)."],
        ["   - Jarak: Tulis dalam satuan kilometer (km), desimal pakai titik (Contoh: 5.2)."],
        ["   - Durasi: Tulis dalam satuan menit (Contoh: 45)."],
        ["   - Avg HR & Max HR: Tulis detak jantung rerata & maks dalam bpm (opsional)."],
        [""],
        ["2. SHEET KUALITAS TIDUR:"],
        ["   - Tanggal: Format harus YYYY-MM-DD (Contoh: 2026-05-20)."],
        ["   - Durasi Tidur: Tulis durasi tidur dalam jam (Contoh: 7.5 atau 6)."],
        ["   - Skor/Kualitas Tidur: Bisa diisi dengan 3 cara:"],
        ["       a) Menggunakan Angka: Isi skor 0-100 langsung (jika dari smartwatch)."],
        ["       b) Menggunakan Kata Kunci Kualitas:"],
        ["          * 'pulas' / 'sangat baik' / 'nyenyak'  --> Diubah otomatis menjadi skor 90"],
        ["          * 'cukup' / 'baik' / 'normal'           --> Diubah otomatis menjadi skor 75"],
        ["          * 'kurang' / 'buruk' / 'lelah'          --> Diubah otomatis menjadi skor 55"],
        ["          * 'begadang' / 'sangat kurang' / 'parah'--> Diubah otomatis menjadi skor 30"],
        ["       c) Biarkan Kosong (Auto-hitung dari durasi tidur):"],
        ["          * Durasi 7 s.d 9 jam                    --> Otomatis diberi skor 85"],
        ["          * Durasi 6 s.d 7 jam                    --> Otomatis diberi skor 70"],
        ["          * Durasi 5 s.d 6 jam                    --> Otomatis diberi skor 55"],
        ["          * Durasi di bawah 5 jam                 --> Otomatis diberi skor 35"],
        ["          * Durasi di atas 9 jam (oversleep)      --> Otomatis diberi skor 75"],
        [""],
        ["*Catatan: Sistem tidak akan membaca baris panduan ini, Anda bebas mengunggah file Excel dengan sheet panduan ini tetap ada."]
      ] : [
        ["INSTRUCTIONS GUIDE FOR ENDURAUP EXCEL TEMPLATE"],
        [""],
        ["1. RUN HISTORY SHEET:"],
        ["   - Date: Format must be YYYY-MM-DD (Example: 2026-05-20)."],
        ["   - Distance: Write in kilometers (km), use dot for decimals (Example: 5.2)."],
        ["   - Duration: Write in minutes (Example: 45)."],
        ["   - Avg HR & Max HR: Average and maximum heart rate in bpm (optional)."],
        [""],
        ["2. SLEEP QUALITY SHEET:"],
        ["   - Date: Format must be YYYY-MM-DD (Example: 2026-05-20)."],
        ["   - Sleep Duration: Write sleep duration in hours (Example: 7.5 or 6)."],
        ["   - Sleep Score/Quality: Can be filled in 3 ways:"],
        ["       a) Using Numeric Value: Enter score 0-100 directly (e.g. from smartwatch)."],
        ["       b) Using Quality Keywords:"],
        ["          * 'pulas' / 'sangat baik' / 'nyenyak'  --> Automatically converted to score 90"],
        ["          * 'cukup' / 'baik' / 'normal'           --> Automatically converted to score 75"],
        ["          * 'kurang' / 'buruk' / 'lelah'          --> Automatically converted to score 55"],
        ["          * 'begadang' / 'sangat kurang' / 'parah'--> Automatically converted to score 30"],
        ["       c) Leave Empty (Auto-calculated based on sleep duration):"],
        ["          * Duration 7 to 9 hours                 --> Automatically assigned score 85"],
        ["          * Duration 6 to 7 hours                 --> Automatically assigned score 70"],
        ["          * Duration 5 to 6 hours                 --> Automatically assigned score 55"],
        ["          * Duration under 5 hours                --> Automatically assigned score 35"],
        ["          * Duration over 9 hours (oversleep)     --> Automatically assigned score 75"],
        [""],
        ["*Note: The system ignores this guide sheet during upload. You can upload the Excel file with this instructions sheet intact."]
      ];
      const wsGuide = XLSX.utils.aoa_to_sheet(guideData);
      wsGuide['!cols'] = [{ wch: 100 }];
      XLSX.utils.book_append_sheet(wb, wsGuide, isId ? "Panduan Pengisian" : "Instructions Guide");

      XLSX.writeFile(wb, isId ? "Template_Data_EnduraUP.xlsx" : "EnduraUP_Data_Template.xlsx");
      addToast(isId ? "Template Excel terunduh!" : "Excel template downloaded!");
    } catch (e) {
      console.error(e);
      addToast(isId ? "Gagal mengunduh template Excel" : "Failed to download Excel template", "error");
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
              const durKey = keys.find(k => k.toLowerCase().includes('durasi') || k.toLowerCase().includes('duration') || k.toLowerCase().includes('tidur') || k.toLowerCase().includes('waktu'));

              const dateVal = dateKey ? row[dateKey] : null;
              const scoreValRaw = scoreKey ? row[scoreKey] : null;
              const durVal = durKey ? parseFloat(row[durKey]) : null;

              const parsedDate = parseExcelDateVal(dateVal);
              if (parsedDate) {
                let scoreVal = null;
                const durValParsed = (durVal && !isNaN(durVal)) ? durVal : null;

                // 1. Try parsing scoreValRaw as number or text
                if (scoreValRaw !== null && scoreValRaw !== undefined) {
                  const rawStr = String(scoreValRaw).trim().toLowerCase();
                  const parsedInt = parseInt(rawStr);
                  if (!isNaN(parsedInt)) {
                    scoreVal = Math.min(100, Math.max(0, parsedInt));
                  } else {
                    // Match qualitative words
                    if (rawStr.includes('pulas') || rawStr.includes('sangat baik') || rawStr.includes('nyenyak') || rawStr.includes('puncak') || rawStr.includes('puas')) {
                      scoreVal = 90;
                    } else if (rawStr.includes('cukup') || rawStr.includes('baik') || rawStr.includes('normal')) {
                      scoreVal = 75;
                    } else if (rawStr.includes('kurang') || rawStr.includes('buruk') || rawStr.includes('poor') || rawStr.includes('lelah')) {
                      scoreVal = 55;
                    } else if (rawStr.includes('begadang') || rawStr.includes('sangat kurang') || rawStr.includes('parah') || rawStr.includes('insomnia')) {
                      scoreVal = 30;
                    }
                  }
                }

                // 2. Fallback: Auto-calculate score from duration if empty
                if (scoreVal === null && durValParsed !== null) {
                  if (durValParsed >= 7 && durValParsed <= 9) {
                    scoreVal = 85;
                  } else if (durValParsed >= 6 && durValParsed < 7) {
                    scoreVal = 70;
                  } else if (durValParsed >= 5 && durValParsed < 6) {
                    scoreVal = 55;
                  } else if (durValParsed < 5) {
                    scoreVal = 35;
                  } else { // durValParsed > 9
                    scoreVal = 75;
                  }
                }

                // Write to newSleep if we have a valid score
                if (scoreVal !== null) {
                  const dateStr = parsedDate.toISOString().split('T')[0];
                  newSleep[dateStr] = {
                    score: scoreVal,
                    duration: durValParsed !== null ? durValParsed : 7.0
                  };
                }
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
      ...data,
      running_activities: [],
      sleep_records: {},
      max_hr: 0
    };
    saveAndSyncData(updated);
    setConfirmReset(false);
    setTab('dashboard');
    addToast('Semua data berhasil dihapus.', 'error');
    setSidebarOpen(false);
  };

  const hasData = runActs.length > 0 || Object.keys(sleepRecs || {}).length > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  if (showAdmin) {
    return (
      <ErrorBoundary>
        <AdminDashboard onBack={() => { setShowAdmin(false); window.location.hash = ''; }} />
      </ErrorBoundary>
    );
  }

  // ─────────────────── STANDALONE BLOG PAGE ───────────────────
  if (tab === 'blog') {
    return (
      <div className="landing-container" style={{ minHeight: '100vh', paddingTop: 80, overflowY: 'auto', background: 'var(--bg-base)' }}>
        <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', maxWidth: '100%', padding: '16px 5%', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', zIndex: 100, borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="nav-logo" onClick={() => setTab('dashboard')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Logo size={24} />
              <span className="logo-text" style={{ fontSize: 20, letterSpacing: '-0.5px' }}>EnduraUP</span>
            </div>
            {blogView === 'list' && (
              <button className="nav-btn-primary" onClick={() => setTab('dashboard')} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600 }}>
                {lang === 'id' ? 'Kembali ke Dasbor' : 'Back to Dashboard'}
              </button>
            )}
          </div>
        </nav>
        <div style={{ padding: '60px 20px', maxWidth: 1000, margin: '0 auto' }}>
          <ErrorBoundary>
            <BlogModule isAdmin={showAdmin} lang={lang} onViewChange={setBlogView} currentUser={currentUser} />
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  if (!sessionUser) {
    if (showLanding) {
      return <LandingPage 
        onGetStarted={() => setShowLanding(false)} 
        onViewBlog={() => setTab('blog')}
        lang={lang} 
        setLang={setLang} 
        visitorCount={visitorCount} 
      />;
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
          lang={lang}
        />
      </>
    );
  }

  // ── Onboarding Wizard ────────────────────────────────────────────────────────
  if (data && !data.profile?.isOnboardingComplete && (data.profile?.age === null || data.profile?.age === undefined)) {
    return (
      <OnboardingWizard
        initialProfile={{ age, displayName, weight, height, gender, goal, programStyle, targetPace, selectedDays }}
        lang={lang}
        currentUser={currentUser}
        onComplete={(draft) => {
          setDisplayName(draft.displayName);
          setAge(draft.age);
          setWeight(draft.weight);
          setHeight(draft.height);
          setGender(draft.gender);
          setGoal(draft.goal);
          setProgramStyle(draft.programStyle);
          setTargetPace(draft.targetPace);
          setSelectedDays(draft.selectedDays);
          
          const updated = {
            ...data,
            profile: {
              ...(data.profile || {}),
              ...draft,
              isOnboardingComplete: true
            }
          };
          saveAndSyncData(updated);
        }}
        onSkip={() => {
          const updated = {
            ...data,
            profile: {
              ...(data.profile || {}),
              isOnboardingComplete: true
            }
          };
          saveAndSyncData(updated);
        }}
      />
    );
  }

  const trainingReadinessScore = trainingReadiness ?? 100;
  const rColor = trainingReadinessScore >= 80 ? '#10b981' : trainingReadinessScore >= 60 ? '#f59e0b' : '#ef4444';
  const rBgColor = trainingReadinessScore >= 80 ? 'rgba(16, 185, 129, 0.08)' : trainingReadinessScore >= 60 ? 'rgba(245, 158, 11, 0.08)' : 'rgba(239, 68, 68, 0.08)';

  const getReadinessDesc = () => {
    const isId = lang === 'id';
    const sleepPart = isId 
      ? `Berdasarkan rekaman tidur terakhir (${latestSleepDate}), kualitas tidur lo berada di skor ${latestSleepScore}%. `
      : `Based on your latest sleep record (${latestSleepDate}), your sleep quality score is ${latestSleepScore}%. `;

    let restPart = '';
    if (daysSinceLastRun === 0) {
      restPart = isId
        ? `Lo ada sesi lari hari ini, jadi kesiapan fisik disesuaikan karena faktor kelelahan otot aktif.`
        : `You ran today, so physical readiness is adjusted due to active muscle fatigue.`;
    } else if (daysSinceLastRun === 1) {
      restPart = isId
        ? `Lo baru lari kemarin, ada sedikit penyesuaian skor karena sisa kelelahan.`
        : `You ran yesterday, with a minor score adjustment for residual fatigue.`;
    } else if (daysSinceLastRun === 2) {
      restPart = isId
        ? `Masa pemulihan lo seimbang (2 hari sejak sesi lari terakhir).`
        : `Your recovery duration is balanced (2 days since your last run).`;
    } else if (daysSinceLastRun === 3) {
      restPart = isId
        ? `Lo udah istirahat 3 hari. Kesiapan naik (+10%) karena capek lari sebelumnya sudah pulih sepenuhnya.`
        : `You have rested for 3 days. Readiness is boosted (+10%) as training fatigue has fully cleared.`;
    } else if (daysSinceLastRun >= 4 || daysSinceLastRun === null) {
      const dayText = daysSinceLastRun === null 
        ? (isId ? 'beberapa hari' : 'several days') 
        : `${daysSinceLastRun} hari`;
      restPart = isId
        ? `Lo udah istirahat ${dayText}. Kesiapan fisik pulih maksimal (+15% bonus, minimal 80%) karena tidak ada kelelahan lari aktif.`
        : `You have rested for ${dayText}. Physical readiness is fully restored (+15% bonus, minimum 80%) as there is zero active fatigue from running.`;
    }

    let actionPart = '';
    if (trainingReadinessScore >= 80) {
      actionPart = isId
        ? ' Tubuh lo fit banget dan siap nerima latihan intensitas tinggi hari ini!'
        : ' Your body is in prime condition and ready for high-intensity training today!';
    } else if (trainingReadinessScore >= 60) {
      actionPart = isId
        ? ' Pemulihan lo cukup. Silakan latihan, tapi hindari memaksakan diri terlalu keras (overpush).'
        : ' Your recovery is fair. You can train, but avoid pushing yourself too hard (overpush).';
    } else {
      actionPart = isId
        ? ' Pemulihan rendah. Sangat disarankan untuk rest, fokus hidrasi, dan pemulihan hari ini.'
        : ' Low recovery level. We highly recommend prioritizing rest, hydration, and recovery today.';
    }

    return { sleepPart, restPart, actionPart };
  };

  const readinessDesc = getReadinessDesc();

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
        const Stat = ({ label, value, unit, icon, color = 'var(--accent-purple)' }) => (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}15`, color: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {icon}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: value ? 'var(--text-primary)' : 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {value ? <>{value} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{unit}</span></> : '—'}
              </div>
            </div>
          </div>
        );

        const iconProps = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

        return (
          <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
            <div className="profile-modal-container">

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
                  <div className="profile-view-grid">
                    <Stat label="Umur" value={curAge} unit="thn" color="#3b82f6" icon={<svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} />
                    <Stat label="Kelamin" value={curGender === 'pria' ? 'Pria' : curGender === 'wanita' ? 'Wanita' : null} unit="" color={curGender === 'wanita' ? '#ec4899' : '#8b5cf6'} icon={curGender === 'wanita' ? <svg {...iconProps}><circle cx="12" cy="9" r="5"></circle><line x1="12" y1="14" x2="12" y2="21"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg> : <svg {...iconProps}><circle cx="10" cy="14" r="5"></circle><line x1="13.5" y1="10.5" x2="21" y2="3"></line><line x1="16" y1="3" x2="21" y2="3"></line><line x1="21" y1="3" x2="21" y2="8"></line></svg>} />
                    <Stat label="Berat" value={curWeight} unit="kg" color="#10b981" icon={<svg {...iconProps}><path d="M6 10h12"></path><path d="M6 10l3-6h6l3 6"></path><rect x="4" y="10" width="16" height="10" rx="2"></rect><path d="M12 10v4"></path></svg>} />
                    <Stat label="Tinggi" value={curHeight} unit="cm" color="#f59e0b" icon={<svg {...iconProps}><path d="M8 2v20"></path><path d="M8 6h4"></path><path d="M8 10h2"></path><path d="M8 14h2"></path><path d="M8 18h4"></path><path d="M16 8l4 4-4 4"></path></svg>} />
                  </div>

                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: window.innerWidth < 768 ? 14 : 0, marginBottom: 4 }}>Target & Latihan</div>
                  <div className="profile-view-grid">
                    <Stat label="Goal" value={
                      goal === 'maintenance' ? 'Maintenance' :
                      goal === 'weightloss' ? 'Turun BB' :
                      goal === '10k' ? '10K' :
                      goal === 'marathon' ? 'Marathon' :
                      goal === 'turun-hr' ? 'Turun HR' :
                      goal === 'health' ? 'Kesehatan' : goal
                    } unit="" color="#ef4444" icon={<svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>} />
                    <Stat label="Style" value={programStyle === 'ngepush' ? 'Ngepush' : programStyle === 'sedang' ? 'Sedang' : programStyle === 'santai' ? 'Santai' : programStyle} unit="" color="#f97316" icon={<svg {...iconProps}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>} />
                    <Stat label="Pace" value={targetPace ? `${Math.floor(targetPace)}:${String(Math.round((targetPace % 1) * 60)).padStart(2, '0')}` : null} unit="/km" color="#0ea5e9" icon={<svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
                    <Stat label="Hari" value={selectedDays.length === 0 ? 'Auto' : selectedDays.length} unit={selectedDays.length === 0 ? '' : 'x / mgg'} color="#8b5cf6" icon={<svg {...iconProps}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>} />
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
                  
                  {/* Reset Data Button moved here */}
                  <div style={{ marginBottom: 16 }}>
                    {!confirmReset ? (
                      <button
                        className="btn btn-danger"
                        onClick={() => setConfirmReset(true)}
                        style={{ width: '100%', padding: '10px', borderRadius: 8, fontSize: 13, fontWeight: 700 }}
                      >
                        {lang === 'id' ? 'Reset & Hapus Semua Data' : 'Reset & Clear All Data'}
                      </button>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(239, 68, 68, 0.05)', padding: 12, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, textAlign: 'center' }}>
                          {lang === 'id' ? 'Hapus semua data? Tidak bisa di-undo.' : 'Delete all data? Cannot be undone.'}
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            className="btn btn-danger"
                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                            onClick={() => { handleReset(); setShowProfileModal(false); }}
                          >
                            {lang === 'id' ? 'Ya, Hapus' : 'Yes, Delete'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '8px', fontSize: 12 }}
                            onClick={() => setConfirmReset(false)}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, width: '100%' }}>
                    <button onClick={() => { setEditDraft({ displayName: curName, age: curAge, gender: curGender, weight: curWeight, height: curHeight, avatar: avatar, goal: goal, programStyle: programStyle, targetPace: targetPace, selectedDays: selectedDays }); setProfileEditMode(true); }}
                      style={{ flex: 1, padding: '10px', borderRadius: 8, background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700 }}
                    >Edit Profil</button>
                    {!currentUser?.startsWith('Anonim-') && (
                      <button 
                        onClick={async () => {
                          if (window.confirm(lang === 'id' ? 'Apakah kamu yakin ingin menghapus akun ini secara permanen? Seluruh data akan hilang dan tidak dapat dikembalikan.' : 'Are you sure you want to permanently delete your account? All data will be lost.')) {
                            try {
                              if (isFirebaseConfigured && auth.currentUser) {
                                await deleteUser(auth.currentUser);
                              }
                              deleteUserData();
                              setSessionUser(null);
                              sessionStorage.removeItem('smartcoach_session');
                              setShowProfileModal(false);
                              addToast(lang === 'id' ? 'Akun berhasil dihapus permanen.' : 'Account permanently deleted.', 'error');
                            } catch (err) {
                              if (err.code === 'auth/requires-recent-login') {
                                alert(lang === 'id' ? 'Gagal: Silakan logout dan login kembali untuk memverifikasi penghapusan akun.' : 'Failed: Please logout and login again to verify account deletion.');
                              } else {
                                alert("Gagal: " + err.message);
                              }
                            }
                          }
                        }}
                        style={{ padding: '10px 16px', borderRadius: 8, background: 'var(--bg-surface)', border: '1px solid #ef4444', color: '#ef4444', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >Hapus Akun</button>
                    )}
                  </div>
                </>) : (<>

                {/* ── EDIT MODE ── */}
                <div className="profile-edit-grid">
                  {/* Left Column (Identitas & Data Fisik) */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: 10 }}>
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

                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Identitas</div>
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
                    </div>

                    <div>
                      <div style={{ height: window.innerWidth < 768 ? 1 : 0, background: 'var(--border)', margin: window.innerWidth < 768 ? '14px 0' : '0' }} />
                      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Data Fisik</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                        <div>
                          <label style={lbl}>Umur</label>
                          <input type="number" min={10} max={100} placeholder="—" style={inp}
                            value={d.age ?? ''} onChange={e => { const v = e.target.value; setEditDraft(p => ({ ...p, age: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
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
                      <div style={{ marginTop: 10 }}>
                        <label style={lbl}>Jenis Kelamin</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <button type="button" onClick={() => setEditDraft(p => ({ ...p, gender: 'pria' }))} style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: d.gender === 'pria' ? '1.5px solid var(--accent-purple)' : '1px solid var(--border)', background: d.gender === 'pria' ? 'rgba(167, 139, 250, 0.1)' : 'var(--bg-card)', color: d.gender === 'pria' ? 'var(--accent-purple)' : 'var(--text-secondary)', padding: '11px 14px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="13.5" y1="10.5" x2="21" y2="3"></line><line x1="16" y1="3" x2="21" y2="3"></line><line x1="21" y1="3" x2="21" y2="8"></line></svg>
                            Pria
                          </button>
                          <button type="button" onClick={() => setEditDraft(p => ({ ...p, gender: 'wanita' }))} style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: d.gender === 'wanita' ? '1.5px solid #ec4899' : '1px solid var(--border)', background: d.gender === 'wanita' ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-card)', color: d.gender === 'wanita' ? '#ec4899' : 'var(--text-secondary)', padding: '11px 14px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"></circle><line x1="12" y1="14" x2="12" y2="21"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>
                            Wanita
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column (Target & Latihan) */}
                  <div>
                    <div style={{ height: window.innerWidth < 768 ? 1 : 0, background: 'var(--border)', margin: window.innerWidth < 768 ? '14px 0' : '0' }} />
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--accent-purple)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Target & Latihan</div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={lbl}>{t.mainGoal}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {[
                          { val: 'maintenance', label: t.maintenance },
                          { val: 'weightloss', label: lang === 'id' ? 'Turun Berat' : 'Weight Loss' },
                          { val: '10k', label: '10K / 5K' },
                          { val: 'marathon', label: 'Marathon' },
                          { val: 'turun-hr', label: lang === 'id' ? 'Turun HR' : 'Lower HR' },
                          { val: 'health', label: lang === 'id' ? 'Kesehatan' : 'Health' }
                        ].map(g => (
                          <button key={g.val} type="button" onClick={() => setEditDraft(p => ({ ...p, goal: g.val }))}
                            style={{ ...inp, cursor: 'pointer', textAlign: 'center', padding: '10px 6px', fontSize: 12, border: (d.goal ?? 'maintenance') === g.val ? '1.5px solid var(--accent-purple)' : '1px solid var(--border)', background: (d.goal ?? 'maintenance') === g.val ? 'rgba(167, 139, 250, 0.1)' : 'var(--bg-card)', color: (d.goal ?? 'maintenance') === g.val ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                            {g.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label style={lbl}>{t.programStyle}</label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                        {[
                          { val: 'ngepush', label: t.ngepush },
                          { val: 'sedang', label: t.sedang },
                          { val: 'santai', label: t.santai }
                        ].map(s => (
                          <button key={s.val} type="button" onClick={() => setEditDraft(p => ({ ...p, programStyle: s.val }))}
                            style={{ ...inp, cursor: 'pointer', textAlign: 'center', padding: '10px 4px', fontSize: 12, border: (d.programStyle ?? 'sedang') === s.val ? '1.5px solid #f97316' : '1px solid var(--border)', background: (d.programStyle ?? 'sedang') === s.val ? 'rgba(249, 115, 22, 0.1)' : 'var(--bg-card)', color: (d.programStyle ?? 'sedang') === s.val ? '#f97316' : 'var(--text-secondary)' }}>
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <label style={{ ...lbl, marginBottom: 0 }}>{t.targetPace}</label>
                        <span style={{ 
                          fontSize: '11px', fontWeight: 700, 
                          color: d.targetPace === null ? 'var(--text-muted)' : 'var(--accent-purple)',
                          background: d.targetPace === null ? 'rgba(255,255,255,0.03)' : 'rgba(167, 139, 250, 0.12)',
                          padding: '2px 8px', borderRadius: '6px',
                          border: d.targetPace === null ? '1px dashed var(--border)' : '1px solid rgba(167, 139, 250, 0.2)'
                        }}>
                          {(() => {
                            const p = d.targetPace ?? 5.5;
                            const mins = Math.floor(p);
                            const secs = Math.round((p - mins) * 60);
                            const finalMins = secs >= 60 ? mins + 1 : mins;
                            const finalSecs = secs >= 60 ? 0 : secs;
                            return `${finalMins}:${String(finalSecs).padStart(2, '0')} /km`;
                          })()}
                        </span>
                      </div>
                      <input
                        type="range" min="3.0" max="10.0" step="0.083333"
                        value={d.targetPace ?? 5.5}
                        onChange={e => setEditDraft(p => ({ ...p, targetPace: parseFloat(e.target.value) }))}
                        style={{ width: '100%', cursor: 'pointer' }} className="app-slider"
                      />
                    </div>

                    <div>
                      <label style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
                        <span>{t.trainingDays}</span>
                        <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>
                          {(d.selectedDays || []).length === 0 ? (lang === 'id' ? 'Auto (Disarankan)' : 'Auto (Recommended)') : `${(d.selectedDays || []).length}x ${lang === 'id' ? 'Seminggu' : 'Weekly'}`}
                        </span>
                      </label>
                      <div className="day-selector-container">
                        <div className="day-selector-grid">
                          {allDays.map(dayItem => {
                            const isActive = (d.selectedDays || []).includes(dayItem.key);
                            return (
                              <button
                                key={dayItem.key} type="button"
                                className={`day-btn ${isActive ? 'active' : ''}`}
                                onClick={() => {
                                  setEditDraft(p => {
                                    const current = p.selectedDays || [];
                                    return { ...p, selectedDays: current.includes(dayItem.key) ? current.filter(x => x !== dayItem.key) : [...current, dayItem.key] };
                                  });
                                }}
                              >
                                {dayItem.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    </div>
                  </div>
                </div>

                  {/* Live BMI in edit mode */}
                  {(() => { const ew = d.weight; const eh = d.height; if (!ew || !eh) return null; const eb = (ew / ((eh / 100) ** 2)).toFixed(1); const ec = eb < 18.5 ? { l: 'Underweight', c: '#60a5fa' } : eb < 25 ? { l: 'Normal', c: '#34d399' } : eb < 30 ? { l: 'Overweight', c: '#fbbf24' } : { l: 'Obese', c: '#fb7185' }; return <div style={{ background: `${ec.c}12`, border: `1px solid ${ec.c}40`, borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}><span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>BMI</span><span style={{ fontSize: 15, fontWeight: 800, color: ec.c }}>{eb} <span style={{ fontSize: 11, fontWeight: 600 }}>— {ec.l}</span></span></div>; })()}

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
                      const finalGoal = d.goal !== undefined ? d.goal : goal;
                      const finalProgramStyle = d.programStyle !== undefined ? d.programStyle : programStyle;
                      const finalTargetPace = d.targetPace !== undefined ? d.targetPace : targetPace;
                      const finalSelectedDays = d.selectedDays !== undefined ? d.selectedDays : selectedDays;

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
                      
                      setGoal(finalGoal);
                      setProgramStyle(finalProgramStyle);
                      setTargetPace(finalTargetPace);
                      setSelectedDays(finalSelectedDays);

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
                          goal: finalGoal,
                          programStyle: finalProgramStyle,
                          targetPace: finalTargetPace,
                          selectedDays: finalSelectedDays
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


      {/* Mobile Top Bar Header - hide when reading blog */}
      {!(tab === 'blog' && blogView !== 'list') && (
        <header className="mobile-header">
          <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={24} />
            <div>
              <div className="sidebar-logo-text">EnduraUP</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>AI Coach</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button className="mobile-toggle-btn" onClick={() => setSidebarOpen(true)}>
              {lang === 'id' ? 'Profil & Data' : 'Profile & Data'}
            </button>
          </div>
        </header>
      )}

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
        <div className="sidebar-collapsed-strip">
          <button
            onClick={() => {
              setSidebarCollapsed(false);
              localStorage.setItem('smartcoach_sidebar_collapsed', 'false');
            }}
            title={lang === 'id' ? 'Tampilkan Panel' : 'Expand Panel'}
            aria-label="Expand Sidebar"
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0
            }}
          >
            <Logo size={28} />
          </button>
        </div>
        {/* Logo */}
        <div className="sidebar-logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Logo size={28} />
            <div>
              <div className="sidebar-logo-text">EnduraUP</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>AI Coach</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Collapse sidebar button (desktop only) */}
             <button
              className="sidebar-toggle-btn-desktop"
              style={{ width: 28, height: 28 }}
              onClick={() => {
                setSidebarCollapsed(true);
                localStorage.setItem('smartcoach_sidebar_collapsed', 'true');
              }}
              title={lang === 'id' ? 'Sembunyikan Panel' : 'Collapse Panel'}
              aria-label="Collapse Sidebar"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m11 17-5-5 5-5" />
                <path d="m18 17-5-5 5-5" />
              </svg>
            </button>
          <button className="mobile-close-btn" onClick={() => setSidebarOpen(false)}>×</button>
        </div>
      </div>

        <div className="sidebar-divider" />

        {/* Active Account Info */}
        <div>
          <div className="sidebar-section-title" style={{ marginBottom: 8 }}>{t.activeAccount}</div>
          <button
            type="button"
            onClick={() => { setEditDraft({}); setProfileEditMode(false); setShowProfileModal(true); }}
            style={{
              width: '100%',
              background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '12px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              transition: 'all 0.2s ease',
              textAlign: 'left',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}
            onMouseEnter={e => { 
              e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.4)'; 
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(167, 139, 250, 0.06) 0%, rgba(129, 140, 248, 0.02) 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(167, 139, 250, 0.08)';
            }}
            onMouseLeave={e => { 
              e.currentTarget.style.borderColor = 'var(--border)'; 
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
          >
            {avatar ? (
              <img src={avatar} alt="Profile" style={{ width: 36, height: 36, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '2px solid rgba(167, 139, 250, 0.3)' }} />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                background: 'linear-gradient(135deg, #818cf8, #a78bfa)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 800, color: '#fff',
                boxShadow: '0 2px 8px rgba(129, 140, 248, 0.4)'
              }}>
                {(displayName || currentUser).substring(0, 2).toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 650, color: displayName ? 'var(--text-primary)' : 'var(--text-muted)', fontStyle: displayName ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {displayName || t.fillProfileName}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 1 }}>{currentUser}</div>
            </div>
            {/* Edit indicator */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', flexShrink: 0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9"/>
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </div>
          </button>
        </div>

        <div className="sidebar-divider" />

        {isAdmin && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            <div className="sidebar-section-title" style={{ marginBottom: 0 }}>Admin Area</div>
            <button className="btn btn-primary" onClick={() => { setShowAdmin(true); window.location.hash = '#admin'; setSidebarOpen(false); }} style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8 }}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              Dashboard Admin
            </button>
          </div>
        )}

        {/* Import Data */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="sidebar-section-title" style={{ marginBottom: 0 }}>{t.importAddData}</div>

          {/* Unified Upload Area */}
          <div>
            <button className="btn btn-secondary" onClick={() => setShowUploadModal(true)} style={{ width: '100%', justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-secondary)' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
              {t.uploadAreaTitle}
            </button>
          </div>

          {/* Manual Run */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button className="btn btn-secondary" onClick={() => setShowAddRunModal(true)} style={{ justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {lang === 'id' ? 'Tambah Lari Manual' : 'Add Run Session'}
            </button>
            <button className="btn btn-secondary" onClick={() => setShowSleepModal(true)} style={{ justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
              {lang === 'id' ? 'Catat Tidur Semalam' : 'Log Night Sleep'}
            </button>
          </div>

          {hasData && (
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', marginTop: 4 }}>
              {lang === 'id'
                ? `${totalSessions} sesi lari · ${Object.keys(sleepRecs).length} malam tidur`
                : `${totalSessions} runs · ${Object.keys(sleepRecs).length} sleep logs`}
            </div>
          )}
        </div>

        <div className="sidebar-divider" style={{ marginTop: 'auto' }} />

        {/* Footer Actions Group */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          <a 
            href="https://saweria.co/afnstudio" 
            target="_blank" 
            rel="noopener noreferrer"
            className="btn btn-secondary neon-donate" 
            style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center', textDecoration: 'none' }}
          >
            <Coffee size={16} />
            {lang === 'id' ? 'Traktir Kopi' : 'Buy me a coffee'}
          </a>

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
              addToast(lang === 'id' ? 'Berhasil keluar.' : 'Logged out successfully.');
            }}
          >
            {t.logout}
          </button>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 8 }}>
            <div className="lang-switcher">
              <button className={`lang-btn ${lang === 'id' ? 'active' : ''}`} onClick={() => setLang('id')} title="Bahasa Indonesia">ID</button>
              <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')} title="English">EN</button>
            </div>
            <div className="lang-switcher">
              <button className={`lang-btn ${theme === 'light' ? 'active' : ''}`} onClick={() => setTheme('light')} title="Light Mode" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Sun size={14} /></button>
              <button className={`lang-btn ${theme === 'dark' ? 'active' : ''}`} onClick={() => setTheme('dark')} title="Dark Mode" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Moon size={14} /></button>
            </div>
          </div>

          {/* Subtle Feedback Link */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            style={{ 
              background: 'transparent', border: 'none', color: 'var(--text-muted)', 
              fontSize: 11, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              opacity: 0.7, transition: 'all 0.2s', fontFamily: 'inherit',
              textDecoration: 'underline'
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.color = 'var(--accent-purple)' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = 0.7; e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
            {lang === 'id' ? 'Beri Masukan / Testimoni' : 'Send Feedback'}
          </button>

          <div style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', opacity: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span>Pre-Release (Beta)</span>
            {visitorCount !== null && (
              <>
                <span>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {visitorCount > 9999 ? (visitorCount / 1000).toFixed(1).replace('.0', '') + 'k' : visitorCount}
                </span>
              </>
            )}
          </div>
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
            maxHeight: '90vh', 
            overflowY: 'auto',
            padding: '16px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
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
                  { key: 'sunrise', label: 'Sunrise Fun', color: 'linear-gradient(135deg, #fff1f2, #ffedd5)' },
                  { key: 'custom', label: 'Custom', color: `linear-gradient(135deg, ${customColor1}, ${customColor2})` }
                ].map(th => (
                  <button
                    key={th.key}
                    onClick={() => setShareTheme(th.key)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: 8,
                      border: '1px solid ' + (shareTheme === th.key ? (th.key === 'sunrise' || th.key === 'custom' ? '#e11d48' : '#ffffff') : 'var(--border)'),
                      background: th.color,
                      color: (th.key === 'sunrise' || th.key === 'custom') ? '#be123c' : '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: shareTheme === th.key ? ((th.key === 'sunrise' || th.key === 'custom') ? '0 0 10px rgba(225, 29, 72, 0.4)' : '0 0 10px rgba(167, 139, 250, 0.4)') : 'none',
                      transition: 'all 0.15s'
                    }}
                  >
                    {th.label}
                  </button>
                ))}
              </div>
              
              {shareTheme === 'custom' && (
                <div className="animate-fade-in" style={{ display: 'flex', gap: 12, marginTop: 12, background: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 8, border: '1px dashed var(--border)' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Warna 1 (Gradient)</label>
                    <input type="color" value={customColor1} onChange={e => setCustomColor1(e.target.value)} style={{ width: '100%', height: 28, cursor: 'pointer', padding: 0, border: 'none', background: 'transparent' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 10, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Warna 2 (Gradient)</label>
                    <input type="color" value={customColor2} onChange={e => setCustomColor2(e.target.value)} style={{ width: '100%', height: 28, cursor: 'pointer', padding: 0, border: 'none', background: 'transparent' }} />
                  </div>
                </div>
              )}
            </div>

            {/* Live Canvas Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Custom Caption Input */}
              <div>
                <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 4 }}>
                  Caption Sosmed (Bisa Diedit)
                </label>
                <textarea
                  value={customCaption}
                  onChange={e => setCustomCaption(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    background: 'var(--bg-base)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '8px 12px',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit',
                    fontSize: 13,
                    resize: 'none',
                    outline: 'none'
                  }}
                />
              </div>

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
                {Boolean(navigator.share) ? (lang === 'id' ? 'Bagikan Gambar & Caption (Share)' : 'Share Image & Caption') : (lang === 'id' ? 'Unduh Gambar Performa (PNG)' : 'Download Performance Image (PNG)')}
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
        {/* Header - hide when reading or editing blog */}
        {!(tab === 'blog' && blogView !== 'list') && (
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div className="dynamic-page-title-container" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <h1 className={`page-title dynamic-page-title ${sidebarCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`} style={{ margin: 0, marginTop: '-2px' }}>EnduraUP</h1>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <p className="page-subtitle" style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  {data.profile?.displayName ? (lang === 'id' ? `Halo, ${data.profile.displayName} — ` : `Hello, ${data.profile.displayName} — `) : ''}
                  {new Date().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button 
              onClick={() => setTab('blog')} 
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'color 0.2s', marginTop: 4 }}
              onMouseOver={e => e.target.style.color = 'var(--text-primary)'}
              onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}
            >
              Blog
            </button>
          </div>
        )}

        {!hasData ? (
          /* Empty state */
          <div className="empty-state animate-fade-in">
            <div className="empty-state-icon-wrapper">
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <h2 className="empty-state-title">Selamat Datang</h2>
            <p className="empty-state-desc">Database lokal masih kosong. Mulai dengan menambahkan data latihan atau tidur lo.</p>
            <div className="empty-state-steps">
              <div
                className="empty-step clickable"
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="empty-step-num">1</div>
                <div><strong>Upload data lari (.zip / .gpx)</strong> untuk import riwayat lari dan rute lo secara langsung. <i>(Klik di sini)</i></div>
              </div>
              <div
                className="empty-step clickable"
                onClick={() => fileInputRef.current?.click()}
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
            {tab !== 'blog' && (
              <div className="tabs">
                {[
                { key: 'dashboard', label: t.tabDashboard },
                { key: 'training', label: t.tabTrainingPlan },
                { key: 'race', label: t.tabRacePrediction },
                { key: 'history', label: t.tabRunHistory },
                { key: 'sleep', label: t.tabSleepAnalysis },
              ].map(item => (
                <button key={item.key} className={`tab ${tab === item.key ? 'active' : ''}`} onClick={() => setTab(item.key)}>
                  {item.label}
                </button>
              ))}

              <button
                onClick={() => setShowShareModal(true)}
                title={lang === 'id' ? "Bagikan Kartu Performa (PNG)" : "Share Performance Card (PNG)"}
                className="tab"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  color: 'var(--accent-purple)', fontWeight: 700,
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/>
                  <polyline points="16 6 12 2 8 6"/>
                  <line x1="12" y1="2" x2="12" y2="15"/>
                </svg>
                Share
              </button>
            </div>
            )}

            {/* ─────────────────── DASHBOARD ─────────────────── */}
            {tab === 'dashboard' && (
              <div className="animate-fade-in">
                {/* Metrics */}
                <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
                  {[
                    { 
                      label: lang === 'id' ? 'Jarak Minggu Ini' : 'Weekly Mileage', 
                      value: (() => {
                        const now = new Date();
                        const day = now.getDay();
                        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                        const startOfWeek = new Date(now.setDate(diff));
                        startOfWeek.setHours(0,0,0,0);
                        let wDist = 0;
                        for (const a of data.running_activities) {
                          if (!a.startTimeLocal) continue;
                          const d = new Date(a.startTimeLocal);
                          if (d >= startOfWeek) wDist += (a.distance || 0) / 100000;
                        }
                        return wDist.toFixed(1);
                      })(), 
                      unit: 'km', 
                      color: '#818cf8' 
                    },
                    { 
                      label: lang === 'id' ? 'Skor Tidur (Kesiapan)' : 'Sleep Score (Readiness)', 
                      value: latestSleepScore || '–', 
                      unit: '/100', 
                      color: '#a78bfa' 
                    },
                    { 
                      label: lang === 'id' ? 'Target Pace' : 'Pace Target', 
                      value: targetPace ? (() => {
                        const min = Math.floor(targetPace);
                        const sec = Math.round((targetPace - min) * 60);
                        return `${min}:${sec.toString().padStart(2, '0')}`;
                      })() : '–', 
                      unit: '/km', 
                      color: '#34d399' 
                    },
                    { 
                      label: t.totalDistance, 
                      value: totalDist.toFixed(1), 
                      unit: 'km', 
                      color: '#fbbf24' 
                    },
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

                <div className="dashboard-layout" style={{ marginTop: 20 }}>
                  {/* Left Column: Primary training metrics and coaches */}
                  <div className="dashboard-main-col">
                    {latestSleepDate && (
                      <div className="readiness-card animate-fade-in">
                        <div className="readiness-dial-wrapper">
                          <div className="readiness-dial" style={{ position: 'relative', border: 'none', background: 'transparent', boxShadow: 'none' }}>
                            <svg width="68" height="68" viewBox="0 0 68 68" style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
                              <circle cx="34" cy="34" r="30" fill="none" stroke={rBgColor} strokeWidth="4" />
                              <circle cx="34" cy="34" r="30" fill="none" stroke={rColor} strokeWidth="4" 
                                      strokeLinecap={trainingReadinessScore === 100 ? "butt" : "round"} 
                                      strokeDasharray={188.5} 
                                      strokeDashoffset={188.5 - ((trainingReadinessScore === 100 ? 100 : Math.min(trainingReadinessScore, 96)) / 100) * 188.5} 
                                      style={{ transition: 'stroke-dashoffset 1s ease-in-out' }} />
                            </svg>
                            <div className="readiness-dial-value" style={{ position: 'relative', zIndex: 1 }}>{trainingReadinessScore}%</div>
                          </div>
                          <div className="readiness-dial-label" style={{ color: rColor }}>
                            {trainingReadinessScore >= 80 ? (lang === 'id' ? 'Prima' : 'Prime') : trainingReadinessScore >= 60 ? (lang === 'id' ? 'Cukup' : 'Fair') : (lang === 'id' ? 'Rendah' : 'Low')}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rColor }}>
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                            {lang === 'id' ? 'Kesiapan Latihan Terkini' : 'Current Training Readiness'}
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                            {readinessDesc.sleepPart}
                            {readinessDesc.restPart}
                            {readinessDesc.actionPart}
                          </p>
                        </div>
                      </div>
                    )}

                    <TrendChart activities={runActs} lang={lang} />
                    <AICoach activities={data.running_activities} profile={{ age, goal, targetPace }} lang={lang} />
                  </div>

                  {/* Right Column: Secondary charts and summaries */}
                  <div className="dashboard-side-col">
                    {actualMaxHR > 0 && (
                      <HRZoneChart zones={hrZones} avgHr={avgHR ? Math.round(avgHR) : 0} lang={lang} />
                    )}

                    {actualMaxHR > 0 && (
                      <div className="info-card purple">
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{lang === 'id' ? 'Detak Jantung:' : 'Heart Rate:'}</strong>{' '}
                          {lang === 'id' ? (
                            <>
                              Estimasi Max HR berdasarkan umur ({age} tahun) adalah <strong>{220 - age} bpm</strong>,
                              tapi data mencatat hingga <strong style={{ color: '#fbbf24' }}>{actualMaxHR} bpm</strong>.
                              Zona latihan lo dikalkulasi pakai data aktual yang lebih akurat.
                            </>
                          ) : (
                            <>
                              Estimated Max HR based on age ({age} years) is <strong>{220 - age} bpm</strong>,
                              but your data recorded up to <strong style={{ color: '#fbbf24' }}>{actualMaxHR} bpm</strong>.
                              Your training zones are calculated using your more accurate actual data.
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sleep correlation summary */}
                    {avgRunSleep && avgNonRunSleep && (
                      <div className="chart-container" style={{ padding: '20px' }}>
                        <div className="chart-title" style={{ marginBottom: 14 }}>
                          {lang === 'id' ? 'Korelasi Tidur & Lari' : 'Sleep & Run Correlation'}
                        </div>
                        <div className="sleep-grid">
                          <div className="sleep-card">
                            <div className="sleep-card-label" style={{ color: '#818cf8' }}>{lang === 'id' ? 'Tidur Setelah Lari' : 'Sleep After Run'}</div>
                            <div className="sleep-card-value">{avgRunSleep}<span className="metric-unit">/100</span></div>
                          </div>
                          <div className="sleep-card">
                            <div className="sleep-card-label" style={{ color: '#94a3b8' }}>{lang === 'id' ? 'Tidur Tanpa Lari' : 'Sleep Without Run'}</div>
                            <div className="sleep-card-value">{avgNonRunSleep}<span className="metric-unit">/100</span></div>
                          </div>
                        </div>
                        {parseFloat(avgRunSleep) > parseFloat(avgNonRunSleep) ? (
                          <div className="alert alert-success" style={{ marginTop: 10, marginBottom: 0 }}>
                            {lang === 'id' 
                              ? <>Lari meningkatkan kualitas tidur lo sebesar <strong>{(parseFloat(avgRunSleep) - parseFloat(avgNonRunSleep)).toFixed(1)} poin</strong>.</>
                              : <>Running improves your sleep quality by <strong>{(parseFloat(avgRunSleep) - parseFloat(avgNonRunSleep)).toFixed(1)} points</strong>.</>
                            }
                          </div>
                        ) : (
                          <div className="alert alert-info" style={{ marginTop: 10, marginBottom: 0 }}>
                            {lang === 'id'
                              ? <>Tidur lo cenderung lebih baik di hari tidak lari (selisih {(parseFloat(avgNonRunSleep) - parseFloat(avgRunSleep)).toFixed(1)} poin). Coba evaluasi recovery-mu.</>
                              : <>Your sleep tends to be better on rest days (difference of {(parseFloat(avgNonRunSleep) - parseFloat(avgRunSleep)).toFixed(1)} points). Assess your recovery routines.</>
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────── TRAINING PLAN ─────────────────── */}
            {tab === 'training' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">{lang === 'id' ? 'Rekomendasi Jadwal Mingguan' : 'Recommended Weekly Schedule'}</h2>
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
                  gender={data.profile?.gender}
                  weight={data.profile?.weight}
                  height={data.profile?.height}
                  age={data.profile?.age}
                  lang={lang}
                />

                <div className="info-card purple" style={{ marginTop: 20 }}>
                  <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Tips:</strong>{' '}
                    {lang === 'id' ? (
                      <>
                        Naikkan volume maksimal <strong>10% per minggu</strong>.
                        Jangan "balas dendam" lari jauh tiba-tiba setelah beberapa hari off — cedera bisa menghancurkan progress berbulan-bulan.
                        Konsistensi jauh lebih valuable dari satu sesi epic!
                      </>
                    ) : (
                      <>
                        Increase training volume by a maximum of <strong>10% weekly</strong>.
                        Do not run excessive recovery distances suddenly after off-days — injuries can undo months of hard progress.
                        Consistency is far more valuable than one epic session!
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ─────────────────── RACE PREDICTION ─────────────────── */}
            {tab === 'race' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">{t.tabRacePrediction}</h2>
                </div>
                <RacePrediction activities={runActs} targetPace={targetPace} lang={lang} />
              </div>
            )}

            {/* ─────────────────── RUN HISTORY ─────────────────── */}
            {tab === 'history' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">
                    {lang === 'id' ? `Riwayat Sesi Lari (${totalSessions})` : `Run Session History (${totalSessions})`}
                  </h2>
                </div>
                <RunHistory activities={runActs} lang={lang} />
              </div>
            )}

            {/* ─────────────────── SLEEP ANALYSIS ─────────────────── */}
            {tab === 'sleep' && (
              <div className="animate-fade-in">
                <div className="section-header">
                  <h2 className="section-title">{t.tabSleepAnalysis}</h2>
                </div>

                {Object.keys(sleepRecs).length === 0 ? (
                  <div className="info-card">
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      {lang === 'id' 
                        ? 'Belum ada data tidur. Catat tidur lo via sidebar atau upload file Garmin.' 
                        : 'No sleep data recorded yet. Log your sleep using the sidebar or upload a Garmin file.'}
                    </p>
                  </div>
                ) : (
                  <>
                    {latestSleepDate && (
                      <div className="readiness-card animate-fade-in">
                        <div className="readiness-dial-wrapper">
                          <div className="readiness-dial" style={{ 
                            background: `conic-gradient(${rColor} ${trainingReadinessScore}%, ${rBgColor} ${trainingReadinessScore}%)`
                          }}>
                            <div className="readiness-dial-value">{trainingReadinessScore}%</div>
                          </div>
                          <div className="readiness-dial-label" style={{ color: rColor }}>
                            {trainingReadinessScore >= 80 ? (lang === 'id' ? 'Prima' : 'Prime') : trainingReadinessScore >= 60 ? (lang === 'id' ? 'Cukup' : 'Fair') : (lang === 'id' ? 'Rendah' : 'Low')}
                          </div>
                        </div>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: rColor }}>
                              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                            </svg>
                            {lang === 'id' ? 'Kesiapan Latihan Terkini' : 'Current Training Readiness'}
                          </h3>
                          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.6', margin: 0 }}>
                            {readinessDesc.sleepPart}
                            {readinessDesc.restPart}
                            {readinessDesc.actionPart}
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
                                {new Date(date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                {runDates.has(date) && <span className="badge badge-easy" style={{ marginLeft: 8, padding: '1px 6px', fontSize: 10 }}>{lang === 'id' ? 'Lari' : 'Ran'}</span>}
                              </div>
                              {rec.duration && (
                                <div className="sleep-card-dur">{rec.duration.toFixed(1)} {lang === 'id' ? 'jam tidur' : 'hrs sleep'}</div>
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
            {/* Blog logic has been moved to a standalone page handler at the top of App.jsx */}
          </>
        )}
      </main>

      {/* ═══════════════════════════════ ADD RUN MODAL ═══════════════════════════════ */}
      {showAddRunModal && (
        <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowAddRunModal(false); }}>
          <div className="animate-fade-in" style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-premium)' }}>
            <h3 style={{ marginBottom: 16 }}>{lang === 'id' ? 'Tambah Sesi Lari Manual' : 'Add Run Session Manually'}</h3>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{lang === 'id' ? 'Judul / Nama Lari' : 'Activity Name'}</label>
              <input
                className="form-input"
                type="text"
                placeholder={lang === 'id' ? 'cth: Morning Run, Senayan Loop...' : 'e.g. Morning Run, Central Park...'}
                value={manualRun.name}
                onChange={e => setManualRun(r => ({ ...r, name: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{lang === 'id' ? 'Tanggal' : 'Date'}</label>
              <input className="form-input" type="date" value={manualRun.date} onChange={e => setManualRun(r => ({ ...r, date: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <NumberInput label={lang === 'id' ? 'Jarak (km)' : 'Distance (km)'} value={manualRun.distance} onChange={v => setManualRun(r => ({ ...r, distance: v }))} min={0.1} step={0.1} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <NumberInput label={lang === 'id' ? 'Durasi (menit)' : 'Duration (mins)'} value={manualRun.duration} onChange={v => setManualRun(r => ({ ...r, duration: v }))} min={1} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
              <NumberInput label="Avg HR" value={manualRun.avgHr} onChange={v => setManualRun(r => ({ ...r, avgHr: v }))} min={40} max={220} />
              <NumberInput label="Max HR" value={manualRun.maxHr} onChange={v => setManualRun(r => ({ ...r, maxHr: v }))} min={100} max={250} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowAddRunModal(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={() => { saveManualRun(); setShowAddRunModal(false); }}>{lang === 'id' ? 'Simpan Lari' : 'Save Run'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ LOG TIDUR MODAL ═══════════════════════════════ */}
      {showSleepModal && (
        <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowSleepModal(false); }}>
          <div className="animate-fade-in" style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-premium)' }}>
            <h3 style={{ marginBottom: 16 }}>{lang === 'id' ? 'Catat Tidur Semalam' : 'Log Night Sleep'}</h3>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{lang === 'id' ? 'Tanggal' : 'Date'}</label>
              <input className="form-input" type="date" value={manualSleep.date} onChange={e => setManualSleep(s => ({ ...s, date: e.target.value }))} />
            </div>
            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{t.sleepQuality}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                {[
                  { val: 'pulas', label: lang === 'id' ? '😴 Sangat Pulas & Segar' : '😴 Deep Sleep & Refreshed', col: '#10b981' },
                  { val: 'cukup', label: lang === 'id' ? '🙂 Cukup Baik' : '🙂 Okay / Normal', col: '#38bdf8' },
                  { val: 'kurang', label: lang === 'id' ? '🥱 Kurang Nyenyak' : '🥱 Poor / Interrupted', col: '#f59e0b' },
                  { val: 'begadang', label: lang === 'id' ? '😫 Begadang / Sangat Kurang' : '😫 Restless / Too Short', col: '#f43f5e' }
                ].map(q => (
                  <button key={q.val} type="button" onClick={() => setManualSleep(s => ({ ...s, quality: q.val }))}
                    style={{ background: manualSleep.quality === q.val ? `${q.col}15` : 'var(--bg-card)', border: `1.5px solid ${manualSleep.quality === q.val ? q.col : 'var(--border)'}`, color: manualSleep.quality === q.val ? q.col : 'var(--text-secondary)', padding: '12px', borderRadius: 8, textAlign: 'left', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: 24 }}>
              <NumberInput label={lang === 'id' ? 'Durasi Tidur (jam)' : 'Sleep Duration (hrs)'} value={manualSleep.duration} onChange={v => setManualSleep(s => ({ ...s, duration: v }))} min={1} max={24} step={0.5} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowSleepModal(false)}>{lang === 'id' ? 'Batal' : 'Cancel'}</button>
              <button className="btn btn-primary" onClick={() => { saveManualSleep(); setShowSleepModal(false); }}>{lang === 'id' ? 'Simpan Tidur' : 'Save Sleep'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════ UPLOAD DATA MODAL ═══════════════════════════════ */}
      {showUploadModal && (
        <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowUploadModal(false); }}>
          <div className="animate-fade-in" style={{ background: 'var(--bg-surface)', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-premium)' }}>

            
            <input 
              ref={fileInputRef} type="file" accept=".zip,.gpx,.xlsx,.xls,.csv" style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                setShowUploadModal(false); // Close modal when a file is selected
                const name = file.name.toLowerCase();
                if (name.endsWith('.zip') || name.endsWith('.gpx')) {
                  handleFileUpload(file);
                } else if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
                  handleExcelUpload(file);
                } else {
                  addToast(lang === 'id' ? 'Format file tidak didukung' : 'File format not supported', 'error');
                }
              }}
            />

            <div
              className={`file-upload-area ${isUploading ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              style={{ cursor: 'pointer', marginBottom: 16 }}
            >
              {isUploading ? (
                <div>
                  <div className="loading-bar" style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.loading}</div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{t.uploadAreaTitle}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {t.uploadAreaDesc}
                  </div>
                  <div style={{ marginTop: 12 }}>
                    <span
                      onClick={e => {
                        e.stopPropagation();
                        downloadExcelTemplate();
                      }}
                      style={{ fontSize: 11, color: '#60a5fa', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer', display: 'block', marginBottom: 8 }}
                    >
                      {t.downloadExcelTemplate}
                    </span>
                    <span 
                      onClick={e => {
                        e.stopPropagation();
                        setShowExportGuide(true);
                      }}
                      style={{ fontSize: 11, color: '#60a5fa', textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}
                    >
                      {lang === 'id' ? 'Cara Export Data Smartwatch' : 'How to Export Watch Data'}
                    </span>
                  </div>
                </>
              )}
            </div>

            {isAdmin && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ATAU</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
                    if (!clientId) {
                      alert('Strava Client ID belum dikonfigurasi di Environment Variables!');
                      return;
                    }
                    const redirectUri = window.location.origin;
                    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=force&scope=activity:read_all`;
                  }} 
                  style={{ 
                    width: '100%', 
                    background: data.profile?.stravaConnected ? 'rgba(252, 76, 2, 0.2)' : '#fc4c02', 
                    color: data.profile?.stravaConnected ? '#fc4c02' : '#fff', 
                    border: data.profile?.stravaConnected ? '1px solid rgba(252, 76, 2, 0.5)' : 'none', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14 
                  }}
                >
                  {data.profile?.stravaConnected ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
                    </svg>
                  )}
                  {data.profile?.stravaConnected 
                    ? (lang === 'id' ? 'Strava Terhubung (Klik untuk Sync)' : 'Strava Connected (Click to Sync)')
                    : 'Connect with Strava (Admin Only)'}
                </button>
              </>
            )}

            <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)} style={{ width: '100%', marginTop: 20 }}>Tutup</button>
          </div>
        </div>
      )}

      {showExportGuide && <ExportGuideModal onClose={() => setShowExportGuide(false)} lang={lang} />}
      {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} lang={lang} addToast={addToast} />}

      <AICoachChat 
        lang={lang} 
        goal={goal} 
        programStyle={programStyle} 
        targetPace={targetPace} 
        currentUser={data?.profile?.displayName || currentUser} 
        runActs={runActs}
        selectedDays={selectedDays}
      />
      <Toast toasts={toasts} />
    </div>
  );
}

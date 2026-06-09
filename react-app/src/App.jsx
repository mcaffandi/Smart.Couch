import ErrorBoundary from "./ErrorBoundary";
import { useState, useCallback, useEffect, useRef, useMemo, lazy, Suspense } from 'react';
import ImageCropperModal from './ImageCropperModal';
import {
  loadUsersList, saveUsersList, getCurrentUser, saveCurrentUser,
  loadUserData, saveUserData, deleteUserData,
  getLocalDateStr, msToDate, formatDate, formatPace, getPaceRecommendations,
  getHRZones, buildTrainingPlan, buildAdaptiveCalendar,
  parseGarminZip, mergeData, parseGpxFile, decodePolyline
} from './utils';
const TrendChart = lazy(() => import('./Charts').then(m => ({ default: m.TrendChart })));
const HRZoneChart = lazy(() => import('./Charts').then(m => ({ default: m.HRZoneChart })));
const RunHistory = lazy(() => import('./RunHistory'));
const RunDetailsModal = lazy(() => import('./RunDetailsModal'));
const TrainingPlan = lazy(() => import('./TrainingPlan'));
const RacePrediction = lazy(() => import('./RacePrediction'));
import LoginScreen from './LoginScreen';
const AICoachChat = lazy(() => import('./AICoachChat'));
const AICoach = lazy(() => import('./AICoach'));
import LandingPage from './LandingPage';
import OnboardingWizard from './OnboardingWizard';
const AdminDashboard = lazy(() => import('./AdminDashboard'));
import BlogModule from './Blog';
import { AboutPage, PrivacyPage, ContactPage } from './StaticPages';
import Logo from './Logo';
import GoalProgressWidget from './GoalProgressWidget';
const ExportGuideModal = lazy(() => import('./ExportGuideModal'));
const FeedbackModal = lazy(() => import('./FeedbackModal'));
const PremiumModal = lazy(() => import('./PremiumModal'));
import { Sun, Moon, Coffee, Crown } from 'lucide-react';
import { translations } from './translations';
import {
  auth,
  db,
  storage,
  signOut,
  deleteUser,
  onAuthStateChanged,
  isConfigured as isFirebaseConfigured,
  googleProvider,
  signInWithPopup
} from './firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, deleteDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Toast, CustomOneTap, Collapsible, NumberInput, LiveCountdown } from './SharedUI';

// ─── Main App ─────────────────────────────────────────────────────────────────

const ADMIN_EMAILS = ['m.c.affandi@gmail.com', 'affanbelajar@gmail.com'];

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  // ── State: data ─────────────────────────────────────────────────────────────
  const [sessionUser, setSessionUser] = useState(() => sessionStorage.getItem('smartcoach_session') || null);
  const [isAuthReady, setIsAuthReady] = useState(false);
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

  const handleOneTapSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      addToast(lang === 'id' ? `Selamat datang, ${result.user.displayName || 'User'}!` : `Welcome, ${result.user.displayName || 'User'}!`);
    } catch (error) {
      console.error(error);
      if (error.code !== 'auth/popup-closed-by-user') {
        addToast(lang === 'id' ? 'Gagal masuk menggunakan Google.' : 'Failed to sign in with Google.', 'error');
      }
    }
  };

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
  const [croppingImageSrc, setCroppingImageSrc] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddRunModal, setShowAddRunModal] = useState(false);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncedRuns, setSyncedRuns] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showExportGuide, setShowExportGuide] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showAdmin, setShowAdmin] = useState(window.location.hash.toLowerCase() === '#hq-enduraup-secure');
  const [visitorCount, setVisitorCount] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [profileEditMode, setProfileEditMode] = useState(false);
  const [goal, setGoal] = useState(() => data.profile?.goal ?? 'maintenance');
  const [programStyle, setProgramStyle] = useState(() => data.profile?.programStyle ?? 'sedang');
  const [targetPace, setTargetPace] = useState(() => data.profile?.targetPace ?? null);
  const [selectedDays, setSelectedDays] = useState(() => data.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu']);
  const [globalSettings, setGlobalSettings] = useState({ stravaSyncMode: 'fast' });
  const [dashboardTimeRange, setDashboardTimeRange] = useState('all');

  useEffect(() => {
    if (!globalSettings) return;

    if (globalSettings.googleAnalyticsCode) {
      let code = globalSettings.googleAnalyticsCode.trim();
      if (code.startsWith('G-')) {
        if (!document.getElementById('ga-script-1')) {
          const script1 = document.createElement('script');
          script1.async = true;
          script1.src = `https://www.googletagmanager.com/gtag/js?id=${code}`;
          script1.id = 'ga-script-1';
          document.head.appendChild(script1);
          
          const script2 = document.createElement('script');
          script2.id = 'ga-script-2';
          script2.innerHTML = `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${code}');
          `;
          document.head.appendChild(script2);
        }
      } else if (code.includes('<script')) {
        if (!document.getElementById('ga-custom-container')) {
          const div = document.createElement('div');
          div.id = 'ga-custom-container';
          document.head.appendChild(div);
          const fragment = document.createRange().createContextualFragment(code);
          div.appendChild(fragment);
        }
      }
    }

    if (globalSettings.adsenseCode) {
      if (!document.getElementById('adsense-container')) {
        const div = document.createElement('div');
        div.id = 'adsense-container';
        document.head.appendChild(div);
        const fragment = document.createRange().createContextualFragment(globalSettings.adsenseCode);
        div.appendChild(fragment);
      }
    }
  }, [globalSettings]);

  useEffect(() => {
    const handleHashChange = () => {
      setShowAdmin(window.location.hash.toLowerCase() === '#hq-enduraup-secure');
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

    const fetchGlobalSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'global');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          setGlobalSettings(snap.data());
        }
      } catch (e) {
        console.error("Settings error", e);
      }
    };
    fetchGlobalSettings();

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        const userIdentifier = fbUser.email || fbUser.displayName || `Anonim-${fbUser.uid.substring(0, 4)}`;
        setSessionUser(userIdentifier);
        sessionStorage.setItem('smartcoach_session', userIdentifier);
        if (fbUser.email) {
          localStorage.setItem('smartcoach_last_email', fbUser.email);
        }

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
      } else {
        setSessionUser(null);
        sessionStorage.removeItem('smartcoach_session');
      }
      setIsAuthReady(true);
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
    date: getLocalDateStr(),
    time: '06:00',
    distance: 5.0,
    duration: 30,
    avgHr: 145,
    maxHr: 180,
  });
  const [manualSleep, setManualSleep] = useState({
    inputType: 'score', // 'quality' or 'score'
    date: getLocalDateStr(),
    quality: 'cukup',
    score: 80,
    sleepHours: 7,
    sleepMinutes: 0,
    sleepType: 'night', // 'night' or 'nap'
  });

  // ── State: active tab ────────────────────────────────────────────────────────
  const [tab, setTab] = useState(() => {
    const path = window.location.pathname;
    if (path.startsWith('/blog')) return 'blog';
    if (path === '/about') return 'about';
    if (path === '/privacy') return 'privacy';
    if (path === '/contact') return 'contact';
    return 'dashboard';
  });
  const [showLanding, setShowLanding] = useState(() => {
    const path = window.location.pathname;
    return !(path.startsWith('/blog') || path === '/about' || path === '/privacy' || path === '/contact');
  });
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [blogView, setBlogView] = useState('list');
  const [blogSearch, setBlogSearch] = useState('');
  const [bypassedEmptyState, setBypassedEmptyState] = useState(() => localStorage.getItem('enduraup_bypassed_empty') === 'true');

  // Handle browser routing (back/forward)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/blog')) { setTab('blog'); setShowLanding(false); }
      else if (path === '/about') { setTab('about'); setShowLanding(false); }
      else if (path === '/privacy') { setTab('privacy'); setShowLanding(false); }
      else if (path === '/contact') { setTab('contact'); setShowLanding(false); }
      else { setTab('dashboard'); }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync tab state to URL
  useEffect(() => {
    let targetPath = '/';
    if (tab === 'blog') targetPath = '/blog';
    else if (tab === 'about') targetPath = '/about';
    else if (tab === 'privacy') targetPath = '/privacy';
    else if (tab === 'contact') targetPath = '/contact';
    
    if (window.location.pathname !== targetPath && !window.location.pathname.startsWith('/blog/')) {
      window.history.pushState(null, '', targetPath);
    }
  }, [tab]);

  // ── State: share performance card modal ──────────────────────────────────────
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedRunForDetails, setSelectedRunForDetails] = useState(null);

  useEffect(() => {
    if (showShareModal || showProfileModal || showAddRunModal || showSleepModal || showUploadModal || selectedRunForDetails) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [showShareModal, showProfileModal, showAddRunModal, showSleepModal, showUploadModal, selectedRunForDetails]);
  const [shareTemplate, setShareTemplate] = useState('vo2');
  const [shareStatsPeriod, setShareStatsPeriod] = useState('yearly');
  const [shareTheme, setShareTheme] = useState('dark');
  const [shareShape, setShareShape] = useState('square');
  const [customCaption, setCustomCaption] = useState('Lihat pencapaian lari gue di EnduraUP! Gabung yuk di www.enduraup.space');
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

  const [avatarImgObj, setAvatarImgObj] = useState(null);
  useEffect(() => {
    if (avatar) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = avatar;
      img.onload = () => setAvatarImgObj(img);
      img.onerror = () => setAvatarImgObj(null);
    } else {
      setAvatarImgObj(null);
    }
  }, [avatar]);

  // ── State: user profiles ─────────────────────────────────────────────────────
  const syncFromFirestore = useCallback(async (username) => {
    if (!isFirebaseConfigured || !auth.currentUser) return;
    const userIdentifier = auth.currentUser.email || auth.currentUser.displayName || `Anonim-${auth.currentUser.uid.substring(0, 4)}`;
    if (username !== userIdentifier) return;

    try {
      const userDocId = auth.currentUser.email ? auth.currentUser.email.toLowerCase() : auth.currentUser.uid;
      const userDocRef = doc(db, 'users', userDocId);
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
        setDoc(userDocRef, { ...safeData, lastLogin: serverTimestamp() }, { merge: true }).catch(e => {
          console.error('Failed to update synced data back to Firestore:', e);
        });
      } else {
        // Migration: Check if they have legacy data under their old UID
        const legacyDocRef = doc(db, 'users', auth.currentUser.uid);
        const legacySnap = await getDoc(legacyDocRef);
        
        let dataToSave;
        if (legacySnap.exists()) {
          const legacyData = legacySnap.data();
          const localData = loadUserData(username);
          
          const safeAge = legacyData.profile?.age ?? localData.profile?.age ?? null;
          const safeWeight = legacyData.profile?.weight ?? localData.profile?.weight ?? null;
          const safeHeight = legacyData.profile?.height ?? localData.profile?.height ?? null;
          const safeGender = legacyData.profile?.gender ?? localData.profile?.gender ?? '';
          const safeGoal = legacyData.profile?.goal ?? localData.profile?.goal ?? 'maintenance';
          const safeStyle = legacyData.profile?.programStyle ?? localData.profile?.programStyle ?? 'sedang';
          const safeTargetPace = legacyData.profile?.targetPace ?? localData.profile?.targetPace ?? null;
          const safeDays = legacyData.profile?.selectedDays ?? localData.profile?.selectedDays ?? ['Selasa', 'Kamis', 'Sabtu'];

          dataToSave = {
            ...localData,
            ...legacyData,
            profile: {
              ...(localData.profile || {}),
              ...(legacyData.profile || {}),
            }
          };

          setData(dataToSave);
          setAge(safeAge);
          setDisplayName(dataToSave.profile?.displayName || '');
          setWeight(safeWeight);
          setHeight(safeHeight);
          setGender(safeGender);
          setAvatar(dataToSave.profile?.avatar || null);
          setGoal(safeGoal);
          setProgramStyle(safeStyle);
          setTargetPace(safeTargetPace);
          setSelectedDays(safeDays);
          localStorage.setItem(`smartcoach_data_user_${username}`, JSON.stringify(dataToSave));
        } else {
          dataToSave = loadUserData(username);
        }
        await setDoc(userDocRef, { ...dataToSave, lastLogin: serverTimestamp() }, { merge: true });
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
        
        // Firestore doesn't support nested arrays. Sanitize any legacy route data.
        if (dataToSave.running_activities) {
          dataToSave.running_activities.forEach(act => {
            if (act.route && Array.isArray(act.route)) {
              act.route = act.route.map(pt => {
                if (Array.isArray(pt)) return { lat: pt[0], lon: pt[1] };
                return pt;
              });
            }
            // Firestore strictly blocks undefined values, so strip them out:
            Object.keys(act).forEach(k => act[k] === undefined && delete act[k]);
          });
        }

        const userDocId = auth.currentUser.email ? auth.currentUser.email.toLowerCase() : auth.currentUser.uid;
        const userDocRef = doc(db, 'users', userDocId);
        setDoc(userDocRef, dataToSave, { merge: true }).catch(e => {
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

  const handleLogWeight = useCallback((w) => {
    setData(prev => {
      const records = [...(prev.weight_records || [])];
      records.push({ date: new Date().toISOString(), weight: w });
      const updated = { 
        ...prev, 
        weight_records: records,
        profile: { ...(prev.profile || {}), weight: w }
      };
      setWeight(w);
      saveAndSyncData(updated);
      return updated;
    });
    addToast(lang === 'id' ? 'Berat badan berhasil dicatat!' : 'Weight logged successfully!');
  }, [lang, addToast]);

  const handleLogManualActivity = useCallback((dateStr, jenis, durationMins = 30) => {
    const d = new Date(dateStr + 'T12:00:00');
    const newAct = {
      startTimeLocal: d.getTime(),
      distance: 0,
      duration: durationMins * 60000,
      activityType: 'manual',
      name: jenis,
      isManual: true
    };
    setData(prev => {
      const mergedRuns = [...(prev.running_activities || []), newAct].sort((a,b) => a.startTimeLocal - b.startTimeLocal);
      const updated = { ...prev, running_activities: mergedRuns };
      saveAndSyncData(updated);
      return updated;
    });
    addToast(lang === 'id' ? `Berhasil mencatat: ${jenis}` : `Logged: ${jenis}`, 'success');
  }, [saveAndSyncData, lang, addToast]);

  const handleDeleteManualActivity = useCallback((dateStr) => {
    setData(prev => {
      const mergedRuns = (prev.running_activities || []).filter(a => {
        if (!a.isManual) return true;
        const aDate = msToDate(a.startTimeLocal);
        return aDate !== dateStr;
      });
      const updated = { ...prev, running_activities: mergedRuns };
      saveAndSyncData(updated);
      return updated;
    });
    addToast(lang === 'id' ? 'Aktivitas dihapus' : 'Activity removed', 'info');
  }, [saveAndSyncData, lang, addToast]);

  // ── Strava Integration ───────────────────────────────────────────────────────
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code && currentUser && isAuthReady) {
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
        
        const savedTokens = {
          stravaAccessToken: tokenData.access_token,
          stravaRefreshToken: tokenData.refresh_token,
          stravaTokenExpiresAt: tokenData.expires_at * 1000
        };
        
        const isPremiumUser = data.profile?.isPremium;
        const userSyncMode = data.profile?.stravaSyncMode || 'fast';
        const effectiveSyncMode = isPremiumUser ? userSyncMode : (globalSettings?.stravaSyncMode || 'fast');
        const perPage = effectiveSyncMode === 'full' ? 200 : 5;
        return fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
          headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
        })
        .then(res => res.json())
        .then(activities => ({ activities, savedTokens }));
      })
      .then(({ activities, savedTokens }) => {
        if (!Array.isArray(activities)) throw new Error('Invalid Strava Data');
        
        let newRuns = [];
        activities.forEach(act => {
          if (act.type === 'Run') {
            const startDateLocal = new Date(act.start_date).getTime();
            newRuns.push({
              stravaId: act.id,
              name: act.name || null,
              startTimeLocal: startDateLocal,
              distance: act.distance * 100, // meters to cm
              duration: act.moving_time * 1000, // seconds to ms
              avgHr: act.average_heartrate ? Math.round(act.average_heartrate) : null,
              maxHr: act.max_heartrate ? Math.round(act.max_heartrate) : null,
              route: act.map && act.map.summary_polyline ? decodePolyline(act.map.summary_polyline) : null
            });
          }
        });

        if (newRuns.length === 0) {
          addToast(lang === 'id' ? 'Tidak ada lari baru di Strava' : 'No new runs found in Strava', 'info');
          setData(prev => {
            const updated = { 
              ...prev, 
              profile: { 
                ...(prev.profile || {}), 
                stravaConnected: true,
                ...savedTokens
              } 
            };
            saveAndSyncData(updated);
            return updated;
          });
          setIsUploading(false);
          return;
        }

        setData(prev => {
          let mergedRuns = [...(prev.running_activities || [])];
          let addedCount = 0;
          let recentlyAdded = [];
          newRuns.forEach(nr => {
            const exists = mergedRuns.find(er => Math.abs(er.startTimeLocal - nr.startTimeLocal) < 60000);
            if (!exists) {
              mergedRuns.push(nr);
              recentlyAdded.push(nr);
              addedCount++;
            }
          });
          
          if (addedCount > 0) {
            setSyncedRuns(recentlyAdded);
            setShowSyncModal(true);
            
            // Calculate added recovery for notification
            const userMaxHr = actualMaxHR || (220 - (age || 30));
            let totalAddedHours = 0;
            recentlyAdded.forEach(r => {
              const durationHours = (r.duration || 0) / 3600000;
              let added = durationHours * 18;
              if (r.avgHr) {
                const intensity = r.avgHr / userMaxHr;
                if (intensity < 0.60) added = durationHours * 6;     // Recovery: 6h per jam
                else if (intensity < 0.70) added = durationHours * 14;   // Base: 14h per jam
                else if (intensity < 0.80) added = durationHours * 24;   // Tempo: 24h per jam
                else if (intensity < 0.90) added = durationHours * 36;   // Threshold: 36h per jam
                else added = durationHours * 48;                         // Anaerobic: 48h per jam
              }
              totalAddedHours += added;
            });
            
            setNotifications(prev => [
              {
                id: Date.now(),
                title: lang === 'id' ? 'Sinkronisasi Selesai' : 'Sync Complete',
                message: lang === 'id' 
                  ? `Data lari baru berhasil di-sync. Beban latihan kamu bertambah sekitar ${Math.round(totalAddedHours)} jam waktu pemulihan.`
                  : `New runs synced. Your training load increased by roughly ${Math.round(totalAddedHours)} hours of recovery time.`,
                time: Date.now(),
                read: false
              },
              ...prev
            ]);
          }
          mergedRuns.sort((a,b) => a.startTimeLocal - b.startTimeLocal);
          
          let maxHr = prev.max_hr || 0;
          mergedRuns.forEach(r => {
            if (r.maxHr && r.maxHr > maxHr) maxHr = r.maxHr;
          });

          const updated = { 
            ...prev, 
            running_activities: mergedRuns, 
            max_hr: maxHr,
            profile: { 
              ...(prev.profile || {}), 
              stravaConnected: true,
              ...savedTokens
            }
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
  }, [currentUser, isAuthReady, saveAndSyncData, lang, addToast]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const runActs = data.running_activities ?? [];
  const sleepRecs = data.sleep_records ?? {};
  const actualMaxHR = data.max_hr ?? 0;
  const isPremium = data.profile?.isPremium || false;

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
    const todayStr = getLocalDateStr();
    const dToday = new Date(todayStr);
    const dRun = new Date(lastRunDate);
    const diffTime = dToday - dRun;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }, [runActs]);

  // Calculate recovery remaining hours based on runs and sleep
  const { recoveryRemainingHours, recoveryEndTimestamp } = useMemo(() => {
    if (!runActs || !runActs.length) return { recoveryRemainingHours: 0, recoveryEndTimestamp: null };
    
    const events = [];
    runActs.forEach(r => {
      if (r.startTimeLocal) {
        const endTime = r.startTimeLocal + (r.duration || 0);
        events.push({ type: 'run', time: endTime, data: r });
      }
    });
    
    Object.entries(sleepRecs || {}).forEach(([key, sleep]) => {
      const actualDate = sleep.dateStr || key.split('_')[0];
      const d = new Date(actualDate + 'T08:00:00');
      events.push({ type: 'sleep', time: d.getTime(), data: sleep });
    });
    
    events.sort((a, b) => a.time - b.time);
    
    let currentRecoveryMs = 0;
    let lastTime = null;
    const userMaxHr = actualMaxHR || (220 - (age || 30));
    
    events.forEach(ev => {
      if (lastTime) {
        const timePassed = ev.time - lastTime;
        currentRecoveryMs = Math.max(0, currentRecoveryMs - timePassed);
      }
      
      if (ev.type === 'run') {
        const durationHours = (ev.data.duration || 0) / 3600000;
        let addedHours = durationHours * 18; // default
        if (ev.data.avgHr) {
          const intensity = ev.data.avgHr / userMaxHr;
          if (intensity < 0.60) addedHours = durationHours * 6;         // Recovery (Z1)
          else if (intensity < 0.70) addedHours = durationHours * 14;   // Base (Z2)
          else if (intensity < 0.80) addedHours = durationHours * 24;   // Tempo (Z3)
          else if (intensity < 0.90) addedHours = durationHours * 36;   // Threshold (Z4)
          else addedHours = durationHours * 48;                         // Anaerobic (Z5)
        } else if (ev.data.isManual && ev.data.name) {
          const nameLower = ev.data.name.toLowerCase();
          if (nameLower.includes('yoga') || nameLower.includes('stretch') || nameLower.includes('mobility')) {
            addedHours = durationHours * 2;   // Minimal strain
          } else if (nameLower.includes('jalan') || nameLower.includes('walk') || nameLower.includes('recovery')) {
            addedHours = durationHours * 6;   // Z1 equivalent
          } else if (nameLower.includes('bodyweight') || nameLower.includes('gym') || nameLower.includes('strength') || nameLower.includes('core')) {
            addedHours = durationHours * 24;  // Muscular fatigue, equivalent to Z3
          } else if (nameLower.includes('hiit') || nameLower.includes('interval')) {
            addedHours = durationHours * 36;  // High EPOC / CNS strain
          } else {
            addedHours = durationHours * 14;  // Default to moderate Z2 load
          }
        } else {
          addedHours = durationHours * 14; // Default to moderate for unclassified activities without HR
        }
        currentRecoveryMs += (addedHours * 3600000);
      } else if (ev.type === 'sleep') {
        const score = ev.data.score || 75;
        const sleepHours = ev.data.duration || 7;
        let multiplier = 1.0;
        if (score >= 85) multiplier = 1.5;
        else if (score < 65) multiplier = 0.5;
        
        const bonusDeduction = (multiplier - 1.0) * sleepHours * 3600000;
        currentRecoveryMs = Math.max(0, currentRecoveryMs - bonusDeduction);
      }
      
      lastTime = ev.time;
    });
    
    if (lastTime) {
      const timePassed = Date.now() - lastTime;
      currentRecoveryMs = Math.max(0, currentRecoveryMs - timePassed);
    }
    
    return {
      recoveryRemainingHours: Math.max(0, Math.round(currentRecoveryMs / 3600000)),
      recoveryEndTimestamp: currentRecoveryMs > 0 ? Date.now() + currentRecoveryMs : null
    };
  }, [runActs, sleepRecs, actualMaxHR, age]);

  // Adjust readiness score based on sleep score and running fatigue/rest
  const trainingReadiness = useMemo(() => {
    if (latestSleepScore === null) return null;
    let score = latestSleepScore;
    
    if (recoveryRemainingHours <= 0) {
      if (latestSleepScore >= 50) {
        score = Math.max(80, score);
      }
    } else {
      const penalty = Math.min(50, Math.round(recoveryRemainingHours * (50 / 48)));
      score = Math.max(10, score - penalty);
    }
    
    return Math.round(score);
  }, [latestSleepScore, recoveryRemainingHours]);

  const runDates = new Set(runActs.map(a => a.startTimeLocal ? msToDate(a.startTimeLocal) : null).filter(Boolean));
  const runDayScores = Object.entries(sleepRecs).filter(([k, v]) => runDates.has(v.dateStr || k.split('_')[0])).map(([, v]) => v.score);
  const nonRunDayScores = Object.entries(sleepRecs).filter(([k, v]) => !runDates.has(v.dateStr || k.split('_')[0])).map(([, v]) => v.score);
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

    // ── Ultra-HD Canvas Setup (2160x2160) ──
    const W = 1080;
    const H = 1080;
    canvas.width = W * 2;
    canvas.height = H * 2;
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, W, H);

    // ── Helper functions ──
    const fillRoundedRect = (cCtx, x, y, width, height, radius, fillStyle) => {
      cCtx.fillStyle = fillStyle;
      cCtx.beginPath();
      if (cCtx.roundRect) {
        cCtx.roundRect(x, y, width, height, radius);
      } else {
        cCtx.moveTo(x + radius, y);
        cCtx.lineTo(x + width - radius, y);
        cCtx.quadraticCurveTo(x + width, y, x + width, y + radius);
        cCtx.lineTo(x + width, y + height - radius);
        cCtx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        cCtx.lineTo(x + radius, y + height);
        cCtx.quadraticCurveTo(x, y + height, x, y + height - radius);
        cCtx.lineTo(x, y + radius);
        cCtx.quadraticCurveTo(x, y, x + radius, y);
      }
      cCtx.fill();
    };

    // ── Theme configuration ──
    let bgGrad = ctx.createLinearGradient(0, 0, W, H);
    let accentPrimary, accentSecondary, textPrimary, textSecondary, textMuted, borderStroke, glassBg;

    if (shareTheme === 'dark') {
      bgGrad.addColorStop(0, '#09090b'); bgGrad.addColorStop(1, '#18181b');
      accentPrimary = '#a78bfa'; accentSecondary = '#c084fc';
      textPrimary = '#ffffff'; textSecondary = 'rgba(255,255,255,0.6)'; textMuted = 'rgba(255,255,255,0.3)';
      borderStroke = 'rgba(255,255,255,0.08)'; glassBg = 'rgba(20,20,24,0.7)';
    } else if (shareTheme === 'cyber') {
      bgGrad.addColorStop(0, '#020617'); bgGrad.addColorStop(1, '#0f172a');
      accentPrimary = '#06b6d4'; accentSecondary = '#3b82f6';
      textPrimary = '#f8fafc'; textSecondary = 'rgba(248,250,252,0.6)'; textMuted = 'rgba(248,250,252,0.3)';
      borderStroke = 'rgba(6,182,212,0.15)'; glassBg = 'rgba(2,6,23,0.8)';
    } else if (shareTheme === 'sunrise') {
      bgGrad.addColorStop(0, '#fff1f2'); bgGrad.addColorStop(1, '#ffedd5');
      accentPrimary = '#f43f5e'; accentSecondary = '#f97316';
      textPrimary = '#1a120a'; textSecondary = 'rgba(26,18,10,0.6)'; textMuted = 'rgba(26,18,10,0.4)';
      borderStroke = 'rgba(244,63,94,0.1)'; glassBg = 'rgba(255,255,255,0.6)';
    } else if (shareTheme === 'transparent') {
      bgGrad = 'transparent';
      accentPrimary = '#a78bfa'; accentSecondary = '#c084fc';
      textPrimary = '#ffffff'; textSecondary = 'rgba(255,255,255,0.8)'; textMuted = 'rgba(255,255,255,0.5)';
      borderStroke = 'rgba(255,255,255,0.3)'; glassBg = 'rgba(0,0,0,0.4)';
    } else {
      bgGrad.addColorStop(0, customColor1 || '#1e1b4b'); bgGrad.addColorStop(1, customColor2 || '#311042');
      accentPrimary = '#fbbf24'; accentSecondary = '#f59e0b';
      textPrimary = '#ffffff'; textSecondary = 'rgba(255,255,255,0.7)'; textMuted = 'rgba(255,255,255,0.3)';
      borderStroke = 'rgba(255,255,255,0.1)'; glassBg = 'rgba(0,0,0,0.3)';
    }

    const isTransparentLayout = shareTheme === 'transparent' || shareTemplate === 'sticker' || shareTemplate === 'polaroid';

    // Draw background
    if (!isTransparentLayout) {
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Draw glowing orbs
      const drawOrb = (ox, oy, or, color) => {
        const grad = ctx.createRadialGradient(ox, oy, 0, ox, oy, or);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, W, H);
      };
      
      if (shareTheme === 'dark') {
        drawOrb(200, 200, 700, 'rgba(167, 139, 250, 0.15)');
        drawOrb(800, 900, 600, 'rgba(99, 102, 241, 0.1)');
      } else if (shareTheme === 'cyber') {
        drawOrb(900, 100, 600, 'rgba(236, 72, 153, 0.15)');
        drawOrb(100, 900, 600, 'rgba(6, 182, 212, 0.15)');
      } else if (shareTheme === 'sunrise') {
        drawOrb(200, 200, 700, 'rgba(251, 146, 60, 0.2)');
        drawOrb(900, 800, 800, 'rgba(244, 63, 94, 0.15)');
      } else {
        drawOrb(540, 540, 800, 'rgba(255, 255, 255, 0.05)');
      }

      // Grid pattern
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1;
      for (let i = 0; i <= W; i += 60) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, H); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(W, i); ctx.stroke();
      }
    }

    // ── Main Glass Card ──
    const cardMargin = isTransparentLayout ? 20 : 40;
    const cardW = W - cardMargin * 2;
    const cardH = H - cardMargin * 2;
    
    if (isTransparentLayout) {
      // No glass card, purely transparent
    } else {
      fillRoundedRect(ctx, cardMargin, cardMargin, cardW, cardH, 32, glassBg);
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 2;
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cardMargin, cardMargin, cardW, cardH, 32); ctx.stroke(); }
      
      // Inner glare
      const glareGrad = ctx.createLinearGradient(cardMargin, cardMargin, cardMargin+cardW, cardMargin+cardH);
      glareGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
      glareGrad.addColorStop(1, 'transparent');
      fillRoundedRect(ctx, cardMargin, cardMargin, cardW, cardH, 32, glareGrad);

      ctx.save();
    }

    // ── Header ──
    if (shareTemplate !== 'sticker' && shareTemplate !== 'polaroid') {
      const athleteName = displayName || (currentUser ? currentUser.split('@')[0] : 'PELARI');
    ctx.fillStyle = textPrimary;
    ctx.font = '800 38px Outfit, sans-serif';
    ctx.fillText('EnduraUP', 90, 110);
    
    ctx.fillStyle = accentPrimary;
    ctx.font = '700 22px Inter, sans-serif';
    ctx.fillText('AI COACH', 290, 108);

    ctx.fillStyle = textSecondary;
    ctx.font = '600 26px Outfit, sans-serif';
    const nameWidth = ctx.measureText(athleteName.toUpperCase()).width;
    ctx.fillText(athleteName.toUpperCase(), W - 90 - nameWidth, 110);
    
    // Header divider
    ctx.strokeStyle = borderStroke;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(90, 150); ctx.lineTo(W - 90, 150); ctx.stroke();

      // ── Streak Badge ──
      if (typeof streakWeeks !== 'undefined' && streakWeeks >= 1) {
        const streakText = `⚡ ${streakWeeks} WEEK STREAK`;
        ctx.font = '800 18px Inter, sans-serif';
        const sw = ctx.measureText(streakText).width;
        fillRoundedRect(ctx, W - 90 - sw - 30, 180, sw + 30, 36, 18, shareTheme === 'sunrise' ? 'rgba(244,63,94,0.1)' : 'rgba(249, 115, 22, 0.15)');
        ctx.fillStyle = shareTheme === 'sunrise' ? '#e11d48' : '#f97316';
        ctx.fillText(streakText, W - 90 - sw - 15, 204);
      }
    }

    // ── TEMPLATE LOGIC ──
    const contentY = 220;

    if (shareTemplate === 'vo2') {
      ctx.fillStyle = textMuted;
      ctx.font = '800 24px Inter, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText((lang === 'id' ? 'ESTIMASI VO2MAX' : 'ESTIMATED VO2MAX').toUpperCase(), 90, contentY);
      ctx.letterSpacing = '0px';

      // Draw Circular Speedometer
      const cx = W / 2;
      const cy = 520;
      const r = 240;
      
      // background track
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0.75 * Math.PI, 2.25 * Math.PI);
      ctx.strokeStyle = shareTheme === 'sunrise' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 30;
      ctx.lineCap = 'round';
      ctx.stroke();

      const textVal = vo2max ? vo2max.toFixed(0) : 0;
      const progress = Math.min(Math.max((textVal - 30) / 40, 0), 1); // scale 30 to 70

      // glow effect
      ctx.shadowColor = accentPrimary;
      ctx.shadowBlur = 30;
      
      // active track
      ctx.beginPath();
      const endAngle = 0.75 * Math.PI + (progress * 1.5 * Math.PI);
      if (textVal > 0) {
        ctx.arc(cx, cy, r, 0.75 * Math.PI, endAngle);
        const arcGrad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
        arcGrad.addColorStop(0, accentSecondary);
        arcGrad.addColorStop(1, accentPrimary);
        ctx.strokeStyle = arcGrad;
        ctx.lineWidth = 30;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
      ctx.shadowBlur = 0;

      // Text inside circle
      ctx.textAlign = 'center';
      ctx.fillStyle = textPrimary;
      ctx.font = '800 180px Outfit, sans-serif';
      ctx.fillText(textVal || '–', cx, cy + 50);
      
      ctx.fillStyle = textSecondary;
      ctx.font = '600 32px Inter, sans-serif';
      ctx.fillText('ml/kg/min', cx, cy + 120);
      ctx.textAlign = 'left';

      // Fitness level
      let fitnessLevel = lang === 'id' ? 'Pemula' : 'Beginner';
      let fitnessDesc = lang === 'id' ? 'Fokus konsistensi latihan dasar.' : 'Focus on basic consistency.';
      if (vo2max >= 62) { fitnessLevel = lang === 'id' ? 'Elite' : 'Elite'; fitnessDesc = 'Performa puncak luar biasa.'; }
      else if (vo2max >= 57) { fitnessLevel = lang === 'id' ? 'Superior' : 'Superior'; fitnessDesc = 'Setara pelari kompetitif.'; }
      else if (vo2max >= 52) { fitnessLevel = lang === 'id' ? 'Sangat Baik' : 'Excellent'; fitnessDesc = 'Kapasitas aerobik sangat kuat.'; }
      else if (vo2max >= 46) { fitnessLevel = lang === 'id' ? 'Baik' : 'Good'; fitnessDesc = 'Performa lari solid & stabil.'; }
      else if (vo2max >= 38) { fitnessLevel = lang === 'id' ? 'Rata-Rata' : 'Average'; fitnessDesc = 'Kondisi fisik sehat & aktif.'; }

      ctx.textAlign = 'center';
      ctx.fillStyle = accentPrimary;
      ctx.font = '800 52px Outfit, sans-serif';
      ctx.fillText(fitnessLevel.toUpperCase(), cx, cy + 280);

      ctx.fillStyle = textSecondary;
      ctx.font = '500 28px Inter, sans-serif';
      ctx.fillText(fitnessDesc, cx, cy + 340);
      ctx.textAlign = 'left';

    } else if (shareTemplate === 'stats') {
      ctx.fillStyle = textMuted;
      ctx.font = '800 24px Inter, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText((lang === 'id' ? 'PERFORMANCE SUMMARY' : 'PERFORMANCE SUMMARY').toUpperCase(), 90, contentY);
      ctx.letterSpacing = '0px';

      const now = new Date();
      let targetActs = [];
      let periodLabel = '';
      if (shareStatsPeriod === 'weekly') { targetActs = runActs.filter(a => new Date(a.startTimeLocal) >= new Date(now.getTime() - 7*24*60*60*1000)); periodLabel = lang==='id'?'7 Hari':'7 Days'; }
      else if (shareStatsPeriod === 'monthly') { targetActs = runActs.filter(a => new Date(a.startTimeLocal) >= new Date(now.getTime() - 30*24*60*60*1000)); periodLabel = lang==='id'?'30 Hari':'30 Days'; }
      else if (shareStatsPeriod === '6months') { targetActs = runActs.filter(a => new Date(a.startTimeLocal) >= new Date(now.getTime() - 180*24*60*60*1000)); periodLabel = lang==='id'?'6 Bulan':'6 Months'; }
      else { const y = new Date().getFullYear(); targetActs = runActs.filter(a => new Date(a.startTimeLocal).getFullYear() === y); periodLabel = y.toString(); }

      const yearlyDist = targetActs.reduce((s, a) => s + (a.distance ?? 0) / 100000, 0);
      const yearlySessions = targetActs.length;
      const hrActs = targetActs.filter(a => a.avgHr);
      const yearlyAvgHR = hrActs.length ? hrActs.reduce((s, a) => s + (a.avgHr ?? 0), 0) / hrActs.length : 0;
      const yearlyMaxHR = targetActs.reduce((max, a) => Math.max(max, a.maxHr ?? 0), 0);

      // Draw Grid Stats
      const drawStatBox = (x, y, w, h, label, val, unit, color) => {
        fillRoundedRect(ctx, x, y, w, h, 24, shareTheme === 'sunrise' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.2)');
        ctx.strokeStyle = borderStroke;
        ctx.lineWidth = 1;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x,y,w,h,24); ctx.stroke(); }
        
        ctx.fillStyle = textSecondary;
        ctx.font = '600 20px Inter, sans-serif';
        ctx.fillText(label.toUpperCase(), x + 30, y + 50);
        
        ctx.fillStyle = textPrimary;
        ctx.font = '800 80px Outfit, sans-serif';
        ctx.fillText(val, x + 30, y + 140);
        
        ctx.fillStyle = color;
        ctx.font = '700 24px Inter, sans-serif';
        ctx.fillText(unit, x + 30, y + 185);
      };

      const boxW = 420;
      const boxH = 220;
      drawStatBox(90, 270, boxW, boxH, `Distance (${periodLabel})`, yearlyDist.toFixed(1), 'KILOMETERS', accentPrimary);
      drawStatBox(550, 270, boxW, boxH, `Workouts (${periodLabel})`, yearlySessions.toString(), 'SESSIONS', accentSecondary);
      drawStatBox(90, 520, boxW, boxH, 'Average HR', yearlyAvgHR ? Math.round(yearlyAvgHR).toString() : '–', 'BPM', '#34d399');
      drawStatBox(550, 520, boxW, boxH, 'Max HR', yearlyMaxHR ? yearlyMaxHR.toString() : '–', 'BPM', '#fbbf24');

      // Draw activity sparkline at the bottom
      ctx.fillStyle = textMuted;
      ctx.font = '600 20px Inter, sans-serif';
      ctx.fillText('ACTIVITY FREQUENCY', 90, 800);
      
      const sparkW = 880;
      const sparkH = 80;
      const sparkX = 90;
      const sparkY = 830;
      
      fillRoundedRect(ctx, sparkX, sparkY, sparkW, sparkH, 12, shareTheme === 'sunrise' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');
      
      // Mock sparkline logic based on targetActs (draw little bars)
      if (targetActs.length > 0) {
        const days = 30; // plot last 30 relative blocks
        const barW = (sparkW - 40) / days - 4;
        for(let i=0; i<days; i++) {
          const h = Math.random() * (sparkH - 20) + 10;
          fillRoundedRect(ctx, sparkX + 20 + i*(barW+4), sparkY + sparkH - h - 10, barW, h, 4, accentPrimary);
        }
      }

    } else if (shareTemplate === 'run') {
      ctx.fillStyle = textMuted;
      ctx.font = '800 24px Inter, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText((lang === 'id' ? 'LARI TERAKHIR' : 'LATEST RUN').toUpperCase(), 90, contentY);
      ctx.letterSpacing = '0px';

      const targetRun = selectedRunForDetails || runActs.find(a => a.route && a.route.length > 0) || runActs[0];

      if (targetRun) {
        // Draw run details text
        const distKm = ((targetRun.distance ?? 0) / 100000).toFixed(2);
        const totalSecs = Math.round((targetRun.duration ?? 0) / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        const durStr = `${m}:${s.toString().padStart(2, '0')}`;
        
        const secPerKm = targetRun.distance && targetRun.duration ? (targetRun.duration / 1000) / (targetRun.distance / 100000) : 0;
        const pM = Math.floor(secPerKm / 60);
        const pS = Math.round(secPerKm % 60);
        const paceStr = `${pM}:${pS.toString().padStart(2, '0')}`;

        ctx.fillStyle = textPrimary;
        ctx.font = '700 48px Outfit, sans-serif';
        const runName = targetRun.name || (lang === 'id' ? 'Sesi Lari' : 'Run Session');
        // truncated run name if too long
        ctx.fillText(runName.length > 25 ? runName.substring(0, 25) + '...' : runName, 90, contentY + 60);

        const drawMetric = (x, y, label, val, unit) => {
          ctx.fillStyle = textSecondary;
          ctx.font = '600 20px Inter, sans-serif';
          ctx.fillText(label.toUpperCase(), x, y);
          ctx.fillStyle = textPrimary;
          ctx.font = '800 64px Outfit, sans-serif';
          ctx.fillText(val, x, y + 70);
          ctx.fillStyle = accentPrimary;
          ctx.font = '700 24px Inter, sans-serif';
          ctx.fillText(unit, x, y + 106);
        };

        drawMetric(90, contentY + 120, lang === 'id' ? 'Jarak' : 'Distance', distKm, 'KM');
        drawMetric(400, contentY + 120, lang === 'id' ? 'Durasi' : 'Duration', durStr, 'TIME');
        drawMetric(710, contentY + 120, 'Pace', paceStr, '/KM');

        // Draw Map Route if available
        if (targetRun.route && targetRun.route.length > 0) {
          const mapY = contentY + 260;
          const mapW = 900;
          const mapH = 440;
          
          fillRoundedRect(ctx, 90, mapY, mapW, mapH, 24, shareTheme === 'sunrise' ? 'rgba(0,0,0,0.03)' : 'rgba(255,255,255,0.03)');
          
          const lats = targetRun.route.map(p => p.lat !== undefined ? p.lat : p[0]);
          const lons = targetRun.route.map(p => p.lon !== undefined ? p.lon : p[1]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          
          const latRange = (maxLat - minLat) || 0.0001;
          const lonRange = (maxLon - minLon) || 0.0001;
          
          const avgLat = (minLat + maxLat) / 2;
          const lonScale = Math.cos(avgLat * Math.PI / 180);
          
          const widthRatio = (lonRange * lonScale) / latRange;
          
          let drawW = mapW - 80;
          let drawH = mapH - 80;
          let offsetX = 40;
          let offsetY = 40;
          
          if (widthRatio > (mapW - 80) / (mapH - 80)) {
            drawH = (mapW - 80) / widthRatio;
            offsetY = 40 + ((mapH - 80) - drawH) / 2;
          } else {
            drawW = (mapH - 80) * widthRatio;
            offsetX = 40 + ((mapW - 80) - drawW) / 2;
          }
          
          // Draw path
          ctx.beginPath();
          targetRun.route.forEach((p, i) => {
            const px = 90 + offsetX + ((p.lon !== undefined ? p.lon : p[1]) - minLon) / lonRange * drawW;
            const py = mapY + offsetY + (1 - ((p.lat !== undefined ? p.lat : p[0]) - minLat) / latRange) * drawH; // Invert lat
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          
          ctx.shadowColor = shareTheme === 'sunrise' ? accentPrimary : accentSecondary;
          ctx.shadowBlur = 15;
          ctx.strokeStyle = shareTheme === 'sunrise' ? accentPrimary : accentSecondary;
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Draw start and end dots
          const startPt = targetRun.route[0];
          const endPt = targetRun.route[targetRun.route.length - 1];
          const startX = 90 + offsetX + ((startPt.lon !== undefined ? startPt.lon : startPt[1]) - minLon) / lonRange * drawW;
          const startY = mapY + offsetY + (1 - ((startPt.lat !== undefined ? startPt.lat : startPt[0]) - minLat) / latRange) * drawH;
          const endX = 90 + offsetX + ((endPt.lon !== undefined ? endPt.lon : endPt[1]) - minLon) / lonRange * drawW;
          const endY = mapY + offsetY + (1 - ((endPt.lat !== undefined ? endPt.lat : endPt[0]) - minLat) / latRange) * drawH;
          
          ctx.fillStyle = '#10b981'; // Green dot for start
          ctx.beginPath(); ctx.arc(startX, startY, 10, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = glassBg; ctx.stroke();
          
          ctx.fillStyle = '#ef4444'; // Red dot for end
          ctx.beginPath(); ctx.arc(endX, endY, 10, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 3; ctx.strokeStyle = glassBg; ctx.stroke();
        } else {
          ctx.fillStyle = textMuted;
          ctx.font = '600 24px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(lang === 'id' ? 'Peta rute tidak tersedia.' : 'Route map not available.', W/2, contentY + 300);
          ctx.textAlign = 'left';
        }
      }
    } else if (shareTemplate === 'race') { // Race Prediction
      ctx.fillStyle = textMuted;
      ctx.font = '800 24px Inter, sans-serif';
      ctx.letterSpacing = '2px';
      ctx.fillText((lang === 'id' ? 'RACE PREDICTION' : 'RACE PREDICTION').toUpperCase(), 90, contentY);
      ctx.letterSpacing = '0px';

      const RIEGEL = 1.06;
      const RACES = [
        { label: '5K', dist: 5000, color: accentPrimary, pct: 0.4 },
        { label: '10K', dist: 10000, color: accentSecondary, pct: 0.6 },
        { label: 'HALF MARATHON', dist: 21097, color: '#10b981', pct: 0.8 },
        { label: 'MARATHON', dist: 42195, color: '#f43f5e', pct: 1.0 }
      ];
      
      const bestRuns = runActs
        .filter(a => a.distance >= 300000 && a.duration > 0)
        .map(a => ({ distM: a.distance / 100, durationSec: a.duration / 1000, paceMinKm: (a.duration / 60000) / (a.distance / 100000) }))
        .filter(a => a.paceMinKm >= 3 && a.paceMinKm <= 20)
        .sort((a, b) => a.paceMinKm - b.paceMinKm);
      const ref = bestRuns[0] || (targetPace ? { distM: 5000, durationSec: targetPace * 60 * 5, paceMinKm: targetPace } : null);
      
      if (ref) {
        RACES.forEach((r, idx) => {
          const predSec = ref.durationSec * Math.pow(r.dist / ref.distM, RIEGEL);
          const h = Math.floor(predSec / 3600);
          const m = Math.floor((predSec % 3600) / 60);
          const sec = Math.round(predSec % 60);
          const timeStr = h > 0 ? `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}` : `${m}:${String(sec).padStart(2,'0')}`;
          
          const rowY = 280 + idx * 160;
          
          // Track
          fillRoundedRect(ctx, 90, rowY + 50, 900, 24, 12, shareTheme === 'sunrise' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)');
          
          // Progress Fill
          ctx.shadowColor = r.color;
          ctx.shadowBlur = 15;
          fillRoundedRect(ctx, 90, rowY + 50, 900 * r.pct, 24, 12, r.color);
          ctx.shadowBlur = 0;

          // Label
          ctx.fillStyle = textPrimary;
          ctx.font = '800 36px Outfit, sans-serif';
          ctx.fillText(r.label, 90, rowY + 30);

          // Time Value
          ctx.textAlign = 'right';
          ctx.fillStyle = textPrimary;
          ctx.font = '700 48px Outfit, sans-serif';
          ctx.fillText(timeStr, 990, rowY + 30);
          ctx.textAlign = 'left';
        });
      }
    } else if (shareTemplate === 'sticker') {
      const targetRun = selectedRunForDetails || runActs.find(a => a.route && a.route.length > 0) || runActs[0];
      if (targetRun) {
        const distKm = ((targetRun.distance ?? 0) / 100000).toFixed(2);
        const totalSecs = Math.round((targetRun.duration ?? 0) / 1000);
        const h = Math.floor(totalSecs / 3600);
        const mDur = Math.floor((totalSecs % 3600) / 60);
        const sDur = totalSecs % 60;
        const durStr = h > 0 
          ? `${h}:${mDur.toString().padStart(2, '0')}:${sDur.toString().padStart(2, '0')}`
          : `${mDur}:${sDur.toString().padStart(2, '0')}`;
        
        const secPerKm = targetRun.distance && targetRun.duration ? (targetRun.duration / 1000) / (targetRun.distance / 100000) : 0;
        const pM = Math.floor(secPerKm / 60);
        const pS = Math.round(secPerKm % 60);
        const paceVal = `${pM}:${pS.toString().padStart(2, '0')}`;
        const paceUnit = " /km";

        ctx.textAlign = 'center';

        // Draw Map Route if available
        if (targetRun.route && targetRun.route.length > 0) {
          const mapY = 80;
          const mapW = 600;
          const mapH = 280;
          const mapX = (W - mapW) / 2;
          
          const lats = targetRun.route.map(p => p.lat !== undefined ? p.lat : p[0]);
          const lons = targetRun.route.map(p => p.lon !== undefined ? p.lon : p[1]);
          const minLat = Math.min(...lats);
          const maxLat = Math.max(...lats);
          const minLon = Math.min(...lons);
          const maxLon = Math.max(...lons);
          
          const latRange = (maxLat - minLat) || 0.0001;
          const lonRange = (maxLon - minLon) || 0.0001;
          
          const avgLat = (minLat + maxLat) / 2;
          const lonScale = Math.cos(avgLat * Math.PI / 180);
          
          const widthRatio = (lonRange * lonScale) / latRange;
          
          let drawW = mapW;
          let drawH = mapH;
          let offsetX = 0;
          let offsetY = 0;
          
          if (widthRatio > mapW / mapH) {
            drawH = mapW / widthRatio;
            offsetY = (mapH - drawH) / 2;
          } else {
            drawW = mapH * widthRatio;
            offsetX = (mapW - drawW) / 2;
          }
          
          ctx.beginPath();
          targetRun.route.forEach((p, i) => {
            const px = mapX + offsetX + ((p.lon !== undefined ? p.lon : p[1]) - minLon) / lonRange * drawW;
            const py = mapY + offsetY + (1 - ((p.lat !== undefined ? p.lat : p[0]) - minLat) / latRange) * drawH; // Invert lat
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          });
          
          // Use bright accent color for sticker route
          const routeColor = shareTheme === 'transparent' ? '#a78bfa' : accentPrimary;
          ctx.shadowColor = routeColor;
          ctx.shadowBlur = 12;
          ctx.strokeStyle = routeColor;
          ctx.lineWidth = 8;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.stroke();
          ctx.shadowBlur = 0;
          
          // Draw start and end dots
          const startPt = targetRun.route[0];
          const endPt = targetRun.route[targetRun.route.length - 1];
          const startX = mapX + offsetX + ((startPt.lon !== undefined ? startPt.lon : startPt[1]) - minLon) / lonRange * drawW;
          const startY = mapY + offsetY + (1 - ((startPt.lat !== undefined ? startPt.lat : startPt[0]) - minLat) / latRange) * drawH;
          const endX = mapX + offsetX + ((endPt.lon !== undefined ? endPt.lon : endPt[1]) - minLon) / lonRange * drawW;
          const endY = mapY + offsetY + (1 - ((endPt.lat !== undefined ? endPt.lat : endPt[0]) - minLat) / latRange) * drawH;
          
          ctx.fillStyle = '#10b981'; // Green dot for start
          ctx.beginPath(); ctx.arc(startX, startY, 12, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
          
          ctx.fillStyle = '#ef4444'; // Red dot for end
          ctx.beginPath(); ctx.arc(endX, endY, 12, 0, Math.PI * 2); ctx.fill();
          ctx.lineWidth = 4; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        } else {
          ctx.fillStyle = textMuted || 'rgba(255,255,255,0.4)';
          ctx.font = '600 24px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(lang === 'id' ? 'Peta rute tidak tersedia (Tidak ada data GPS)' : 'Route map not available (No GPS data)', W/2, 220);
          ctx.textAlign = 'left';
        }
        
        ctx.textAlign = 'center';
        
        // Title
        const runName = targetRun.name || (lang === 'id' ? 'Sesi Lari' : 'Run Session');
        ctx.fillStyle = textPrimary;
        ctx.font = '600 80px Outfit, sans-serif';
        // Add a slight drop shadow for text legibility if placed on bright backgrounds
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        ctx.fillText(runName, W/2, 460);

        ctx.textAlign = 'left';

        // Column 1 (Distance)
        ctx.fillStyle = textSecondary;
        ctx.font = '600 32px Inter, sans-serif';
        ctx.fillText('DISTANCE:', 120, 580);
        
        ctx.fillStyle = textPrimary;
        ctx.font = '700 80px Outfit, sans-serif';
        const distVal = `${distKm}`;
        const distW = ctx.measureText(distVal).width;
        ctx.fillText(distVal, 120, 670);
        
        ctx.font = '500 40px Outfit, sans-serif';
        ctx.fillText(' km', 120 + distW, 670);

        // Column 2 (Time)
        ctx.textAlign = 'center';
        ctx.fillStyle = textSecondary;
        ctx.font = '600 32px Inter, sans-serif';
        ctx.fillText('TIME:', W/2, 580);
        
        ctx.fillStyle = textPrimary;
        ctx.font = '700 80px Outfit, sans-serif';
        ctx.fillText(durStr, W/2, 670);

        // Column 3 (Pace)
        ctx.textAlign = 'left';
        ctx.font = '700 80px Outfit, sans-serif';
        const paceValW = ctx.measureText(paceVal).width;
        ctx.font = '500 40px Outfit, sans-serif';
        const paceUnitW = ctx.measureText(paceUnit).width;
        const totalPaceW = paceValW + paceUnitW;
        const paceStartX = W - 120 - totalPaceW;

        ctx.fillStyle = textSecondary;
        ctx.font = '600 32px Inter, sans-serif';
        ctx.fillText('PACE:', paceStartX, 580);
        
        ctx.fillStyle = textPrimary;
        ctx.font = '700 80px Outfit, sans-serif';
        ctx.fillText(paceVal, paceStartX, 670);
        ctx.font = '500 40px Outfit, sans-serif';
        ctx.fillText(paceUnit, paceStartX + paceValW, 670);
        
        ctx.shadowColor = 'transparent'; // Reset shadow
        ctx.textAlign = 'left';
      }
    } else if (shareTemplate === 'polaroid') {
      const targetRun = selectedRunForDetails || runActs.find(a => a.route && a.route.length > 0) || runActs[0];
      if (targetRun) {
        const distKm = ((targetRun.distance ?? 0) / 100000).toFixed(2);
        const totalSecs = Math.round((targetRun.duration ?? 0) / 1000);
        const m = Math.floor(totalSecs / 60);
        const s = totalSecs % 60;
        const durStr = `${m}m ${s}s`;
        
        const secPerKm = targetRun.distance && targetRun.duration ? (targetRun.duration / 1000) / (targetRun.distance / 100000) : 0;
        const pM = Math.floor(secPerKm / 60);
        const pS = Math.round(secPerKm % 60);
        const paceVal = `${pM}:${pS.toString().padStart(2, '0')}`;
        
        const hrVal = targetRun.avgHR ? Math.round(targetRun.avgHR) : '--';

        const cardMargin = 80;
        const cardX = cardMargin;
        const cardY = cardMargin;
        const cardW = W - cardMargin * 2;
        const cardH = H - cardMargin * 2;

        // Draw White Card Background with Drop Shadow
        ctx.save();
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 60;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 20;
        fillRoundedRect(ctx, cardX, cardY, cardW, cardH, 32, '#ffffff');
        ctx.restore();

        // Punch the transparent hole for the photo
        const holeMarginX = 40;
        const holeMarginTop = 150;
        const holeMarginBot = 230;
        
        const holeX = cardX + holeMarginX;
        const holeY = cardY + holeMarginTop;
        const holeW = cardW - holeMarginX * 2;
        const holeH = cardH - holeMarginTop - holeMarginBot;

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(holeX, holeY, holeW, holeH);
        ctx.globalCompositeOperation = 'source-over';

        // Avatar
        const avatarX = cardX + 90;
        const avatarY = cardY + 75;
        if (avatarImgObj) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, 40, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(avatarImgObj, avatarX - 40, avatarY - 40, 80, 80);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(avatarX, avatarY, 40, 0, Math.PI * 2);
          ctx.fillStyle = '#f3f4f6';
          ctx.fill();
        }

        ctx.fillStyle = '#111827';
        ctx.font = '800 32px Outfit, sans-serif';
        const athleteName = displayName || (currentUser ? currentUser.split('@')[0] : 'Pelari');
        ctx.fillText(`@${athleteName}`, cardX + 150, cardY + 65);
        
        ctx.fillStyle = '#6b7280';
        ctx.font = '600 20px Inter, sans-serif';
        ctx.fillText('Endura UP', cardX + 150, cardY + 100);

        ctx.textAlign = 'right';
        ctx.fillStyle = '#9ca3af';
        ctx.font = '500 24px Inter, sans-serif';
        ctx.fillText('Just Now', cardX + cardW - 40, cardY + 85);
        ctx.textAlign = 'left';

        // Bottom Bar Content (Stats)
        const botY = cardY + cardH - holeMarginBot;
        
        // Column 1 (Distance)
        ctx.fillStyle = '#6b7280';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText('DISTANCE', cardX + 60, botY + 70);
        
        ctx.fillStyle = '#111827';
        ctx.font = '800 70px Outfit, sans-serif';
        const distW = ctx.measureText(distKm).width;
        ctx.fillText(distKm, cardX + 60, botY + 150);
        ctx.font = '600 32px Outfit, sans-serif';
        ctx.fillText(' KM', cardX + 60 + distW, botY + 150);

        // Column 2 (Pace)
        ctx.textAlign = 'center';
        ctx.fillStyle = '#6b7280';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText('PACE', cardX + cardW/2, botY + 70);
        
        ctx.fillStyle = '#111827';
        ctx.font = '800 70px Outfit, sans-serif';
        const pW = ctx.measureText(paceVal).width;
        ctx.fillText(paceVal, cardX + cardW/2 - 20, botY + 150); 
        ctx.textAlign = 'left';
        ctx.font = '600 32px Outfit, sans-serif';
        ctx.fillText(' /km', cardX + cardW/2 - 20 + pW/2, botY + 150);

        // Column 3 (HR or Time)
        ctx.textAlign = 'right';
        ctx.fillStyle = '#6b7280';
        ctx.font = '600 24px Inter, sans-serif';
        ctx.fillText(targetRun.avgHR ? 'HR' : 'TIME', cardX + cardW - 60, botY + 70);
        
        ctx.fillStyle = '#111827';
        ctx.font = '800 70px Outfit, sans-serif';
        const val3 = targetRun.avgHR ? hrVal.toString() : durStr.split(' ')[0]; // use only min if time
        const unit3 = targetRun.avgHR ? ' bpm' : '';
        ctx.textAlign = 'left';
        const val3W = ctx.measureText(val3).width;
        const u3W = ctx.measureText(unit3).width;
        const startX3 = cardX + cardW - 60 - (val3W + u3W);
        ctx.fillText(val3, startX3, botY + 150);
        ctx.font = '600 32px Outfit, sans-serif';
        ctx.fillText(unit3, startX3 + val3W, botY + 150);
        ctx.textAlign = 'left';
      }
    }

    // ── Footer ──
    if (shareTemplate !== 'sticker' && shareTemplate !== 'polaroid') {
      ctx.strokeStyle = borderStroke;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(90, 960); ctx.lineTo(W - 90, 960); ctx.stroke();

      ctx.fillStyle = textPrimary;
      ctx.font = '700 26px Outfit, sans-serif';
      ctx.fillText('www.enduraup.space', 90, 1010);
      
      ctx.fillStyle = textMuted;
      ctx.font = '500 20px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(lang === 'id' ? 'Generated by AI Engine' : 'Generated by AI Engine', W - 90, 1010);
      ctx.textAlign = 'left';
    }

    ctx.restore(); // Restore from clipping
  }, [showShareModal, shareTemplate, shareStatsPeriod, shareTheme, shareShape, runActs, totalDist, totalSessions, avgHR, actualMaxHR, vo2max, targetPace, displayName, currentUser, avatarImgObj, retroImageLoaded, lang, customColor1, customColor2, selectedRunForDetails]);


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
    navigator.clipboard.writeText('https://www.enduraup.space').then(() => {
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
    const text = encodeURIComponent('Lihat hasil analisis latihan lari dan performa VO2Max saya di EnduraUP! Cek di: https://www.enduraup.space');
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent('Lihat hasil analisis lari & performa VO2Max saya di EnduraUP! 🏃‍♂️🔥');
    const url = encodeURIComponent('https://www.enduraup.space');
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
  const syncStravaData = async () => {
    if (!data.profile?.stravaRefreshToken) {
      addToast(lang === 'id' ? 'Token Strava tidak ditemukan. Silakan hubungkan ulang.' : 'Strava token missing. Please reconnect.', 'error');
      return;
    }

    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
    const clientSecret = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      addToast(lang === 'id' ? 'Strava API Keys belum lengkap di .env!' : 'Strava API keys missing in .env!', 'error');
      return;
    }

    setIsUploading(true);
    addToast(lang === 'id' ? 'Menarik data dari Strava...' : 'Fetching data from Strava...', 'info');

    let accessToken = data.profile.stravaAccessToken;
    let newTokens = {};

    try {
      if (Date.now() > (data.profile.stravaTokenExpiresAt || 0)) {
        const refreshRes = await fetch('https://www.strava.com/oauth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
            refresh_token: data.profile.stravaRefreshToken
          })
        });
        const refreshData = await refreshRes.json();
        if (!refreshData.access_token) throw new Error('Failed to refresh token');
        
        accessToken = refreshData.access_token;
        newTokens = {
          stravaAccessToken: refreshData.access_token,
          stravaRefreshToken: refreshData.refresh_token,
          stravaTokenExpiresAt: refreshData.expires_at * 1000
        };
      }

      const isPremiumUser = data.profile?.isPremium;
      const userSyncMode = data.profile?.stravaSyncMode || 'fast';
      const effectiveSyncMode = isPremiumUser ? userSyncMode : (globalSettings?.stravaSyncMode || 'fast');
      const perPage = effectiveSyncMode === 'full' ? 200 : 5;
      
      const actsRes = await fetch(`https://www.strava.com/api/v3/athlete/activities?per_page=${perPage}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const activities = await actsRes.json();

      if (!Array.isArray(activities)) throw new Error('Invalid Strava Data');

      let newRuns = [];
      activities.forEach(act => {
        if (act.type === 'Run') {
          const startDateLocal = new Date(act.start_date).getTime();
          newRuns.push({
            stravaId: act.id,
            name: act.name || null,
            startTimeLocal: startDateLocal,
            distance: act.distance * 100,
            duration: act.moving_time * 1000,
            avgHr: act.average_heartrate ? Math.round(act.average_heartrate) : null,
            maxHr: act.max_heartrate ? Math.round(act.max_heartrate) : null,
            route: act.map && act.map.summary_polyline ? decodePolyline(act.map.summary_polyline) : null
          });
        }
      });

      if (newRuns.length === 0) {
        addToast(lang === 'id' ? 'Tidak ada lari baru di Strava' : 'No new runs found in Strava', 'info');
        if (Object.keys(newTokens).length > 0) {
          setData(prev => {
            const updated = { ...prev, profile: { ...(prev.profile || {}), ...newTokens } };
            saveAndSyncData(updated);
            return updated;
          });
        }
        setIsUploading(false);
        return;
      }

      setData(prev => {
        let recentlyAdded = [];
        newRuns.forEach(nr => {
          const exists = (prev.running_activities || []).find(er => Math.abs(er.startTimeLocal - nr.startTimeLocal) < 60000);
          if (!exists) recentlyAdded.push(nr);
        });
        
        const mergedData = mergeData(prev, { running_activities: newRuns, sleep_records: {}, max_hr: 0 });
        mergedData.running_activities.sort((a,b) => b.startTimeLocal - a.startTimeLocal); // Sort newest first
        
        let addedCount = recentlyAdded.length;
        
        if (addedCount > 0) {
          setSyncedRuns(recentlyAdded);
          setShowSyncModal(true);
          
          const userMaxHr = actualMaxHR || (220 - (age || 30));
          let totalAddedHours = 0;
          recentlyAdded.forEach(r => {
            const durationHours = (r.duration || 0) / 3600000;
            let added = durationHours * 24;
            if (r.avgHr) {
              const intensity = r.avgHr / userMaxHr;
              if (intensity < 0.60) added = durationHours * 4;
              else if (intensity < 0.70) added = durationHours * 10;
              else if (intensity < 0.80) added = durationHours * 16;
              else if (intensity < 0.90) added = durationHours * 24;
              else added = durationHours * 36;
            }
            totalAddedHours += added;
          });
          
          setNotifications(prevNotifs => [
            {
              id: Date.now(),
              title: lang === 'id' ? 'Sinkronisasi Selesai' : 'Sync Complete',
              message: lang === 'id' 
                ? `Data lari baru berhasil di-sync. Beban latihan kamu bertambah sekitar ${Math.round(totalAddedHours)} jam waktu pemulihan.`
                : `New runs synced. Your training load increased by roughly ${Math.round(totalAddedHours)} hours of recovery time.`,
              time: Date.now(),
              read: false
            },
            ...prevNotifs
          ]);
        }

        const updated = { 
          ...prev, 
          running_activities: mergedData.running_activities, 
          max_hr: mergedData.max_hr,
          profile: { 
            ...(prev.profile || {}), 
            ...newTokens 
          }
        };
        saveAndSyncData(updated);
        
        addToast(lang === 'id' ? `Berhasil sync ${addedCount} lari baru dari Strava!` : `Successfully synced ${addedCount} new runs from Strava!`, 'success');
        return updated;
      });

    } catch (err) {
      console.error('Strava Sync Error:', err);
      addToast(lang === 'id' ? 'Gagal narik data Strava!' : 'Failed to fetch Strava data!', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Auto-sync Strava on load to automatically fix any timezone issues without user interaction
  useEffect(() => {
    if (isFirebaseConfigured && data.profile?.stravaConnected && data.profile?.stravaAccessToken) {
      if (!window.__hasAutoSyncedStrava) {
        window.__hasAutoSyncedStrava = true;
        syncStravaData();
      }
    }
  }, [isFirebaseConfigured, data.profile?.stravaConnected]);

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

  const downloadExcelTemplate = async () => {
    try {
      const XLSX = await import('xlsx');
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
          const XLSX = await import('xlsx');
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
                  const dateStr = getLocalDateStr(parsedDate);
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
            profile: { ...(data.profile || {}), age, goal, programStyle, targetPace, selectedDays }
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
    const epochMs = new Date(`${manualRun.date}T${manualRun.time || '06:00'}:00`).getTime();
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
      profile: { ...(data.profile || {}), age, goal, programStyle, targetPace, selectedDays }
    };
    saveAndSyncData(updated);
    addToast('Sesi lari berhasil disimpan.');
    setSidebarOpen(false);
  };

  const saveManualSleep = () => {
    let score;
    if (manualSleep.inputType === 'score') {
      score = parseInt(manualSleep.score) || 75;
      if (score > 100) score = 100;
      if (score < 10) score = 10;
    } else {
      const scoreMap = { pulas: 90, cukup: 75, kurang: 55, begadang: 30 };
      const baseScore = scoreMap[manualSleep.quality] ?? 75;
      
      // Add random variance (-4 to +4) to make scores look organic and varied
      const variance = Math.floor(Math.random() * 9) - 4;
      score = baseScore + variance;
      if (score > 100) score = 100;
      if (score < 10) score = 10;
    }
    
    const duration = (manualSleep.sleepHours || 0) + ((manualSleep.sleepMinutes || 0) / 60);
    const key = `${manualSleep.date}_${Date.now()}`;

    const updated = {
      ...data,
      sleep_records: {
        ...data.sleep_records,
        [key]: { score, duration, type: manualSleep.sleepType, dateStr: manualSleep.date },
      },
      profile: { ...(data.profile || {}), age, goal, programStyle, targetPace, selectedDays }
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
        <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>}>
          <AdminDashboard onBack={() => { setShowAdmin(false); window.location.hash = ''; }} />
        </Suspense>
      </ErrorBoundary>
    );
  }

  // ─────────────────── STANDALONE BLOG PAGE ───────────────────
  if (tab === 'blog') {
    return (
      <div className="landing-container" style={{ minHeight: '100vh', paddingTop: 56, overflowY: 'auto', background: 'var(--bg-base)' }}>
        <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', maxWidth: '100%', padding: '16px 5%', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', zIndex: 100, borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="nav-logo" onClick={() => window.location.href = '/blog'} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Logo size={24} />
              <span className="logo-text" style={{ fontSize: 20, letterSpacing: '-0.5px' }}>EnduraUP</span>
            </div>
            <div style={{ flex: 1, maxWidth: 340, margin: '0 24px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  placeholder="Cari topik..."
                  value={blogSearch}
                  onChange={e => setBlogSearch(e.target.value)}
                  style={{ width: '100%', padding: '8px 16px 8px 36px', borderRadius: 20, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
                />
                <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
            </div>
            <button className="nav-btn-primary" onClick={() => {
              if (!sessionUser || sessionUser.startsWith('Anonim-')) {
                setShowLoginModal(true);
              } else {
                setTab('dashboard');
              }
            }} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, background: (!sessionUser || sessionUser.startsWith('Anonim-')) ? 'var(--accent-purple)' : 'transparent', border: (!sessionUser || sessionUser.startsWith('Anonim-')) ? 'none' : '1px solid var(--border)', color: (!sessionUser || sessionUser.startsWith('Anonim-')) ? '#fff' : 'var(--text-primary)', fontWeight: 600 }}>
              {(!sessionUser || sessionUser.startsWith('Anonim-')) ? (lang === 'id' ? 'Login / Daftar' : 'Login / Register') : (lang === 'id' ? 'Kembali ke Dasbor' : 'Back to Dashboard')}
            </button>
          </div>
        </nav>
        <div style={{ padding: '16px 20px', maxWidth: 1000, margin: '0 auto' }}>
          <ErrorBoundary>
            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>}>
              <BlogModule isAdmin={showAdmin} lang={lang} onViewChange={setBlogView} currentUser={currentUser} searchQuery={blogSearch} />
            </Suspense>
          </ErrorBoundary>
        </div>
        
        {(!sessionUser || sessionUser.startsWith('Anonim-')) && (
          <CustomOneTap onSignIn={handleOneTapSignIn} lang={lang} />
        )}

        {(!sessionUser || sessionUser.startsWith('Anonim-')) && showLoginModal && (
          <LoginScreen
            isModal={true}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(user) => {
              setSessionUser(user);
              sessionStorage.setItem('smartcoach_session', user);
              if (!usersList.includes(user)) {
                const updatedList = [...usersList, user];
                setUsersList(updatedList);
                saveUsersList(updatedList);
              }
              setShowLoginModal(false);
              switchUser(user);
            }}
            usersList={usersList}
            addToast={addToast}
            lang={lang}
          />
        )}
      </div>
    );
  }

  // ─────────────────── STATIC PAGES ───────────────────
  if (['about', 'privacy', 'contact'].includes(tab)) {
    return (
      <div className="landing-container" style={{ minHeight: '100vh', paddingTop: 56, overflowY: 'auto', background: 'var(--bg-base)' }}>
        <nav className="landing-nav" style={{ position: 'fixed', top: 0, left: 0, right: 0, width: '100%', maxWidth: '100%', padding: '16px 5%', background: 'var(--glass-bg)', backdropFilter: 'blur(12px)', zIndex: 100, borderBottom: '1px solid var(--border)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div className="nav-logo" onClick={() => { setTab('dashboard'); window.history.pushState(null, '', '/'); window.dispatchEvent(new Event('popstate')); }} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Logo size={24} />
              <span className="logo-text" style={{ fontSize: 20, letterSpacing: '-0.5px' }}>EnduraUP</span>
            </div>
            <button className="nav-btn-primary" onClick={() => { setTab('dashboard'); window.history.pushState(null, '', '/'); window.dispatchEvent(new Event('popstate')); }} style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', fontWeight: 600 }}>
              Kembali ke Dasbor
            </button>
          </div>
        </nav>
        <div style={{ padding: '16px 20px', maxWidth: 1000, margin: '0 auto' }}>
          <ErrorBoundary>
            {tab === 'about' && <AboutPage lang={lang} />}
            {tab === 'privacy' && <PrivacyPage lang={lang} />}
            {tab === 'contact' && <ContactPage lang={lang} globalSettings={globalSettings} />}
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  if (!isAuthReady) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <div className="typing-dot" style={{ width: 12, height: 12, background: 'var(--accent-purple)', borderRadius: '50%', animation: 'blink 1.4s infinite both' }} />
          <div className="typing-dot" style={{ width: 12, height: 12, background: 'var(--accent-purple)', borderRadius: '50%', animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }} />
          <div className="typing-dot" style={{ width: 12, height: 12, background: 'var(--accent-purple)', borderRadius: '50%', animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }} />
        </div>
        <style dangerouslySetInnerHTML={{__html:`@keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }`}} />
      </div>
    );
  }

  if (!sessionUser) {
    return (
      <>
        <Toast toasts={toasts} />
        <LandingPage 
          onGetStarted={() => setShowLoginModal(true)} 
          onViewBlog={() => setTab('blog')}
          lang={lang} 
          setLang={setLang} 
          visitorCount={visitorCount} 
        />
        {(!sessionUser || sessionUser.startsWith('Anonim-')) && (
          <CustomOneTap onSignIn={handleOneTapSignIn} lang={lang} />
        )}
        {showLoginModal && (
          <LoginScreen
            isModal={true}
            onClose={() => setShowLoginModal(false)}
            onLoginSuccess={(user) => {
              setSessionUser(user);
              sessionStorage.setItem('smartcoach_session', user);
              if (!usersList.includes(user)) {
                const updatedList = [...usersList, user];
                setUsersList(updatedList);
                saveUsersList(updatedList);
              }
              setShowLoginModal(false);
              switchUser(user);
            }}
            usersList={usersList}
            addToast={addToast}
            lang={lang}
          />
        )}
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
    
    let sleepPart = '';
    if (latestSleepDate) {
      sleepPart = isId 
        ? `Tidur: ${latestSleepScore}% (Berdasarkan data terakhir). `
        : `Sleep: ${latestSleepScore}% (Based on latest record). `;
    }

    let restPart;
    if (!recoveryEndTimestamp) {
      restPart = isId
        ? `Otot pulih 100%. Recovery time: 0 jam. `
        : `Muscle recovery: 100%. Recovery time: 0 hrs. `;
    } else {
      restPart = (
        <span>
          {isId ? 'Recovery time: ' : 'Recovery time: '}
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}><LiveCountdown endTimestamp={recoveryEndTimestamp} lang={lang} /></span>
          {isId ? '. ' : '. '}
        </span>
      );
    }

    let actionPart = '';
    if (trainingReadinessScore >= 80) {
      actionPart = isId
        ? 'Kesiapan fisik maksimal untuk sesi intensitas tinggi.'
        : 'Maximum physical readiness for high-intensity sessions.';
    } else if (trainingReadinessScore >= 60) {
      actionPart = isId
        ? 'Kesiapan moderat. Direkomendasikan untuk sesi intensitas rendah (Easy/Base run).'
        : 'Moderate readiness. Recommended for low-intensity sessions (Easy/Base run).';
    } else {
      actionPart = isId
        ? 'Kesiapan rendah. Prioritaskan rest day atau pemulihan aktif.'
        : 'Low readiness. Prioritize rest day or active recovery.';
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
                {!profileEditMode && (
                  <button 
                    onClick={() => { setEditDraft({ displayName: curName, age: curAge, gender: curGender, weight: curWeight, height: curHeight, avatar: avatar, goal: goal, programStyle: programStyle, targetPace: targetPace, selectedDays: selectedDays, stravaSyncMode: data.profile?.stravaSyncMode || 'fast' }); setProfileEditMode(true); }}
                    style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                    Edit
                  </button>
                )}
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
                      goal === '5k' ? '5K' :
                      goal === '10k' ? '10K' :
                      goal === 'marathon' ? 'Marathon' :
                      goal === 'turun-hr' ? 'Turun HR' :
                      goal === 'health' ? 'Kesehatan' : goal
                    } unit="" color="#ef4444" icon={<svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>} />
                    <Stat label="Style" value={programStyle === 'ngepush' ? 'Ngepush' : programStyle === 'sedang' ? 'Sedang' : programStyle === 'santai' ? 'Santai' : programStyle} unit="" color="#f97316" icon={<svg {...iconProps}><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>} />
                    <Stat label="Pace" value={targetPace ? formatPace(targetPace) : null} unit="/km" color="#0ea5e9" icon={<svg {...iconProps}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>} />
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
                  
                  {/* Danger Zone (Reset/Delete) */}
                  <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                    {!confirmReset ? (
                      <div style={{ display: 'flex', justifyContent: 'center', gap: 24 }}>
                        <button
                          onClick={() => setConfirmReset(true)}
                          style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}
                        >
                          {lang === 'id' ? 'Reset Semua Data' : 'Reset All Data'}
                        </button>
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
                            style={{ background: 'none', border: 'none', color: '#ef4444', textDecoration: 'underline', cursor: 'pointer', fontSize: 11, fontWeight: 600, padding: 0 }}
                          >Hapus Akun</button>
                        )}
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, background: 'rgba(239, 68, 68, 0.05)', padding: 16, borderRadius: 8, border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ fontSize: 13, color: '#ef4444', fontWeight: 700, textAlign: 'center' }}>
                          {lang === 'id' ? 'PERINGATAN: Aksi ini tidak bisa dibatalkan.' : 'WARNING: This action cannot be undone.'}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.5 }}>
                          {lang === 'id' 
                            ? <>Ketik <b>delete my data</b> di bawah untuk melanjutkan.</>
                            : <>Type <b>delete my data</b> below to confirm.</>}
                        </div>
                        <input 
                          type="text" 
                          id="reset-confirm-input"
                          placeholder="delete my data"
                          style={{ background: 'var(--bg-base)', border: '1px solid #ef4444', borderRadius: 6, color: 'var(--text-primary)', padding: '10px', fontSize: 13, outline: 'none', textAlign: 'center' }}
                        />
                        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                          <button
                            className="btn btn-danger"
                            style={{ flex: 1, padding: '10px', fontSize: 13, fontWeight: 700 }}
                            onClick={() => { 
                              const val = document.getElementById('reset-confirm-input')?.value;
                              if (val === 'delete my data') {
                                handleReset(); 
                                setShowProfileModal(false); 
                              } else {
                                alert(lang === 'id' ? 'Teks konfirmasi salah.' : 'Incorrect confirmation text.');
                              }
                            }}
                          >
                            {lang === 'id' ? 'Hapus Permanen' : 'Delete Permanently'}
                          </button>
                          <button
                            className="btn btn-secondary"
                            style={{ flex: 1, padding: '10px', fontSize: 13 }}
                            onClick={() => setConfirmReset(false)}
                          >
                            Batal
                          </button>
                        </div>
                      </div>
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
                          if (file.size > 5 * 1024 * 1024) {
                            addToast(lang === 'id' ? 'Ukuran foto terlalu besar. Maksimal 5 MB.' : 'Image too large. Max 5 MB.', 'error');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setCroppingImageSrc(reader.result);
                          };
                          reader.readAsDataURL(file);
                          e.target.value = null;
                        }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)' }}>Foto Profil</div>
                        <div style={{ fontSize: 9, color: 'var(--text-muted)' }}>Maksimal 5 MB (JPEG/PNG)</div>
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
                            value={d.age ?? ''} onChange={e => { let v = e.target.value; if (/^0+(?=\d)/.test(v)) { v = v.replace(/^0+(?=\d)/, ''); e.target.value = v; } setEditDraft(p => ({ ...p, age: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
                        </div>
                        <div>
                          <label style={lbl}>Berat (kg)</label>
                          <input type="number" min={30} max={200} step={0.5} placeholder="—" style={inp}
                            value={d.weight ?? ''} onChange={e => { let v = e.target.value; if (/^0+(?=\d)/.test(v)) { v = v.replace(/^0+(?=\d)/, ''); e.target.value = v; } setEditDraft(p => ({ ...p, weight: v === '' ? null : parseFloat(v) || null })); }} onFocus={onF} onBlur={onB} />
                        </div>
                        <div>
                          <label style={lbl}>Tinggi (cm)</label>
                          <input type="number" min={100} max={250} placeholder="—" style={inp}
                            value={d.height ?? ''} onChange={e => { let v = e.target.value; if (/^0+(?=\d)/.test(v)) { v = v.replace(/^0+(?=\d)/, ''); e.target.value = v; } setEditDraft(p => ({ ...p, height: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
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
                          { val: '5k', label: '5K' },
                          { val: '10k', label: '10K' },
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
                          {d.targetPace !== null ? formatPace(d.targetPace || 5.5) + ' /km' : '5:30 /km'}
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
                    
                    {data.profile?.isPremium && (
                      <div style={{ marginTop: 14 }}>
                        <label style={{ ...lbl, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                          Mode Sinkronisasi Strava (PRO)
                        </label>
                        <select 
                          style={inp} 
                          value={d.stravaSyncMode || 'fast'}
                          onChange={e => setEditDraft(p => ({ ...p, stravaSyncMode: e.target.value }))}
                        >
                          <option value="fast">Fast Sync (5 Aktivitas Terbaru) - Cepat</option>
                          <option value="full">Full Sync (200 Aktivitas Terbaru) - Lambat</option>
                        </select>
                      </div>
                    )}
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
                      const finalStravaSyncMode = d.stravaSyncMode !== undefined ? d.stravaSyncMode : (data.profile?.stravaSyncMode || 'fast');

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
                          selectedDays: finalSelectedDays,
                          stravaSyncMode: finalStravaSyncMode
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
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {displayName || t.fillProfileName}
                  {isPremium && <Crown size={16} color="#fbbf24" fill="#fbbf24" style={{ marginLeft: 6, flexShrink: 0 }} />}
                </div>
              </div>
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
            <button className="btn btn-primary" onClick={() => { setShowAdmin(true); window.location.hash = '#hq-enduraup-secure'; setSidebarOpen(false); }} style={{ width: '100%', justifyContent: 'center', padding: '12px 16px', borderRadius: 10 }}>
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
            <button className="btn btn-secondary" onClick={() => {
              setManualRun(prev => ({ ...prev, date: getLocalDateStr() }));
              setShowAddRunModal(true);
            }} style={{ justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {lang === 'id' ? 'Tambah Lari Manual' : 'Add Run Session'}
            </button>
            <button className="btn btn-secondary" onClick={() => {
              const today = getLocalDateStr();
              const existing = data.sleep_records?.[today];
              setManualSleep(prev => ({
                ...prev,
                date: today,
                sleepHours: 7,
                sleepMinutes: 0,
                sleepType: 'night'
              }));
              setShowSleepModal(true);
            }} style={{ justifyContent: 'flex-start', padding: '12px 16px', background: 'var(--bg-card)', borderRadius: 10 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#38bdf8' }}><path d="M2 4v16"></path><path d="M2 8h18a2 2 0 0 1 2 2v10"></path><path d="M2 17h20"></path><path d="M6 8v9"></path></svg>
              {lang === 'id' ? 'Catat Tidur / Nap' : 'Log Sleep / Nap'}
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

          <button
            onClick={() => setShowPremiumModal(true)}
            className="btn btn-secondary"
            style={{ position: 'relative' }}
          >
            {!isPremium && <span style={{ position: 'absolute', top: -8, right: -8, background: '#f59e0b', color: '#fff', fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 10 }}>Sisa 9</span>}
            {isPremium ? 'PRO Member' : (lang === 'id' ? 'Upgrade ke PRO' : 'Upgrade to PRO')}
          </button>

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
          style={{ zIndex: 100000 }}
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
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {[
                  { key: 'vo2', label: 'Estimasi VO2Max' },
                  { key: 'stats', label: 'Ringkasan Stats' },
                  { key: 'race', label: 'Prediksi Race' },
                  { key: 'run', label: 'Route Lari' },
                  { key: 'sticker', label: 'Sticker IG' },
                  { key: 'polaroid', label: 'Frame Foto' }
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

            {/* Period Selector (Only for Stats) */}
            {shareTemplate === 'stats' && (
              <div className="animate-fade-in">
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  Pilih Rentang Waktu
                </label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[
                    { key: 'weekly', label: '7 Hari' },
                    { key: 'monthly', label: '1 Bulan' },
                    { key: '6months', label: '6 Bulan' },
                    { key: 'yearly', label: '1 Tahun' }
                  ].map(p => (
                    <button
                      key={p.key}
                      onClick={() => setShareStatsPeriod(p.key)}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid ' + (shareStatsPeriod === p.key ? 'var(--accent-purple)' : 'var(--border)'),
                        background: shareStatsPeriod === p.key ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
                        color: shareStatsPeriod === p.key ? 'var(--text-primary)' : 'var(--text-muted)',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s'
                      }}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Theme Selector - Hidden for purely transparent templates */}
            {shareTemplate !== 'sticker' && shareTemplate !== 'polaroid' && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 8 }}>
                  Pilih Tema Desain
                </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { key: 'dark', label: 'Sleek Dark', color: 'linear-gradient(135deg, #09090b, #18181b)' },
                  { key: 'sunrise', label: 'Sunrise Fun', color: 'linear-gradient(135deg, #fff1f2, #ffedd5)' },
                  { key: 'custom', label: 'Custom', color: `linear-gradient(135deg, ${customColor1}, ${customColor2})` },
                  { key: 'transparent', label: 'Sticker IG', color: 'transparent', border: '1px dashed var(--border)' }
                ].map(th => (
                  <button
                    key={th.key}
                    onClick={() => setShareTheme(th.key)}
                    style={{
                      flex: 1,
                      padding: '10px 4px',
                      borderRadius: 8,
                      border: th.border || ('1px solid ' + (shareTheme === th.key ? (th.key === 'sunrise' || th.key === 'custom' ? '#e11d48' : '#ffffff') : 'var(--border)')),
                      background: shareTheme === th.key && th.key === 'transparent' ? 'rgba(255,255,255,0.05)' : th.color,
                      color: (th.key === 'sunrise' || th.key === 'custom') ? '#be123c' : '#ffffff',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      boxShadow: shareTheme === th.key && th.key !== 'transparent' ? ((th.key === 'sunrise' || th.key === 'custom') ? '0 0 10px rgba(225, 29, 72, 0.4)' : '0 0 10px rgba(167, 139, 250, 0.4)') : 'none',
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
            )}

            {/* Live Canvas Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', alignSelf: 'flex-start' }}>
                Preview Gambar (Kotak 1:1)
              </label>
              <div style={{ 
                width: '100%', 
                aspectRatio: '1/1', 
                background: (shareTheme === 'transparent' || shareTemplate === 'sticker' || shareTemplate === 'polaroid') ? 'repeating-conic-gradient(#80808033 0% 25%, transparent 0% 50%) 50% / 20px 20px' : '#000',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <button 
                onClick={() => setTab('blog')} 
                style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseOver={e => e.target.style.color = 'var(--text-primary)'}
                onMouseOut={e => e.target.style.color = 'var(--text-secondary)'}
              >
                Blog
              </button>
              
              <div style={{ position: 'relative' }}>
                <button 
                  onClick={() => setShowNotifMenu(!showNotifMenu)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}
                  onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'}
                  onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                    <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
                  </svg>
                  {notifications.filter(n => !n.read).length > 0 && (
                    <div style={{ position: 'absolute', top: 2, right: 4, width: 8, height: 8, background: '#ef4444', borderRadius: '50%', border: '2px solid var(--bg-base)' }}></div>
                  )}
                </button>
                
                {showNotifMenu && (
                  <div className="animate-fade-in" style={{ position: 'absolute', top: '100%', right: 0, marginTop: 12, width: 320, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.4)', zIndex: 100, overflow: 'hidden' }}>
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, fontSize: 14 }}>{lang === 'id' ? 'Notifikasi' : 'Notifications'}</h4>
                      {notifications.length > 0 && (
                        <button 
                          onClick={() => setNotifications(notifications.map(n => ({...n, read: true})))}
                          style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                        >
                          {lang === 'id' ? 'Tandai Semua Dibaca' : 'Mark All Read'}
                        </button>
                      )}
                    </div>
                    <div style={{ maxHeight: 350, overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                          {lang === 'id' ? 'Belum ada notifikasi.' : 'No notifications yet.'}
                        </div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? {...n, read: true} : n))} style={{ padding: '16px', borderBottom: '1px solid var(--border)', background: notif.read ? 'transparent' : 'rgba(16, 185, 129, 0.05)', cursor: 'pointer', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: 8, borderRadius: 8, color: '#10b981' }}>
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4, color: notif.read ? 'var(--text-primary)' : '#10b981' }}>{notif.title}</div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{notif.message}</div>
                              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{new Date(notif.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {!hasData && !bypassedEmptyState ? (
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
              <div 
                className="empty-step clickable"
                style={{ border: '1px dashed #8b5cf6', background: 'rgba(139, 92, 246, 0.05)' }}
                onClick={() => { setBypassedEmptyState(true); localStorage.setItem('enduraup_bypassed_empty', 'true'); }}
              >
                <div className="empty-step-num" style={{ background: '#8b5cf6', color: '#fff' }}>4</div>
                <div><strong>Mulai dari awal tanpa data</strong>. Langsung masuk ke Dashboard, buat jadwal latihan AI, dan mulai progres dari nol.</div>
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

            <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="loading-spinner"></div></div>}>
            {/* ─────────────────── DASHBOARD ─────────────────── */}
            {tab === 'dashboard' && (
              <div className="animate-fade-in">
                
                <div className={`top-widgets-grid ${!latestSleepDate ? 'single-widget' : ''}`}>
                  <div style={{ height: '100%' }}>
                    <GoalProgressWidget 
                      data={data} 
                      goal={goal} 
                      lang={lang} 
                      onLogWeight={handleLogWeight} 
                    />
                  </div>

                  {latestSleepDate && (
                    <div className="readiness-card animate-fade-in" style={{ height: '100%', marginBottom: 0 }}>
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
                        {recoveryEndTimestamp && (
                          <div style={{ 
                            marginTop: '6px', 
                            padding: '4px 10px', 
                            background: 'rgba(245, 158, 11, 0.1)', 
                            color: '#f59e0b', 
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            borderRadius: '12px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 22h14"></path>
                              <path d="M5 2h14"></path>
                              <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                              <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                            </svg>
                            <LiveCountdown endTimestamp={recoveryEndTimestamp} lang={lang} />
                          </div>
                        )}
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
                </div>
                {/* Metrics */}
                <div className="metrics-grid">
                  {(() => {
                    const now = new Date();
                    const day = now.getDay();
                    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
                    const startOfThisWeek = new Date(now);
                    startOfThisWeek.setDate(diffToMonday);
                    startOfThisWeek.setHours(0,0,0,0);
                    
                    const startOfLastWeek = new Date(startOfThisWeek);
                    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);

                    let thisWeekDist = 0;
                    let lastWeekDist = 0;
                    for (const a of data.running_activities) {
                      if (!a.startTimeLocal) continue;
                      const d = new Date(a.startTimeLocal);
                      if (d >= startOfThisWeek) {
                        thisWeekDist += (a.distance || 0) / 100000;
                      } else if (d >= startOfLastWeek && d < startOfThisWeek) {
                        lastWeekDist += (a.distance || 0) / 100000;
                      }
                    }

                    let distDiffText = '–';
                    if (lastWeekDist > 0) {
                      const perc = ((thisWeekDist - lastWeekDist) / lastWeekDist) * 100;
                      distDiffText = perc >= 0 
                        ? `▲ ${perc.toFixed(0)}% vs last week`
                        : `▼ ${Math.abs(perc).toFixed(0)}% vs last week`;
                    } else if (thisWeekDist > 0) {
                      distDiffText = `▲ 100% vs last week`;
                    }

                    let sleepDesc = lang === 'id' ? 'Menunggu Data' : 'Waiting for Data';
                    if (latestSleepScore) {
                      if (latestSleepScore >= 80) sleepDesc = lang === 'id' ? 'Pemulihan Sangat Baik' : 'Excellent Recovery';
                      else if (latestSleepScore >= 60) sleepDesc = lang === 'id' ? 'Pemulihan Cukup' : 'Good Recovery';
                      else sleepDesc = lang === 'id' ? 'Pemulihan Kurang' : 'Poor Recovery';
                    }

                    let paceDesc = lang === 'id' ? 'Belum Ada Target' : 'No Target Set';
                    if (targetPace) {
                      paceDesc = lang === 'id' ? 'Zona Lari Optimal' : 'Optimal Run Zone';
                    }

                    let filteredDist = 0;
                    let distDesc = lang === 'id' ? 'Total sepanjang masa' : 'All time distance';
                    
                    const timeRanges = {
                      '1w': now.getTime() - 7 * 24 * 60 * 60 * 1000,
                      '1m': now.getTime() - 30 * 24 * 60 * 60 * 1000,
                      '3m': now.getTime() - 90 * 24 * 60 * 60 * 1000,
                      '6m': now.getTime() - 180 * 24 * 60 * 60 * 1000,
                      '1y': now.getTime() - 365 * 24 * 60 * 60 * 1000,
                    };

                    if (dashboardTimeRange === 'all') {
                      filteredDist = totalDist;
                    } else {
                      const limit = timeRanges[dashboardTimeRange];
                      for (const a of data.running_activities) {
                        if (!a.startTimeLocal) continue;
                        if (new Date(a.startTimeLocal).getTime() >= limit) {
                          filteredDist += (a.distance || 0) / 100000;
                        }
                      }
                      
                      const mapDesc = {
                        '1w': lang === 'id' ? 'Dalam 1 minggu terakhir' : 'In the last 1 week',
                        '1m': lang === 'id' ? 'Dalam 1 bulan terakhir' : 'In the last 1 month',
                        '3m': lang === 'id' ? 'Dalam 3 bulan terakhir' : 'In the last 3 months',
                        '6m': lang === 'id' ? 'Dalam 6 bulan terakhir' : 'In the last 6 months',
                        '1y': lang === 'id' ? 'Dalam 1 tahun terakhir' : 'In the last 1 year',
                      };
                      distDesc = mapDesc[dashboardTimeRange] || distDesc;
                    }

                    return [
                      { 
                        label: lang === 'id' ? 'Jarak Minggu Ini' : 'Weekly Mileage', 
                        value: thisWeekDist.toFixed(1), 
                        unit: 'km', 
                        desc: distDiffText,
                        color: '#818cf8' 
                      },
                      { 
                        label: lang === 'id' ? 'Skor Tidur (Kesiapan)' : 'Sleep Score (Readiness)', 
                        value: latestSleepScore || '–', 
                        unit: '/100', 
                        desc: sleepDesc,
                        color: '#a78bfa' 
                      },
                      { 
                        label: lang === 'id' ? 'Target Pace' : 'Pace Target', 
                        value: targetPace ? formatPace(targetPace) : '–', 
                        unit: '/km', 
                        desc: paceDesc,
                        color: '#34d399' 
                      },
                      { 
                        label: t.totalDistance, 
                        value: filteredDist.toFixed(1), 
                        unit: 'km', 
                        desc: distDesc,
                        color: '#fbbf24' 
                      },
                    ].map((m, i) => (
                      <div className="metric-card animate-fade-in" key={i} style={{ '--accent-color': m.color, animationDelay: `${i * 0.06}s`, display: 'flex', flexDirection: 'column' }}>
                        <div className="metric-label">{m.label}</div>
                        <div className="metric-value">
                          {m.value}
                          <span className="metric-unit">{m.unit}</span>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 'auto', paddingTop: 10, fontWeight: 500 }}>
                          {m.desc}
                        </div>
                      </div>
                    ));
                  })()}
                </div>

                <div className="dashboard-layout" style={{ marginTop: 20 }}>
                  {/* Left Column: Primary training metrics and coaches */}
                  <div className="dashboard-main-col">
                    <TrendChart activities={runActs} lang={lang} externalTimeRange={dashboardTimeRange} setExternalTimeRange={setDashboardTimeRange} />
                    <AICoach activities={data.running_activities} profile={{ age, goal, targetPace }} lang={lang} isPremium={isPremium} setShowPremiumModal={setShowPremiumModal} />
                  </div>

                  {/* Right Column: Secondary charts and summaries */}
                  <div className="dashboard-side-col">
                    {actualMaxHR > 0 && (
                      <HRZoneChart zones={hrZones} activities={data.running_activities} avgHr={avgHR ? Math.round(avgHR) : 0} lang={lang} />
                    )}

                    {actualMaxHR > 0 && (
                      <div className="info-card purple">
                        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                          <strong style={{ color: 'var(--text-primary)' }}>{lang === 'id' ? 'Detak Jantung:' : 'Heart Rate:'}</strong>{' '}
                          {lang === 'id' ? (
                            <>
                              Estimasi Max HR berdasarkan umur ({age} tahun) adalah <strong>{220 - age} bpm</strong>,
                              tapi data mencatat hingga <strong style={{ color: '#f97316' }}>{actualMaxHR} bpm</strong>.
                              Zona latihan lo dikalkulasi pakai data aktual yang lebih akurat.
                            </>
                          ) : (
                            <>
                              Estimated Max HR based on age ({age} years) is <strong>{220 - age} bpm</strong>,
                              but your data recorded up to <strong style={{ color: '#f97316' }}>{actualMaxHR} bpm</strong>.
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
                  onLogManualActivity={handleLogManualActivity}
                  onDeleteManualActivity={handleDeleteManualActivity}
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
                <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h2 className="section-title" style={{ margin: 0 }}>
                    {lang === 'id' ? `Riwayat Sesi Lari (${totalSessions})` : `Run Session History (${totalSessions})`}
                  </h2>
                </div>
                <RunHistory 
                  activities={runActs} 
                  lang={lang}
                  onViewDetails={setSelectedRunForDetails}
                  onDelete={(actTime) => {
                    if (window.confirm(lang === 'id' ? 'Hapus sesi lari ini?' : 'Delete this run session?')) {
                      setData(prev => {
                        const updated = {
                          ...prev,
                          running_activities: prev.running_activities.filter(a => a.startTimeLocal !== actTime)
                        };
                        saveAndSyncData(updated);
                        return updated;
                      });
                    }
                  }}
                  onEdit={(actTime, newName) => {
                    setData(prev => {
                      const updated = {
                        ...prev,
                        running_activities: prev.running_activities.map(a => 
                          a.startTimeLocal === actTime ? { ...a, name: newName } : a
                        )
                      };
                      saveAndSyncData(updated);
                      return updated;
                    });
                  }}
                />
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
                          {recoveryEndTimestamp && (
                            <div style={{ 
                              marginTop: '6px', 
                              padding: '4px 10px', 
                              background: 'rgba(245, 158, 11, 0.1)', 
                              color: '#f59e0b', 
                              border: '1px solid rgba(245, 158, 11, 0.2)',
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 22h14"></path>
                                <path d="M5 2h14"></path>
                                <path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"></path>
                                <path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"></path>
                              </svg>
                              <LiveCountdown endTimestamp={recoveryEndTimestamp} lang={lang} />
                            </div>
                          )}
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
                      {Object.entries(sleepRecs).sort(([a], [b]) => b.localeCompare(a)).map(([key, rec]) => {
                        const dateForDisplay = rec.dateStr || key.split('_')[0];
                        const s = rec.score;
                        const color = s >= 80 ? '#10b981' : s >= 60 ? '#f59e0b' : '#ef4444';
                        return (
                          <div className="sleep-history-card" key={key}>
                            <div className="sleep-card-left">
                              <div className="sleep-card-date">
                                {new Date(dateForDisplay).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                {runDates.has(dateForDisplay) && <span className="badge badge-easy" style={{ marginLeft: 8, padding: '1px 6px', fontSize: 10 }}>{lang === 'id' ? 'Lari' : 'Ran'}</span>}
                              </div>
                              {rec.duration !== undefined && (
                                <div className="sleep-card-dur">
                                  {(() => {
                                    const h = Math.floor(rec.duration);
                                    const m = Math.round((rec.duration - h) * 60);
                                    let typeStr = "";
                                    if (rec.type === 'nap') typeStr = 'Nap: ';
                                    else if (rec.type === 'night') typeStr = lang === 'id' ? 'Malam: ' : 'Night: ';
                                    
                                    // Fallback to legacy format
                                    if (rec.nightDuration !== undefined && rec.napDuration !== undefined) {
                                      let parts = [];
                                      if (rec.nightDuration > 0) {
                                        const h1 = Math.floor(rec.nightDuration);
                                        const m1 = Math.round((rec.nightDuration - h1) * 60);
                                        parts.push(lang === 'id' ? `Malam: ${h1}j ${m1}m` : `Night: ${h1}h ${m1}m`);
                                      }
                                      if (rec.napDuration > 0) {
                                        const h2 = Math.floor(rec.napDuration);
                                        const m2 = Math.round((rec.napDuration - h2) * 60);
                                        parts.push(`Nap: ${h2}j ${m2}m`);
                                      }
                                      if (parts.length > 0) return parts.join(' | ');
                                    }
                                    
                                    return lang === 'id' ? `${typeStr}${h} jam ${m} menit` : `${typeStr}${h}h ${m}m`;
                                  })()}
                                </div>
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
          </Suspense>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div className="form-group">
                <label className="form-label">{lang === 'id' ? 'Tanggal' : 'Date'}</label>
                <input className="form-input" type="date" value={manualRun.date} onChange={e => setManualRun(r => ({ ...r, date: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">{lang === 'id' ? 'Waktu (Jam)' : 'Time'}</label>
                <input className="form-input" type="time" value={manualRun.time} onChange={e => setManualRun(r => ({ ...r, time: e.target.value }))} />
              </div>
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
            <h3 style={{ marginBottom: 16 }}>{lang === 'id' ? 'Catat Tidur / Nap' : 'Log Sleep / Nap'}</h3>
            
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--bg-card)', padding: 4, borderRadius: 12, border: '1px solid var(--border)' }}>
              <button
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: manualSleep.inputType === 'score' ? 'var(--bg-surface)' : 'transparent', color: manualSleep.inputType === 'score' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', boxShadow: manualSleep.inputType === 'score' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                onClick={() => setManualSleep(s => ({ ...s, inputType: 'score' }))}
              >
                {lang === 'id' ? 'Skor Akurat' : 'Exact Score'}
              </button>
              <button
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', background: manualSleep.inputType === 'quality' ? 'var(--bg-surface)' : 'transparent', color: manualSleep.inputType === 'quality' ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s', boxShadow: manualSleep.inputType === 'quality' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none' }}
                onClick={() => setManualSleep(s => ({ ...s, inputType: 'quality' }))}
              >
                {lang === 'id' ? 'Kualitas Umum' : 'General Quality'}
              </button>
            </div>

            <div className="form-group" style={{ marginBottom: 12 }}>
              <label className="form-label">{lang === 'id' ? 'Tanggal' : 'Date'}</label>
              <input className="form-input" type="date" value={manualSleep.date} onChange={e => {
                const newDate = e.target.value;
                setManualSleep(s => ({ 
                  ...s, 
                  date: newDate
                }));
              }} />
            </div>

            {manualSleep.inputType === 'score' ? (
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label">{lang === 'id' ? 'Skor Tidur (0-100)' : 'Sleep Score (0-100)'}</label>
                <NumberInput label={lang === 'id' ? 'Skor' : 'Score'} value={manualSleep.score} onChange={v => setManualSleep(s => ({ ...s, score: v }))} min={10} max={100} step={1} />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  {lang === 'id' ? 'Masukkan skor tidur dari smartwatch Anda.' : 'Enter your exact sleep score from your smartwatch.'}
                </p>
              </div>
            ) : (
              <div className="form-group" style={{ marginBottom: 12 }}>
                <label className="form-label">{t.sleepQuality}</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
                  {[
                    { val: 'pulas', label: lang === 'id' ? '😴 Sangat Pulas & Segar (Score: 90)' : '😴 Deep Sleep & Refreshed (Score: 90)', col: '#10b981' },
                    { val: 'cukup', label: lang === 'id' ? '🙂 Cukup Baik (Score: 75)' : '🙂 Okay / Normal (Score: 75)', col: '#38bdf8' },
                    { val: 'kurang', label: lang === 'id' ? '🥱 Kurang Nyenyak (Score: 55)' : '🥱 Poor / Interrupted (Score: 55)', col: '#f59e0b' },
                    { val: 'begadang', label: lang === 'id' ? '😫 Begadang / Sangat Kurang (Score: 30)' : '😫 Restless / Too Short (Score: 30)', col: '#f43f5e' }
                  ].map(q => (
                    <button key={q.val} type="button" onClick={() => setManualSleep(s => ({ ...s, quality: q.val }))}
                      style={{ background: manualSleep.quality === q.val ? `${q.col}15` : 'var(--bg-card)', border: `1.5px solid ${manualSleep.quality === q.val ? q.col : 'var(--border)'}`, color: manualSleep.quality === q.val ? q.col : 'var(--text-secondary)', padding: '12px', borderRadius: 8, textAlign: 'left', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}>
                      {q.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>{lang === 'id' ? 'Jenis Tidur' : 'Sleep Type'}</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: manualSleep.sleepType === 'night' ? '1.5px solid var(--accent-purple)' : '1px solid var(--border)', background: manualSleep.sleepType === 'night' ? 'rgba(167, 139, 250, 0.1)' : 'var(--bg-card)', color: manualSleep.sleepType === 'night' ? 'var(--accent-purple)' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setManualSleep(s => ({ ...s, sleepType: 'night' }))}
                >
                  {lang === 'id' ? 'Tidur Semalam' : 'Night Sleep'}
                </button>
                <button
                  style={{ flex: 1, padding: '10px', borderRadius: 8, border: manualSleep.sleepType === 'nap' ? '1.5px solid #38bdf8' : '1px solid var(--border)', background: manualSleep.sleepType === 'nap' ? 'rgba(56, 189, 248, 0.1)' : 'var(--bg-card)', color: manualSleep.sleepType === 'nap' ? '#38bdf8' : 'var(--text-secondary)', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
                  onClick={() => setManualSleep(s => ({ ...s, sleepType: 'nap' }))}
                >
                  {lang === 'id' ? 'Tidur Siang (Nap)' : 'Daytime Nap'}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ marginBottom: 8 }}>{lang === 'id' ? 'Durasi' : 'Duration'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <NumberInput label={lang === 'id' ? 'Jam' : 'Hours'} value={manualSleep.sleepHours} onChange={v => setManualSleep(s => ({ ...s, sleepHours: v }))} min={0} max={24} step={1} />
                <NumberInput label={lang === 'id' ? 'Menit' : 'Minutes'} value={manualSleep.sleepMinutes} onChange={v => setManualSleep(s => ({ ...s, sleepMinutes: v }))} min={0} max={59} step={1} />
              </div>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: -16, marginBottom: 20, textAlign: 'center' }}>
              {lang === 'id' ? '*Durasi disarankan agar penghitungan recovery optimal.' : '*Duration is recommended for optimal recovery calculation.'}
            </p>
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

            {(isAdmin || isPremium) && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, margin: '16px 0' }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>ATAU</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    if (data.profile?.stravaConnected && data.profile?.stravaRefreshToken) {
                      syncStravaData();
                      setShowUploadModal(false);
                      return;
                    }

                    const clientId = import.meta.env.VITE_STRAVA_CLIENT_ID;
                    if (!clientId) {
                      alert('Strava Client ID belum dikonfigurasi di Environment Variables!');
                      return;
                    }
                    const redirectUri = window.location.origin;
                    window.location.href = `https://www.strava.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&approval_prompt=auto&scope=activity:read_all`;
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
                    : 'Connect with Strava'}
                </button>
              </>
            )}

            <button className="btn btn-secondary" onClick={() => setShowUploadModal(false)} style={{ width: '100%', marginTop: 20 }}>Tutup</button>
          </div>
        </div>
      )}

      <Suspense fallback={null}>
        {showExportGuide && <ExportGuideModal onClose={() => setShowExportGuide(false)} lang={lang} />}
        {showFeedbackModal && <FeedbackModal onClose={() => setShowFeedbackModal(false)} lang={lang} addToast={addToast} />}
        {showPremiumModal && (
        <PremiumModal 
          onClose={() => setShowPremiumModal(false)} 
          isPremium={isPremium}
          lang={lang}
          globalSettings={globalSettings}
          onUpgrade={async (receiptFile, amount) => {
            try {
              if (!auth.currentUser) {
                addToast('Harap login terlebih dahulu untuk upgrade.');
                return;
              }
              const userEmail = auth.currentUser.email || auth.currentUser.displayName || currentUser;
              const userId = auth.currentUser.email ? auth.currentUser.email.toLowerCase() : auth.currentUser.uid;
              
              let receiptUrl = '';
              if (receiptFile) {
                addToast(lang === 'id' ? 'Mengupload bukti transfer...' : 'Uploading receipt...');
                const storageRef = ref(storage, `upgrade_receipts/${userId}_${Date.now()}_${receiptFile.name}`);
                await uploadBytes(storageRef, receiptFile);
                receiptUrl = await getDownloadURL(storageRef);
              }

              await addDoc(collection(db, "upgrade_requests"), {
                userId: userId,
                email: userEmail,
                displayName: displayName,
                receiptUrl: receiptUrl,
                amount: amount || 29000,
                requestedAt: serverTimestamp(),
                status: 'pending'
              });

              // Decrement the global promo quota by 1
              await setDoc(doc(db, 'settings', 'global'), {
                proQuotaRemaining: increment(-1)
              }, { merge: true });
              
              setGlobalSettings(prev => ({
                ...prev,
                proQuotaRemaining: (prev?.proQuotaRemaining || 1) - 1
              }));

              addToast(lang === 'id' ? 'Permintaan Upgrade berhasil dikirim! Menunggu konfirmasi Admin.' : 'Upgrade request sent! Waiting for Admin confirmation.');
            } catch (err) {
              console.error(err);
              addToast(lang === 'id' ? 'Gagal mengirim permintaan.' : 'Failed to send request.');
            }
          }}
        />
        )}
      </Suspense>

      <Suspense fallback={null}>
        <AICoachChat 
          lang={lang} 
          goal={goal} 
          programStyle={programStyle} 
          targetPace={targetPace} 
          currentUser={data?.profile?.displayName || currentUser} 
          runActs={runActs}
          selectedDays={selectedDays}
          latestSleepScore={latestSleepScore}
          recoveryRemainingHours={recoveryRemainingHours}
          trainingReadinessScore={trainingReadinessScore}
          isPremium={isPremium}
          setShowPremiumModal={setShowPremiumModal}
          vo2max={vo2max}
        />
        {selectedRunForDetails && (
          <RunDetailsModal 
            act={selectedRunForDetails} 
            onClose={() => setSelectedRunForDetails(null)} 
            onShare={() => {
              setShareTemplate('run');
              setShowShareModal(true);
            }}
            lang={lang} 
            stravaAccessToken={data.profile?.stravaAccessToken}
            isPremium={isPremium}
            onEdit={(actTime, newName) => {
              handleEditRunName(actTime, newName);
              setSelectedRunForDetails(prev => ({ ...prev, name: newName }));
            }}
            onDelete={(actTime) => {
              if (window.confirm(lang === 'id' ? 'Hapus sesi lari ini?' : 'Delete this run session?')) {
                setData(prev => {
                  const updated = {
                    ...prev,
                    running_activities: prev.running_activities.filter(a => a.startTimeLocal !== actTime)
                  };
                  saveAndSyncData(updated);
                  return updated;
                });
                setSelectedRunForDetails(null);
              }
            }}
          />
        )}
      </Suspense>
      
      {croppingImageSrc && (
        <ImageCropperModal
          imageSrc={croppingImageSrc}
          onComplete={(base64Str) => {
            setEditDraft(prev => ({ ...prev, avatar: base64Str }));
            setCroppingImageSrc(null);
          }}
          onClose={() => setCroppingImageSrc(null)}
          lang={lang}
        />
      )}
      <Toast toasts={toasts} />
    </div>
  );
}

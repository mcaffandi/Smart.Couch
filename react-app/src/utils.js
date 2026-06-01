const LIST_KEY = 'smartcoach_users_list';
const CURRENT_KEY = 'smartcoach_current_user';
const LEGACY_KEY = 'smartcoach_data';

const DEFAULT_PROFILE = {
  age: null,
  goal: 'maintenance',
  programStyle: 'sedang',
  targetPace: null,
  selectedDays: ['Selasa', 'Kamis', 'Sabtu']
};

export const loadUsersList = () => {
  try {
    const raw = localStorage.getItem(LIST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return ['Profil Utama'];
};

export const saveUsersList = (list) => {
  try {
    localStorage.setItem(LIST_KEY, JSON.stringify(list));
  } catch (e) {}
};

export const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (raw) return raw;
  } catch (e) {}
  return 'Profil Utama';
};

export const saveCurrentUser = (username) => {
  try {
    localStorage.setItem(CURRENT_KEY, username);
  } catch (e) {}
};

export const loadUserData = (username) => {
  const userKey = `smartcoach_data_user_${username}`;
  try {
    const raw = localStorage.getItem(userKey);
    if (raw) return JSON.parse(raw);

    // If new user and not 'Profil Utama', check if we have local data to migrate
    if (username !== 'Profil Utama') {
      const legacyKey = 'smartcoach_data_user_Profil Utama';
      let legacyRaw = localStorage.getItem(legacyKey);
      if (!legacyRaw) {
        legacyRaw = localStorage.getItem(LEGACY_KEY);
      }
      if (legacyRaw) {
        const parsed = JSON.parse(legacyRaw);
        if (!parsed.profile) {
          parsed.profile = { ...DEFAULT_PROFILE };
        }
        // Save copy for the new user
        localStorage.setItem(userKey, JSON.stringify(parsed));
        return parsed;
      }
    }

    if (username === 'Profil Utama') {
      const legacy = localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy);
        if (!parsed.profile) {
          parsed.profile = { ...DEFAULT_PROFILE };
        }
        localStorage.setItem(userKey, JSON.stringify(parsed));
        localStorage.removeItem(LEGACY_KEY);
        return parsed;
      }
    }
  } catch (e) {}
  
  return { 
    running_activities: [], 
    sleep_records: {}, 
    max_hr: 0,
    profile: { ...DEFAULT_PROFILE }
  };
};

export const saveUserData = (username, data) => {
  const userKey = `smartcoach_data_user_${username}`;
  try {
    localStorage.setItem(userKey, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save user data:', e);
  }
};

export const deleteUserData = (username) => {
  const userKey = `smartcoach_data_user_${username}`;
  try {
    localStorage.removeItem(userKey);
  } catch (e) {}
};

// ──────────────────────────────────────────────
// Date Helpers
// ──────────────────────────────────────────────
export const msToDate = (ms) => {
  return new Date(ms).toISOString().split('T')[0];
};

export const formatDate = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

// ──────────────────────────────────────────────
// Pace Helpers
// ──────────────────────────────────────────────
export const getPaceRecommendations = (targetPace) => {
  if (!targetPace) {
    return {
      ngepush: '—',
      sedang: '—',
      santai: '—'
    };
  }
  const baseSecs = targetPace * 60;

  const formatP = (p) => {
    const mins = Math.floor(p);
    const secs = Math.round((p - mins) * 60);
    if (secs >= 60) return `${mins + 1}:00`;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  const pushMin = (baseSecs - 30) / 60;
  const pushMax = (baseSecs - 10) / 60;
  const steadyMin = (baseSecs + 30) / 60;
  const steadyMax = (baseSecs + 60) / 60;
  const easyMin = (baseSecs + 90) / 60;
  const easyMax = (baseSecs + 120) / 60;

  return {
    ngepush: `${formatP(pushMin)} – ${formatP(pushMax)}`,
    sedang: `${formatP(steadyMin)} – ${formatP(steadyMax)}`,
    santai: `${formatP(easyMin)} – ${formatP(easyMax)}`,
  };
};

// ──────────────────────────────────────────────
// HR Zone Computation
// ──────────────────────────────────────────────
export const getHRZones = (maxHR) => [
  { zone: 'Z1 – Recovery',   pct: '50–60%', min: Math.round(maxHR * 0.50), max: Math.round(maxHR * 0.60), color: '#38bdf8' },
  { zone: 'Z2 – Aerobic',    pct: '60–70%', min: Math.round(maxHR * 0.60), max: Math.round(maxHR * 0.70), color: '#34d399' },
  { zone: 'Z3 – Tempo',      pct: '70–80%', min: Math.round(maxHR * 0.70), max: Math.round(maxHR * 0.80), color: '#fbbf24' },
  { zone: 'Z4 – Threshold',  pct: '80–90%', min: Math.round(maxHR * 0.80), max: Math.round(maxHR * 0.90), color: '#f97316' },
  { zone: 'Z5 – Max',        pct: '90–100%',min: Math.round(maxHR * 0.90), max: maxHR,                     color: '#fb7185' },
];

// ──────────────────────────────────────────────
// Training Plans
// ──────────────────────────────────────────────
export const buildTrainingPlan = (programStyle, goal, paces, selectedDays = ['Selasa', 'Kamis', 'Sabtu']) => {
  const weekDays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
  
  // Base scale factor based on programStyle
  let scale = 1.0;
  if (programStyle === 'ngepush') scale = 1.25;
  if (programStyle === 'santai') scale = 0.75;
  
  // Format dynamic times (e.g. "30 menit" scaled to 38 minutes)
  const getScaledDur = (baseMin, label = 'menit') => {
    return `${Math.round(baseMin * scale)} ${label}`;
  };

  const plan = weekDays.map(day => ({
    hari: day,
    jenis: 'Rest / Stretching',
    durasi: '–',
    tujuan: 'Hari pemulihan total untuk pemulihan jaringan otot.'
  }));

  // Auto-assign recommended days if user leaves it empty
  let activeDays = [...selectedDays];
  if (activeDays.length === 0) {
    if (goal === 'marathon') activeDays = ['Selasa', 'Kamis', 'Sabtu', 'Minggu'];
    else if (goal === 'turun-hr') activeDays = ['Rabu', 'Jumat', 'Minggu'];
    else if (goal === 'weightloss') activeDays = ['Senin', 'Rabu', 'Jumat', 'Sabtu'];
    else activeDays = ['Selasa', 'Kamis', 'Sabtu'];
  }

  // Sort selected days in weekly order
  const sortedSelected = weekDays.filter(d => activeDays.includes(d));
  const numDays = sortedSelected.length;
  
  // Workouts distribution list
  const workouts = [];

  // Define pace labels
  const pSantai = paces.santai;
  const pSedang = paces.sedang;
  const pNgepush = paces.ngepush;

  if (numDays === 1) {
    workouts.push({
      jenis: goal === 'turun-hr' ? 'MAF / Zone 2 Run' : 'Steady Run',
      durasi: goal === 'marathon' 
        ? `${getScaledDur(45)}  ·  Santai: ${pSantai}` 
        : goal === '10k' 
          ? `${getScaledDur(35)}  ·  Sedang: ${pSedang}`
          : goal === 'turun-hr'
            ? `${getScaledDur(45)}  ·  Santai: ${pSantai}`
            : `${getScaledDur(30)}  ·  Santai: ${pSantai}`,
      tujuan: goal === 'turun-hr' ? 'Lari pelan untuk menjaga detak jantung rendah (Base Building).' : 'Sesi lari tunggal minggu ini: fokus menjaga kebugaran dasar.'
    });
  } else if (numDays === 2) {
    workouts.push({
      jenis: goal === 'weightloss' ? 'Easy Run (Fat Burn)' : goal === 'turun-hr' ? 'Zone 2 Run' : 'Easy Run',
      durasi: goal === 'turun-hr' ? `${getScaledDur(35)}  ·  Santai: ${pSantai}` : `${getScaledDur(25)}  ·  Santai: ${pSantai}`,
      tujuan: goal === 'turun-hr' ? 'Adaptasi kapiler untuk efisiensi jantung.' : 'Lari intensitas rendah untuk konsistensi aerobik.'
    });
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Long Base Run' : 'Long Run',
      durasi: goal === 'marathon'
        ? `${getScaledDur(90)}  ·  Santai: ${pSantai}`
        : goal === '10k'
          ? `${getScaledDur(60)}  ·  Sedang: ${pSedang}`
          : goal === 'turun-hr'
            ? `${getScaledDur(60)}  ·  Santai: ${pSantai}`
            : `${getScaledDur(50)}  ·  Sedang: ${pSedang}`,
      tujuan: goal === 'turun-hr' ? 'Melatih ketahanan otot jantung pada denyut rendah.' : 'Lari jarak jauh mingguan untuk stamina fisik.'
    });
  } else if (numDays === 3) {
    workouts.push({
      jenis: goal === 'weightloss' ? 'Easy Run (Fat Burn)' : goal === 'turun-hr' ? 'Zone 2 Run' : 'Easy Run',
      durasi: goal === 'turun-hr' ? `${getScaledDur(40)}  ·  Santai: ${pSantai}` : `${getScaledDur(30)}  ·  Santai: ${pSantai}`,
      tujuan: goal === 'turun-hr' ? 'Volume aerobik rendah untuk menurunkan resting HR.' : 'Membangun volume lari aerobik dasar.'
    });
    workouts.push({
      jenis: goal === 'weightloss' ? 'HIIT Run' : goal === 'turun-hr' ? 'Zone 2 Run (Hill/Tanjakan)' : 'Interval / Tempo',
      durasi: goal === 'weightloss'
        ? `${getScaledDur(20)}  ·  Ngepush: ${pNgepush}`
        : goal === '10k'
          ? `5x400m  ·  Ngepush: ${pNgepush}`
          : goal === 'turun-hr'
            ? `${getScaledDur(30)}  ·  Sedang: ${pSedang}`
            : `${getScaledDur(25)}  ·  Ngepush: ${pNgepush}`,
      tujuan: goal === 'weightloss' ? 'Memicu metabolisme pembakaran kalori pasca-latihan.' : goal === 'turun-hr' ? 'Menguatkan otot kaki tanpa terlalu meledakkan HR.' : 'Melatih kapasitas paru-paru dan kecepatan kaki.'
    });
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Long MAF Run' : 'Long Run',
      durasi: goal === 'marathon'
        ? `${getScaledDur(105)}  ·  Santai: ${pSantai}`
        : goal === '10k'
          ? `${getScaledDur(75)}  ·  Sedang: ${pSedang}`
          : goal === 'turun-hr'
            ? `${getScaledDur(80)}  ·  Santai: ${pSantai}`
            : `${getScaledDur(60)}  ·  Sedang: ${pSedang}`,
      tujuan: goal === 'turun-hr' ? 'Adaptasi efisiensi metabolisme lemak dan jantung kuat.' : 'Membangun ketahanan fisik jangka panjang.'
    });
  } else if (numDays === 4) {
    workouts.push({
      jenis: goal === 'weightloss' ? 'Easy Run (Fat Burn)' : goal === 'turun-hr' ? 'Zone 2 Run' : 'Easy Run',
      durasi: goal === 'turun-hr' ? `${getScaledDur(40)}  ·  Santai: ${pSantai}` : `${getScaledDur(30)}  ·  Santai: ${pSantai}`,
      tujuan: goal === 'turun-hr' ? 'Volume aerobik dasar mingguan.' : 'Volume aerobik dasar mingguan.'
    });
    workouts.push({
      jenis: goal === 'weightloss' ? 'HIIT Run' : goal === 'turun-hr' ? 'Zone 2 / MAF Run' : 'Interval / Tempo',
      durasi: goal === 'turun-hr' ? `${getScaledDur(45)}  ·  Santai: ${pSantai}` : `${getScaledDur(25)}  ·  Ngepush: ${pNgepush}`,
      tujuan: goal === 'turun-hr' ? 'Membangun dasar paru-paru tanpa mengorbankan otot.' : 'Meningkatkan ambang laktat jantung.'
    });
    workouts.push({
      jenis: 'Recovery Jog',
      durasi: `${getScaledDur(20)}  ·  Santai: ${pSantai}`,
      tujuan: 'Sirkulasi darah ringan membantu pemulihan otot.'
    });
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Long Base Run' : 'Long Run',
      durasi: goal === 'marathon'
        ? `${getScaledDur(120)}  ·  Santai: ${pSantai}`
        : goal === '10k'
          ? `${getScaledDur(90)}  ·  Sedang: ${pSedang}`
          : goal === 'turun-hr'
            ? `${getScaledDur(90)}  ·  Santai: ${pSantai}`
            : `${getScaledDur(80)}  ·  Sedang: ${pSedang}`,
      tujuan: goal === 'turun-hr' ? 'Waktu di bawah tekanan untuk merendahkan resting HR.' : 'Long run spesifik melatih daya tahan kaki.'
    });
  } else {
    // 5+ Days
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Zone 2 Run' : 'Easy Run',
      durasi: goal === 'turun-hr' ? `${getScaledDur(45)}  ·  Santai: ${pSantai}` : `${getScaledDur(35)}  ·  Santai: ${pSantai}`,
      tujuan: 'Membangun volume kardio mingguan.'
    });
    workouts.push({
      jenis: goal === 'weightloss' ? 'HIIT Run' : goal === 'turun-hr' ? 'Zone 2 / MAF Run' : 'Interval / Tempo',
      durasi: goal === 'turun-hr' ? `${getScaledDur(45)}  ·  Santai: ${pSantai}` : `${getScaledDur(25)}  ·  Ngepush: ${pNgepush}`,
      tujuan: goal === 'turun-hr' ? 'Fokus pernapasan (nasal breathing) di denyut rendah.' : 'Melatih kecepatan dan VO2Max.'
    });
    workouts.push({
      jenis: 'Recovery Jog',
      durasi: `${getScaledDur(20)}  ·  Santai: ${pSantai}`,
      tujuan: 'Pemulihan aktif.'
    });
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Zone 2 Run' : 'Easy Run',
      durasi: goal === 'turun-hr' ? `${getScaledDur(40)}  ·  Santai: ${pSantai}` : `${getScaledDur(30)}  ·  Santai: ${pSantai}`,
      tujuan: goal === 'turun-hr' ? 'Meningkatkan stroke volume jantung.' : 'Lari ringan menjaga ritme latihan.'
    });
    workouts.push({
      jenis: goal === 'turun-hr' ? 'Long Base Run' : 'Long Run',
      durasi: goal === 'marathon'
        ? `${getScaledDur(140)}  ·  Santai: ${pSantai}`
        : goal === '10k'
          ? `${getScaledDur(100)}  ·  Sedang: ${pSedang}`
          : goal === 'turun-hr'
            ? `${getScaledDur(110)}  ·  Santai: ${pSantai}`
            : `${getScaledDur(90)}  ·  Sedang: ${pSedang}`,
      tujuan: goal === 'turun-hr' ? 'Ketahanan panjang untuk efisiensi pembakaran lemak.' : 'Puncak ketahanan tubuh minggu ini.'
    });
    
    // Fallback fill for 6 or 7 days
    while (workouts.length < numDays) {
      workouts.push({
        jenis: 'Active Recovery',
        durasi: `${getScaledDur(20)}  ·  Santai: ${pSantai}`,
        tujuan: 'Jalan/jog ringan menjaga metabolisme tubuh.'
      });
    }
  }

  // Assign workouts to selected days
  sortedSelected.forEach((day, idx) => {
    const targetIdx = weekDays.indexOf(day);
    if (targetIdx !== -1 && workouts[idx]) {
      plan[targetIdx] = {
        hari: day,
        ...workouts[idx]
      };
    }
  });

  // Assign Cross-Training to the REST days
  const restDays = weekDays.filter(d => !activeDays.includes(d));
  
  const crossTrainings = [
    {
      jenis: 'Core & Leg Stabilizer',
      durasi: '15-20 menit  ·  Bodyweight',
      tujuan: 'Melatih otot inti (Plank/Bridge) dan engkel, TANPA squat/lunges berat.'
    },
    {
      jenis: 'Yoga / Mobility',
      durasi: '20-30 menit  ·  Matras',
      tujuan: 'Peregangan dinamis fokus pada pinggul, betis, dan peregangan hamstring.'
    },
    {
      jenis: 'Breathing / Relaksasi',
      durasi: '10-15 menit  ·  Fokus Pernapasan',
      tujuan: 'Latihan pernapasan perut (Nasal Breathing) untuk melatih kapasitas oksigen.'
    },
    {
      jenis: 'Active Recovery',
      durasi: '30 menit  ·  Jalan Kaki',
      tujuan: 'Jalan santai/bersepeda ringan untuk melancarkan sirkulasi darah tanpa beban.'
    }
  ];

  restDays.forEach((coreDay, idx) => {
    const coreIdx = weekDays.indexOf(coreDay);
    
    // Always make the last rest day of the week a Total Rest day if there are multiple rest days
    if (idx === restDays.length - 1 && restDays.length > 1) {
      plan[coreIdx] = {
        hari: coreDay,
        jenis: 'Total Rest',
        durasi: '–',
        tujuan: 'Pemulihan pasif total. Fokus pada tidur berkualitas dan asupan protein.'
      };
    } else {
      const ct = crossTrainings[idx % crossTrainings.length];
      plan[coreIdx] = {
        hari: coreDay,
        jenis: ct.jenis,
        durasi: ct.durasi,
        tujuan: ct.tujuan
      };
    }
  });

  return plan;
};

// ──────────────────────────────────────────────
// Adaptive Calendar Builder
// ──────────────────────────────────────────────
export const buildAdaptiveCalendar = (weeklyPlan, activities = [], isPaused = false) => {
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const startOfThisWeek = new Date(today);
  startOfThisWeek.setDate(today.getDate() - diffToMonday);
  
  const startDate = new Date(startOfThisWeek);
  startDate.setDate(startDate.getDate() - 7); // Start 1 week ago

  const activityMap = {};
  activities.forEach(a => {
    if (a.startTimeLocal) {
      let dateStr = '';
      if (typeof a.startTimeLocal === 'string') {
        dateStr = a.startTimeLocal.split('T')[0].split(' ')[0];
      } else {
        try {
          const dObj = new Date(a.startTimeLocal);
          if (!isNaN(dObj.getTime())) {
            const y = dObj.getFullYear();
            const m = String(dObj.getMonth() + 1).padStart(2, '0');
            const d = String(dObj.getDate()).padStart(2, '0');
            dateStr = `${y}-${m}-${d}`;
          }
        } catch (e) {}
      }
      if (dateStr) activityMap[dateStr] = true;
    }
  });

  const calendar = [];

  for (let i = 0; i < 28; i++) { // 4 weeks
    const current = new Date(startDate);
    current.setDate(startDate.getDate() + i);
    
    // Format YYYY-MM-DD safely
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, '0');
    const d = String(current.getDate()).padStart(2, '0');
    const dateStr = `${y}-${m}-${d}`;
    
    const wDay = current.getDay();
    const idx = wDay === 0 ? 6 : wDay - 1;
    
    let workout = { ...weeklyPlan[idx] };
    
    const isPast = current < today;
    const isToday = current.getTime() === today.getTime();
    const hasRun = !!activityMap[dateStr];

    if (isPaused && !isPast) {
      // If paused, today and future days are marked as Paused/Rest
      workout = {
        hari: workout.hari,
        jenis: 'Total Rest',
        durasi: '-',
        tujuan: 'Recovery & Pause Mode'
      };
    } else {
      if (isPast && hasRun) {
        workout.completed = true;
      }
    }

    calendar.push({
      date: dateStr,
      dateObj: current,
      isToday,
      isPast,
      hasRun,
      isPaused,
      workout
    });
  }

  return calendar;
};

// ──────────────────────────────────────────────
// Garmin ZIP Parser (via JSZip)
// ──────────────────────────────────────────────
export const parseGarminZip = async (file, JSZip) => {
  const zip = await JSZip.loadAsync(file);
  const result = { running_activities: [], sleep_records: {}, max_hr: 0 };

  for (const [filename, zipEntry] of Object.entries(zip.files)) {
    if (filename.includes('summarizedActivities') && filename.endsWith('.json')) {
      try {
        const text = await zipEntry.async('text');
        const data = JSON.parse(text);
        let acts = [];
        if (Array.isArray(data)) {
          data.forEach(item => {
            if (item && item.summarizedActivitiesExport) {
              acts = acts.concat(item.summarizedActivitiesExport);
            } else if (item && item.activityType) {
              // Fallback in case it's a direct array of activities
              acts.push(item);
            }
          });
        } else if (data && data.summarizedActivitiesExport) {
          acts = acts.concat(data.summarizedActivitiesExport);
        }

        for (const a of acts) {
          if (a.activityType && a.activityType.includes('running')) {
            result.running_activities.push({
              startTimeLocal: a.startTimeLocal,
              distance: a.distance,
              duration: a.duration,
              avgHr: a.avgHr,
              maxHr: a.maxHr,
              activityType: a.activityType,
              name: a.name
            });
            if ((a.maxHr ?? 0) > result.max_hr) result.max_hr = a.maxHr;
          }
        }
      } catch (e) { console.warn('Error parsing activities:', e); }
    }

    if (filename.includes('sleepData') && filename.endsWith('.json')) {
      try {
        const text = await zipEntry.async('text');
        const data = JSON.parse(text);
        for (const entry of data) {
          if (entry.calendarDate && entry.sleepScores) {
            const totalSec =
              (entry.deepSleepSeconds ?? 0) +
              (entry.lightSleepSeconds ?? 0) +
              (entry.remSleepSeconds ?? 0) +
              (entry.awakeSleepSeconds ?? 0);
            result.sleep_records[entry.calendarDate] = {
              score: entry.sleepScores.overallScore,
              duration: totalSec / 3600,
            };
          }
        }
      } catch (e) { console.warn('Error parsing sleep:', e); }
    }
  }
  return result;
};

export const mergeData = (existing, incoming) => {
  let merged = [...(existing.running_activities || [])];
  
  for (const a of incoming.running_activities) {
    const existingIndex = merged.findIndex(ex => {
      const timeDiff = Math.abs(ex.startTimeLocal - a.startTimeLocal);
      const isTimeMatch = timeDiff < 60000;
      const isSameStats = Math.abs(ex.distance - a.distance) < 5000 && Math.abs(ex.duration - a.duration) < 10000;
      const isBuggyTimezoneMatch = isSameStats && timeDiff > 0 && timeDiff < 24 * 3600 * 1000;
      return isTimeMatch || isBuggyTimezoneMatch;
    });

    if (existingIndex === -1) {
      merged.push(a);
    } else {
      merged[existingIndex] = { 
        ...a, 
        route: a.route || merged[existingIndex].route || null,
        name: (merged[existingIndex].name && !['Running Session', 'Sesi Lari', 'Morning Run', 'Afternoon Run', 'Evening Run', 'Night Run'].includes(merged[existingIndex].name)) 
              ? merged[existingIndex].name 
              : (a.name || null) 
      };
    }
  }

  // Final deduplication pass to clean up any historically saved duplicates in existing data
  const uniqueRuns = [];
  merged.forEach(run => {
    const existingIndex = uniqueRuns.findIndex(ex => {
      const timeDiff = Math.abs(ex.startTimeLocal - run.startTimeLocal);
      const isTimeMatch = timeDiff < 60000;
      const isSameStats = Math.abs(ex.distance - run.distance) < 5000 && Math.abs(ex.duration - run.duration) < 10000;
      const isBuggyTimezoneMatch = isSameStats && timeDiff > 0 && timeDiff < 24 * 3600 * 1000;
      return isTimeMatch || isBuggyTimezoneMatch;
    });

    if (existingIndex === -1) {
      uniqueRuns.push(run);
    } else {
      // Merge best properties if it's a duplicate
      uniqueRuns[existingIndex] = {
        ...uniqueRuns[existingIndex],
        route: uniqueRuns[existingIndex].route || run.route || null,
        name: (uniqueRuns[existingIndex].name && !['Running Session', 'Sesi Lari', 'Morning Run', 'Afternoon Run', 'Evening Run', 'Night Run'].includes(uniqueRuns[existingIndex].name))
              ? uniqueRuns[existingIndex].name
              : (run.name || null)
      };
    }
  });

  return {
    running_activities: uniqueRuns,
    sleep_records: { ...existing.sleep_records, ...incoming.sleep_records },
    max_hr: Math.max(existing.max_hr || 0, incoming.max_hr || 0),
  };
};

// ──────────────────────────────────────────────
// GPX Parser
// ──────────────────────────────────────────────
export const parseGpxFile = async (file) => {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, "text/xml");
  
  const trkpts = Array.from(xml.querySelectorAll("trkpt"));
  if (!trkpts.length) throw new Error("Tidak ada data track point di file GPX ini.");

  const route = [];
  let distance = 0; // cm
  let duration = 0; // ms
  let maxHr = 0;
  let sumHr = 0;
  let hrCount = 0;

  const getDist = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // meters
    const p1 = lat1 * Math.PI/180;
    const p2 = lat2 * Math.PI/180;
    const dp = (lat2-lat1) * Math.PI/180;
    const dl = (lon2-lon1) * Math.PI/180;
    const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  };

  let startTimeLocal = null;
  let endTime = null;

  for (let i = 0; i < trkpts.length; i++) {
    const pt = trkpts[i];
    const lat = parseFloat(pt.getAttribute("lat"));
    const lon = parseFloat(pt.getAttribute("lon"));
    route.push({ lat, lon });

    const timeEl = pt.querySelector("time");
    if (timeEl) {
      const timeMs = new Date(timeEl.textContent).getTime();
      if (!startTimeLocal) startTimeLocal = timeMs;
      endTime = timeMs;
    }

    if (i > 0) {
      const prev = trkpts[i-1];
      distance += getDist(
        parseFloat(prev.getAttribute("lat")),
        parseFloat(prev.getAttribute("lon")),
        lat, lon
      );
    }

    const hrEl = pt.querySelector("hr");
    const tpxHr = pt.getElementsByTagNameNS("*", "hr")[0];
    const hrVal = hrEl ? parseInt(hrEl.textContent) : (tpxHr ? parseInt(tpxHr.textContent) : null);
    
    if (hrVal) {
      if (hrVal > maxHr) maxHr = hrVal;
      sumHr += hrVal;
      hrCount++;
    }
  }

  if (startTimeLocal && endTime) {
    duration = endTime - startTimeLocal;
  }

  // Downsample route to max 300 points to save localStorage space while keeping the shape
  const sampledRoute = [];
  const step = Math.max(1, Math.ceil(route.length / 300));
  for (let i = 0; i < route.length; i += step) {
    sampledRoute.push(route[i]);
  }
  if (route.length > 0 && sampledRoute[sampledRoute.length-1] !== route[route.length-1]) {
    sampledRoute.push(route[route.length-1]);
  }

  const act = {
    startTimeLocal: startTimeLocal || new Date().getTime(),
    distance: distance * 100, // meters to cm
    duration: duration,
    avgHr: hrCount > 0 ? Math.round(sumHr / hrCount) : null,
    maxHr: maxHr || null,
    activityType: 'running',
    name: file.name.replace(/\.gpx$/i, ''),
    route: sampledRoute,
  };

  return {
    running_activities: [act],
    sleep_records: {},
    max_hr: maxHr
  };
};

// ──────────────────────────────────────────────
// Polyline Decoder (for Strava)
// ──────────────────────────────────────────────
export const decodePolyline = (str, precision = 5) => {
  let index = 0, lat = 0, lng = 0, coordinates = [], shift = 0, result = 0, byte = null, latitude_change, longitude_change, factor = Math.pow(10, precision);
  while (index < str.length) {
    byte = null; shift = 0; result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = result = 0;
    do { byte = str.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += latitude_change; lng += longitude_change;
    coordinates.push({ lat: lat / factor, lon: lng / factor });
  }
  return coordinates;
};


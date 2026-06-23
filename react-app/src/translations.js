export const translations = {
  id: {
    // Common
    loading: "Memproses...",
    error: "Gagal",
    success: "Berhasil",
    
    // Landing Page
    signIn: "Masuk",
    signOut: "Keluar",
    getStarted: "Mulai Sekarang",
    heroTitleLine1: "Pelatih Pribadi Cerdas untuk",
    heroTitleLine2: "Pelari Data-Driven",
    syncsWithDevices: "Sinkronisasi Otomatis Dengan Jam Lari & Aplikasi Lo",
    heroSubtitle: "Berhenti lari asal berkeringat. Hubungkan Strava atau smartwatch Anda, dan biarkan AI kami merancang jadwal latihan personal berdasarkan kualitas tidur, pemulihan, serta target performa. Latihan lebih pintar, bukan lebih keras.",
    getStartedFree: "Mulai Gratis",
    learnMore: "Pelajari Lebih Lanjut",
    dashboardPreview: "Pratinjau Dashboard EnduraUP",
    weeklyMileage: "Jarak Mingguan",
    sleepScore: "Skor Tidur",
    excellentRecovery: "Pemulihan Sangat Baik",
    paceTarget: "Target Pace",
    easyRunZone: "Zona Lari Santai",
    fitnessProgress: "Kemajuan Kebugaran (Setara VO2 Max)",
    run: "Lari",
    sleep: "Tidur",
    smarterTraining: "Latih Tubuhmu Layaknya Atlet Pro",
    bentoSubtitle: "AI kami menganalisa kelelahanmu, bukan sekadar jarakmu. Alat lengkap untuk pelari yang serius tanpa ribet.",
    unifiedImportTitle: "Sinkronisasi Tanpa Ribet",
    unifiedImportDesc: "Satu klik dengan Strava, atau cukup unggah file dari Garmin, Apple, dan Coros. Kami yang mengubah jejak keringatmu menjadi insight tingkat tinggi.",
    racePredictorTitle: "Prediksi Hasil Race",
    racePredictorDesc: "Dapatkan perkiraan waktu finis yang akurat untuk 5K, 10K, Half Marathon, dan Full Marathon menggunakan rumus Pete Riegel berdasarkan statistik lari terbaru.",
    adaptiveCalendarTitle: "Jadwal Adaptif & Anti-Overtraining",
    adaptiveCalendarDesc: "Membangun pondasi kardio tak pernah semudah ini. Jadwal menyesuaikan hari luangmu secara dinamis dengan target pace yang terukur.",
    sleepCorrelationTitle: "AI Kesiapan & Pemulihan",
    sleepCorrelationDesc: "Aplikasi yang tahu kapan kamu harus nge-gas dan kapan harus rebahan. Cegah cedera dengan memetakan hubungan antara kualitas tidur dan beban larimu.",
    readyToRun: "Siap Berlari",
    builtForRunners: "Dibuat untuk pelari, oleh pelari.",
    dataSafe: "Data Anda aman bersama kami. Kami tidak membagikan atau menjual data latihan Anda.",

    // App Main & Sidebar
    activeAccount: "Akun Aktif",
    fillProfileName: "Isi nama profil...",
    userProfile: "Profil Pengguna",
    age: "Umur",
    mainGoal: "Goal Utama",
    programStyle: "Gaya Program",
    targetPace: "Target Pace (min/km)",
    trainingDays: "Hari Lari",
    applyAnalyze: "Terapkan & Analisis",
    importAddData: "Impor / Tambah Data",
    uploadAreaTitle: "Upload data lari / tidur",
    uploadAreaDesc: "Format: .zip, .gpx, .xlsx, .csv (maks 200MB)",
    downloadExcelTemplate: "Unduh template Excel/CSV",
    logout: "Keluar",

    // Goals & Program Styles
    maintenance: "Maintenance",
    improve5k: "Meningkatkan Waktu 5K",
    improve10k: "Meningkatkan Waktu 10K",
    improveHalf: "Meningkatkan Waktu Half Marathon",
    improveFull: "Meningkatkan Waktu Full Marathon",
    ngepush: "Ngepush",
    sedang: "Sedang",
    santai: "Santai",

    // Days
    daysShort: ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"],

    // Empty State
    welcome: "Selamat Datang",
    emptyDbDesc: "Database lokal masih kosong. Mulai dengan menambahkan data latihan atau tidur lo.",
    emptyStep1: "Upload data aktivitas (.zip / .gpx) untuk import riwayat latihan dan rute lo secara langsung.",
    emptyStep1Click: " (Klik di sini)",
    emptyStep2: "Impor via Excel / CSV untuk menambahkan riwayat aktivitas dan data tidur sekaligus.",
    emptyStep2Download: "Unduh template di sini",
    emptyStep2OrClick: " atau klik kotak ini untuk mengunggah file.",
    emptyStep3: "Atau input manual sesi lari & tidur atau set profil (umur, goal, target pace) melalui sidebar kiri.",

    // Tabs
    tabDashboard: "Dashboard",
    tabTrainingPlan: "Rencana Latihan",
    tabRacePrediction: "Race Prediction",
    tabRunHistory: "Aktivitas Harian",
    tabSleepAnalysis: "Analisis Tidur",

    // Dashboard Tab
    todayReadiness: "Kesiapan Lari Hari Ini",
    weeklyStats: "Statistik Minggu Ini",
    totalDistance: "Total Jarak",
    avgPace: "Rerata Pace",
    weeklySleepScore: "Skor Tidur Rerata",
    optimalTrainingZone: "Zona Latihan Optimal",
    recoveryTips: "Tips Pemulihan AI",
    tipsGoodSleep: "Tidur lo sangat baik! Tubuh lo siap untuk porsi latihan optimal hari ini.",
    tipsNeedRest: "Skor tidur lo agak rendah. Sebaiknya lakukan lari santai (easy run) atau istirahat total.",
    tipsBegadang: "Sangat kurang tidur! Prioritaskan istirahat hari ini untuk mencegah cedera dan menjaga jantung.",

    // Training Plan Tab
    generatedSchedule: "Jadwal Latihan Mingguan Anda",
    session: "Sesi",
    type: "Tipe",
    target: "Target",
    status: "Status",
    completed: "Selesai",
    pending: "Belum",
    restDay: "Hari Istirahat",
    easyRun: "Lari Santai",
    intervalRun: "Lari Interval",
    longRun: "Lari Jarak Jauh",
    recoveryRun: "Lari Pemulihan",

    // Race Prediction Tab
    calculatedPace: "Dihitung berdasarkan target pace lo dan formula Pete Riegel.",
    distance: "Jarak",
    estimatedTime: "Perkiraan Waktu",
    targetPaceLabel: "Pace Target",

    // Run History Tab
    activityName: "Nama Aktivitas",
    avgHr: "Avg HR",
    maxHr: "Max HR",
    noRunsYet: "Belum ada aktivitas yang tercatat.",

    // Sleep Analysis Tab
    sleepRecordsTitle: "Catatan Kualitas Tidur",
    noSleepRecords: "Belum ada data tidur yang diimpor.",
    sleepDuration: "Durasi Tidur",
    sleepQuality: "Kualitas Tidur",
    hoursShort: "jam",
    
    // Performance Card Export
    cardTitleSleep: "KUALITAS TIDUR",
    cardTitlePace: "TARGET PACE",
    cardTitleVO2: "ESTIMASI VO2 MAX",
    cardTitleRace: "PREDIKSI RACE",
    cardTitleTraining: "RENCANA LATIHAN",
  },
  en: {
    // Common
    loading: "Processing...",
    error: "Failed",
    success: "Success",

    // Landing Page
    signIn: "Sign In",
    signOut: "Sign Out",
    getStarted: "Get Started",
    heroTitleLine1: "The Smart Personal Coach for",
    heroTitleLine2: "Data-Driven Runners",
    syncsWithDevices: "Syncs Seamlessly With Your Sports Watch & Apps",
    heroSubtitle: "Stop running just to sweat. Connect Strava or your smartwatch, and let our AI design a personalized training plan based on your sleep quality, recovery, and performance goals. Train smarter, not harder.",
    getStartedFree: "Get Started Free",
    learnMore: "Learn More",
    dashboardPreview: "EnduraUP Dashboard Preview",
    weeklyMileage: "Weekly Mileage",
    sleepScore: "Sleep Score",
    excellentRecovery: "Excellent Recovery",
    paceTarget: "Pace Target",
    easyRunZone: "Easy Run Zone",
    fitnessProgress: "Fitness Progress (VO2 Max Equivalent)",
    run: "Run",
    sleep: "Sleep",
    smarterTraining: "Train Like a Pro Athlete",
    bentoSubtitle: "Our AI analyzes your fatigue, not just your mileage. A comprehensive tool for serious runners without the clutter.",
    unifiedImportTitle: "Frictionless Synchronization",
    unifiedImportDesc: "One click sync with Strava, or easily upload data from Garmin, Apple, and Coros. We turn your sweat into high-level sports science data.",
    racePredictorTitle: "Race Predictor",
    racePredictorDesc: "Get accurate estimated finishing times for 5K, 10K, Half, and Full Marathons, calculated via the Pete Riegel formula using your recent pacing statistics.",
    adaptiveCalendarTitle: "Adaptive & Anti-Overtraining",
    adaptiveCalendarDesc: "Building your cardio base has never been easier. Dynamic schedules adapt to your availability with precisely measured target paces.",
    sleepCorrelationTitle: "AI Readiness & Recovery",
    sleepCorrelationDesc: "An app that knows when you should push and when you should rest. Prevent injuries by mapping the relationship between sleep quality and running load.",
    readyToRun: "Ready to Run",
    builtForRunners: "Built for runners, by runners.",
    dataSafe: "Your data is safe with us. We do not share or sell your workout data.",

    // App Main & Sidebar
    activeAccount: "Active Account",
    fillProfileName: "Fill profile name...",
    userProfile: "User Profile",
    age: "Age",
    mainGoal: "Main Goal",
    programStyle: "Program Style",
    targetPace: "Target Pace (min/km)",
    trainingDays: "Running Days",
    applyAnalyze: "Apply & Analyze",
    importAddData: "Import / Add Data",
    uploadAreaTitle: "Upload run / sleep data",
    uploadAreaDesc: "Format: .zip, .gpx, .xlsx, .csv (max 200MB)",
    downloadExcelTemplate: "Download Excel/CSV template",
    logout: "Log Out",

    // Goals & Program Styles
    maintenance: "Maintenance",
    improve5k: "Improve 5K Time",
    improve10k: "Improve 10K Time",
    improveHalf: "Improve Half Marathon Time",
    improveFull: "Improve Full Marathon Time",
    ngepush: "Intensive",
    sedang: "Moderate",
    santai: "Light",

    // Days
    daysShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],

    // Empty State
    welcome: "Welcome",
    emptyDbDesc: "Local database is empty. Get started by adding your training or sleep data.",
    emptyStep1: "Upload activity data (.zip / .gpx) to import your training history and routes directly.",
    emptyStep1Click: " (Click here)",
    emptyStep2: "Import via Excel / CSV to add your activity history and sleep data at once.",
    emptyStep2Download: "Download template here",
    emptyStep2OrClick: " or click this box to upload your file.",
    emptyStep3: "Or manually input run & sleep sessions or set your profile (age, goal, target pace) in the left sidebar.",

    // Tabs
    tabDashboard: "Dashboard",
    tabTrainingPlan: "Training Plan",
    tabRacePrediction: "Race Prediction",
    tabRunHistory: "Daily Activities",
    tabSleepAnalysis: "Sleep Analysis",

    // Dashboard Tab
    todayReadiness: "Today's Run Readiness",
    weeklyStats: "Weekly Statistics",
    totalDistance: "Total Distance",
    avgPace: "Average Pace",
    weeklySleepScore: "Avg Sleep Score",
    optimalTrainingZone: "Optimal Training Zone",
    recoveryTips: "AI Recovery Insights",
    tipsGoodSleep: "Your sleep is excellent! Your body is ready for optimal training load today.",
    tipsNeedRest: "Your sleep score is slightly low. Consider an easy run or a complete rest day.",
    tipsBegadang: "Severely sleep deprived! Prioritize rest today to prevent injuries and protect your heart.",

    // Training Plan Tab
    generatedSchedule: "Your Weekly Training Schedule",
    session: "Session",
    type: "Type",
    target: "Target",
    status: "Status",
    completed: "Completed",
    pending: "Pending",
    restDay: "Rest Day",
    easyRun: "Easy Run",
    intervalRun: "Interval Run",
    longRun: "Long Run",
    recoveryRun: "Recovery Run",

    // Race Prediction Tab
    calculatedPace: "Calculated based on your target pace and the Pete Riegel formula.",
    distance: "Distance",
    estimatedTime: "Estimated Time",
    targetPaceLabel: "Target Pace",

    // Run History Tab
    activityName: "Activity Name",
    avgHr: "Avg HR",
    maxHr: "Max HR",
    noRunsYet: "No activities recorded yet.",

    // Sleep Analysis Tab
    sleepRecordsTitle: "Sleep Quality Records",
    noSleepRecords: "No sleep data imported yet.",
    sleepDuration: "Sleep Duration",
    sleepQuality: "Sleep Quality",
    hoursShort: "hours",

    // Performance Card Export
    cardTitleSleep: "SLEEP QUALITY",
    cardTitlePace: "TARGET PACE",
    cardTitleVO2: "ESTIMATED VO2 MAX",
    cardTitleRace: "RACE PREDICTIONS",
    cardTitleTraining: "TRAINING PLAN",
  }
};

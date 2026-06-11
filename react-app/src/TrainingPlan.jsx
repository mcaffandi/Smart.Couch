import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { buildTrainingPlan, buildAdaptiveCalendar, formatPace } from './utils';

const dayTranslations = {
  'Senin': 'Monday',
  'Selasa': 'Tuesday',
  'Rabu': 'Wednesday',
  'Kamis': 'Thursday',
  'Jumat': 'Friday',
  'Sabtu': 'Saturday',
  'Minggu': 'Sunday'
};

const typeTranslations = {
  'Rest / Stretching': 'Rest / Stretching',
  'Easy Run': 'Easy Run',
  'Easy Run (Fat Burn)': 'Easy Run (Fat Burn)',
  'Zone 2 Run': 'Zone 2 Run',
  'Zone 2 / MAF Run': 'Zone 2 / MAF Run',
  'Zone 2 Run (Hill/Tanjakan)': 'Zone 2 Run (Hills)',
  'MAF / Zone 2 Run': 'MAF / Zone 2 Run',
  'Steady Run': 'Steady Run',
  'Long Run': 'Long Run',
  'Long Base Run': 'Long Base Run',
  'Long MAF Run': 'Long MAF Run',
  'Interval / Tempo': 'Interval / Tempo',
  'HIIT Run': 'HIIT Run',
  'Recovery Jog': 'Recovery Jog',
  'Active Recovery': 'Active Recovery',
  'Total Rest': 'Total Rest',
  'Core & Leg Stabilizer': 'Core & Leg Stabilizer',
  'Yoga / Mobility': 'Yoga / Mobility',
  'Breathing / Relaksasi': 'Breathing / Relaxation'
};

const tujuanTranslations = {
  'Hari pemulihan total untuk pemulihan jaringan otot.': 'Total recovery day to rebuild muscle tissue.',
  'Sesi lari tunggal minggu ini: fokus menjaga kebugaran dasar.': 'Single run session this week: focus on maintaining baseline fitness.',
  'Lari pelan untuk menjaga detak jantung rendah (Base Building).': 'Slow run to keep heart rate low (Base Building).',
  'Lari intensitas rendah untuk konsistensi aerobik.': 'Low-intensity run for aerobic consistency.',
  'Adaptasi kapiler untuk efisiensi jantung.': 'Capillary adaptation for cardiac efficiency.',
  'Lari jarak jauh mingguan untuk stamina fisik.': 'Weekly long run for physical stamina.',
  'Melatih ketahanan otot jantung pada denyut rendah.': 'Training cardiac muscle endurance at low HR.',
  'Membangun volume lari aerobik dasar.': 'Building baseline aerobic volume.',
  'Volume aerobik rendah untuk menurunkan resting HR.': 'Low aerobic volume to lower resting HR.',
  'Melatih kapasitas paru-paru dan kecepatan kaki.': 'Training lung capacity and leg speed.',
  'Menguatkan otot kaki tanpa terlalu meledakkan HR.': 'Strengthening leg muscles without excessively spiking HR.',
  'Memicu metabolisme pembakaran kalori pasca-latihan.': 'Triggers post-exercise calorie-burning metabolism.',
  'Membangun ketahanan fisik jangka panjang.': 'Building long-term physical endurance.',
  'Adaptasi efisiensi metabolisme lemak dan jantung kuat.': 'Adapting fat metabolism efficiency and strengthening cardiac muscle.',
  'Volume aerobik dasar mingguan.': 'Weekly baseline aerobic volume.',
  'Meningkatkan ambang laktat jantung.': 'Improving cardiac lactate threshold.',
  'Membangun dasar paru-paru tanpa mengorbankan otot.': 'Building lung capacity baseline without sacrificing muscle.',
  'Sirkulasi darah ringan membantu pemulihan otot.': 'Light blood circulation to assist muscle recovery.',
  'Long run spesifik melatih daya tahan kaki.': 'Long run specifically to build leg endurance.',
  'Waktu di bawah tekanan untuk merendahkan resting HR.': 'Time under tension to lower resting HR.',
  'Membangun volume kardio mingguan.': 'Building weekly cardio volume.',
  'Fokus pernapasan (nasal breathing) di denyut rendah.': 'Nasal breathing focus at low HR.',
  'Melatih kecepatan dan VO2Max.': 'Training speed and VO2Max.',
  'Pemulihan aktif.': 'Active recovery.',
  'Meningkatkan stroke volume jantung.': 'Increasing cardiac stroke volume.',
  'Lari ringan menjaga ritme latihan.': 'Light run to maintain training rhythm.',
  'Ketahanan panjang untuk efisiensi pembakaran lemak.': 'Long-term endurance for fat-burning efficiency.',
  'Puncak ketahanan tubuh minggu ini.': 'Peak body endurance of the week.',
  'Jalan/jog ringan menjaga metabolisme tubuh.': 'Light walk/jog to maintain metabolism.',
  'Melatih otot inti (Plank/Bridge) dan engkel, TANPA squat/lunges berat.': 'Train core (Plank/Bridge) and ankle stability, WITHOUT heavy squats/lunges.',
  'Peregangan dinamis fokus pada pinggul, betis, dan peregangan hamstring.': 'Dynamic stretching focusing on hips, calves, and hamstrings.',
  'Latihan pernapasan perut (Nasal Breathing) untuk melatih kapasitas oksigen.': 'Belly breathing practice (Nasal Breathing) to build oxygen capacity.',
  'Jalan santai/bersepeda ringan untuk melancarkan sirkulasi darah tanpa beban.': 'Leisurely walk/light cycling to promote blood circulation without impact.',
  'Pemulihan pasif total. Fokus pada tidur berkualitas dan asupan protein.': 'Total passive recovery. Focus on quality sleep and protein intake.'
};

const getBadgeClass = (jenis) => {
  if (jenis.includes('Rest') || jenis.includes('Total')) return 'badge-rest';
  if (jenis.includes('Easy') || jenis.includes('Active') || jenis.includes('Walk') || jenis.includes('Zone 2') || jenis.includes('MAF')) return 'badge-easy';
  if (jenis.includes('Interval') || jenis.includes('HIIT') || jenis.includes('Tempo')) return 'badge-interval';
  if (jenis.includes('Long') || jenis.includes('Base Run')) return 'badge-long';
  if (jenis.includes('Core') || jenis.includes('Stabilizer') || jenis.includes('Yoga') || jenis.includes('Breathing') || jenis.includes('Mobility')) return 'badge-recovery';
  return 'badge-recovery';
};

export default function TrainingPlan({ activities, programStyle, goal, paces, latestSleepScore, actualBestPace, targetPace, selectedDays, gender, weight, height, age, lang = 'id', onLogManualActivity, onDeleteManualActivity, planOverrides = {}, onUpdatePlanOverrides }) {
  const [isPaused, setIsPaused] = useState(() => localStorage.getItem('smartcoach_paused') === 'true');
  const [isAdaptiveActive, setIsAdaptiveActive] = useState(() => localStorage.getItem('smartcoach_adaptive') === 'true');
  const [showLogModal, setShowLogModal] = useState(false);
  const [logData, setLogData] = useState({ date: null, type: '', duration: 30 });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editDayData, setEditDayData] = useState(null);

  useEffect(() => {
    setTimeout(() => {
      const el = document.getElementById('today-card');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 300);
  }, []);

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    localStorage.setItem('smartcoach_paused', newState.toString());
  };

  const toggleAdaptiveAI = () => {
    const newState = !isAdaptiveActive;
    setIsAdaptiveActive(newState);
    localStorage.setItem('smartcoach_adaptive', newState.toString());
  };

  const handleDayClick = (dItem) => {
    if (dItem.isPast === false && !dItem.isToday) return; // Don't click future
    
    if (dItem.hasRun) {
      if (dItem.isManualRun) {
        if (confirm(lang === 'id' ? 'Hapus catatan aktivitas manual di hari ini?' : 'Delete manual activity log for this day?')) {
          if (onDeleteManualActivity) onDeleteManualActivity(dItem.date);
        }
      } else {
        // Can't delete Strava activity
        alert(lang === 'id' ? 'Aktivitas ini dari Strava dan tidak bisa dihapus manual dari kalender.' : 'This activity is from Strava and cannot be deleted manually.');
      }
    } else {
      const defaultVal = getJenis(dItem.workout.jenis);
      setLogData({
        date: dItem.date,
        type: defaultVal,
        duration: 30
      });
      setShowLogModal(true);
    }
  };

  const plan = buildTrainingPlan(programStyle, goal, paces, selectedDays);
  const adaptiveCalendar = buildAdaptiveCalendar(plan, activities, isPaused, isAdaptiveActive, planOverrides);
  const todayIdx = adaptiveCalendar.findIndex(d => d.isToday) !== -1 ? adaptiveCalendar.findIndex(d => d.isToday) : 7;
  const next7Days = adaptiveCalendar.slice(todayIdx, todayIdx + 7);

  const getHRForZone = (minPct, maxPct) => {
    if (!age) return null;
    const maxHR = 211 - (0.64 * age);
    return `${Math.round(maxHR * minPct)}–${Math.round(maxHR * maxPct)} BPM`;
  };

  // Gap between current ability and target
  const gapPct = actualBestPace && targetPace
    ? ((actualBestPace - targetPace) / actualBestPace) * 100
    : 0;
  const showSyncBanner = actualBestPace && gapPct > 5; // >5% gap = worth showing

  const smartAlert = () => {
    if (latestSleepScore === null) return null;
    if (latestSleepScore < 60) return (
      <div className="alert alert-danger" style={{ marginBottom: 18 }}>
        {lang === 'id' ? (
          <>
            <strong>Kondisi Drop:</strong> Skor tidur lo {latestSleepScore} - tidur kurang. Kalau jadwal hari ini interval atau tempo, <strong>sangat disarankan ganti ke Easy Run atau Rest</strong> untuk cegah cedera.
          </>
        ) : (
          <>
            <strong>Poor Sleep:</strong> Your sleep score is {latestSleepScore} - insufficient rest. If today's scheduled run is an interval or tempo, <strong>it is highly recommended to switch to an Easy Run atau Rest</strong> to prevent injury.
          </>
        )}
      </div>
    );
    if (latestSleepScore < 80) return (
      <div className="alert alert-warning" style={{ marginBottom: 18 }}>
        {lang === 'id' ? (
          <>
            <strong>Kondisi Sedang:</strong> Tidur lo cukup tapi belum optimal (skor {latestSleepScore}). Jalankan latihan sesuai jadwal, tapi jangan dipaksain sampai batas.
          </>
        ) : (
          <>
            <strong>Fair Sleep:</strong> Your sleep is decent but not optimal (score {latestSleepScore}). Stick to the schedule, but avoid pushing to the absolute limit.
          </>
        )}
      </div>
    );
    return (
      <div className="alert alert-success" style={{ marginBottom: 18 }}>
        {lang === 'id' ? (
          <>
            <strong>Kondisi Prima:</strong> Tidur lo sangat baik (skor {latestSleepScore}). Tubuh dalam kondisi prime - waktu ideal untuk push intensitas tinggi.
          </>
        ) : (
          <>
            <strong>Prime Condition:</strong> Your sleep is excellent (score {latestSleepScore}). Your body is in prime shape - an ideal time to push high-intensity training.
          </>
        )}
      </div>
    );
  };

  // ── Consistency Logic ──
  const planRunDays = plan.filter(p => p.jenis.includes('Run') || p.jenis.includes('Interval') || p.jenis.includes('HIIT') || p.jenis.includes('Jog') || p.jenis.includes('Tempo')).length;
  const targetWeeklyRuns = planRunDays > 0 ? planRunDays : (selectedDays?.length || 3);
  
  const now = new Date();
  const last7DaysRuns = (activities || []).filter(a => {
    if (!a.startTimeLocal) return false;
    const d = new Date(a.startTimeLocal);
    const diffDays = (now - d) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7 && (a.distance > 0 || a.duration > 0);
  }).length;

  const consistencyScore = Math.min(100, Math.round((last7DaysRuns / Math.max(1, targetWeeklyRuns)) * 100));
  
  // Weekly Streak Calculation
  let streakWeeks = 0;
  const weeksMap = {};
  const msInWeek = 7 * 24 * 60 * 60 * 1000;
  (activities || []).forEach(a => {
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
    while (weeksMap[w] > 0) { streakWeeks++; w++; }
  } else if (weeksMap[1] > 0) {
    // Hasn't run this week yet, but streak from last week is still alive
    w = 1;
    while (weeksMap[w] > 0) { streakWeeks++; w++; }
  }

  let consistencyMsg = '';
  let consistencyColor = '';
  if (consistencyScore >= 100) {
    consistencyMsg = lang === 'id' ? 'Luar biasa! Konsisten 100%' : 'Outstanding! 100% Consistent';
    consistencyColor = '#10b981'; // green
  } else if (consistencyScore >= 50) {
    consistencyMsg = lang === 'id' ? 'On track, selesaikan sisa minggu ini!' : 'On track, finish the week!';
    consistencyColor = '#f59e0b'; // yellow/amber
  } else if (consistencyScore > 0) {
    consistencyMsg = lang === 'id' ? 'Bolong-bolong nih jadwalnya, ayo kejar!' : 'Falling behind, time to catch up!';
    consistencyColor = '#f97316'; // orange
  } else {
    consistencyMsg = lang === 'id' ? 'Belum lari sama sekali minggu ini' : 'No runs yet this week';
    consistencyColor = '#fb7185'; // red
  }


  const handleExportICS = () => {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);

    const weekDaysMap = { 
      'Senin': 0, 'Selasa': 1, 'Rabu': 2, 'Kamis': 3, 'Jumat': 4, 'Sabtu': 5, 'Minggu': 6,
      'Monday': 0, 'Tuesday': 1, 'Wednesday': 2, 'Thursday': 3, 'Friday': 4, 'Saturday': 5, 'Sunday': 6
    };
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EnduraUP//Training Plan//EN\n";

    plan.forEach((session) => {
      if (!session || !session.jenis) return;
      const offset = weekDaysMap[session.hari] !== undefined ? weekDaysMap[session.hari] : 0;
      const sessionDate = new Date(monday);
      sessionDate.setDate(monday.getDate() + offset);

      if (sessionDate < new Date(today.setHours(0,0,0,0))) {
        sessionDate.setDate(sessionDate.getDate() + 7);
      }

      const dateStr = sessionDate.toISOString().split('T')[0].replace(/-/g, '');
      icsContent += "BEGIN:VEVENT\n";
      icsContent += `DTSTART;VALUE=DATE:${dateStr}\n`;
      icsContent += `DTEND;VALUE=DATE:${dateStr}\n`;
      icsContent += `RRULE:FREQ=WEEKLY;COUNT=12\n`;
      icsContent += `SUMMARY:🏃 ${getJenis(session.jenis)}\n`;
      icsContent += `DESCRIPTION:${lang === 'id' ? 'Durasi/Intensitas' : 'Duration/Intensity'}: ${getDurasi(session.durasi)}\\n\\n${lang === 'id' ? 'Tujuan' : 'Purpose'}: ${getTujuan(session.tujuan)}\n`;
      icsContent += "END:VEVENT\n";
    });
    icsContent += "END:VCALENDAR";

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `EnduraUP_Plan.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getHari = (day) => lang === 'id' ? day : (dayTranslations[day] || day);
  const getJenis = (type) => lang === 'id' ? type : (typeTranslations[type] || type);
  const getTujuan = (purpose) => lang === 'id' ? purpose : (tujuanTranslations[purpose] || purpose);
  const getDurasi = (dur) => {
    if (!dur) return '–';
    if (lang === 'id') return dur;
    return dur
      .replace(/menit/gi, 'minutes')
      .replace(/Santai/gi, 'Easy')
      .replace(/Sedang/gi, 'Moderate')
      .replace(/Ngepush/gi, 'Push')
      .replace(/Bodyweight/gi, 'Bodyweight')
      .replace(/Matras/gi, 'Mat')
      .replace(/Fokus Pernapasan/gi, 'Breathing Focus')
      .replace(/Jalan Kaki/gi, 'Walking');
  };

  const guides = {
    title: lang === 'id' ? 'Panduan Cross-Training (Core, Yoga, Breathing)' : 'Cross-Training Guide (Core, Yoga, Breathing)',
    coreTitle: lang === 'id' ? '1. Core & Leg Stabilizer (Tanpa Squat / Lunges)' : '1. Core & Leg Stabilizer (No Squats / Lunges)',
    coreDesc: lang === 'id' ? 'Fokus stabilitas pinggul, gluteus, & engkel. 100% bodyweight. Lakukan 3 set x 10-15 repetisi.' : 'Focus on hip, glutes, & ankle stability. 100% bodyweight. Perform 3 sets x 10-15 reps.',
    coreList: lang === 'id' ? [
      { name: 'Glute Bridges', desc: 'Rebahan, tekuk lutut, angkat pinggul sejajar paha. Tahan pantat 2 detik di atas. (Fokus Hamstring & Bokong)' },
      { name: 'Clamshells', desc: 'Tidur miring, lutut tekuk 90°. Buka lutut atas perlahan tanpa goyang pinggul. (Cegah lutut masuk ke dalam)' },
      { name: 'Donkey Kicks', desc: 'Posisi merangkak, tendang satu tumit ke arah langit-langit. Kunci punggung agar tidak melengkung. (Sangat efektif untuk Gluteus/Bokong)' },
      { name: 'Fire Hydrants', desc: 'Posisi merangkak, angkat lutut ke arah samping luar. (Membuka mobilitas persendian pinggul)' },
      { name: 'Calf Raises (Jinjit)', desc: 'Jinjit perlahan lalu turun perlahan di ujung anak tangga. (Mencegah cedera tulang kering / Shin Splints)' }
    ] : [
      { name: 'Glute Bridges', desc: 'Lie on your back, bend knees, lift hips level with thighs. Hold for 2 seconds at the top. (Hamstrings & Glutes focus)' },
      { name: 'Clamshells', desc: 'Lie on side, knees bent 90°. Open top knee slowly without turning hips. (Prevents knee caving)' },
      { name: 'Donkey Kicks', desc: 'On all fours, kick one heel up towards the ceiling. Keep back flat. (Highly effective for Gluteus/Buttocks)' },
      { name: 'Fire Hydrants', desc: 'On all fours, lift knee out to the side. (Opens hip joint mobility)' },
      { name: 'Calf Raises', desc: 'Rise slowly on toes, lower down below stair edge. (Prevents shin splints / Achilles injury)' }
    ],
    yogaTitle: lang === 'id' ? '2. Yoga / Mobility Matras' : '2. Yoga / Mat Mobility',
    yogaDesc: lang === 'id' ? 'Fokus memanjangkan otot yang tegang dan membuka mobilitas pinggul. Tahan pose 30-45 detik.' : 'Focus on lengthening tight muscles and opening hip mobility. Hold pose for 30-45 seconds.',
    yogaList: lang === 'id' ? [
      { name: 'Downward Dog', desc: 'Tangan & kaki di lantai (V terbalik). Tarik tumit ke lantai untuk peregangan achilles.' },
      { name: 'Pigeon Pose', desc: 'Lipat satu kaki di depan matras, kaki belakang lurus. Sangat ampuh untuk otot bokong/piriformis.' },
      { name: 'Cat-Cow', desc: 'Posisi merangkak. Lengkungkan punggung ke atas, lalu tekuk ke bawah. Melumasi tulang belakang.' }
    ] : [
      { name: 'Downward Dog', desc: 'Hands & feet on floor (inverted V). Draw heels to floor for Achilles stretch.' },
      { name: 'Pigeon Pose', desc: 'Fold one leg in front on the mat, back leg straight. Extremely effective for glutes/piriformis.' },
      { name: 'Cat-Cow', desc: 'On all fours. Arch spine up, then flex down. Lubricates the spine.' }
    ],
    breathTitle: lang === 'id' ? '3. Breathing & Relaksasi' : '3. Breathing & Relaxation',
    breathDesc: lang === 'id' ? 'Fokus melatih kapasitas oksigen dan menurunkan resting heart rate secara pasif.' : 'Focus on training oxygen capacity and lowering resting heart rate passively.',
    breathList: lang === 'id' ? [
      { name: 'Box Breathing (4-4-4-4)', desc: 'Tarik napas 4 detik, tahan 4d, buang 4d, tahan 4d (tanpa napas). Ulangi 5-10 menit.' },
      { name: 'Strict Nasal Breathing', desc: 'Lakukan pernapasan hanya menggunakan hidung (tarik & buang).' },
      { name: 'Diaphragmatic', desc: 'Saat napas ditarik, perut harus membesar seperti balon (bukan dada yang membusung).' }
    ] : [
      { name: 'Box Breathing (4-4-4-4)', desc: 'Inhale 4s, hold 4s, exhale 4s, hold 4s. Repeat for 5-10 minutes.' },
      { name: 'Strict Nasal Breathing', desc: 'Breathe strictly through your nose (inhale & exhale).' },
      { name: 'Diaphragmatic', desc: 'As you inhale, expand your belly like a balloon (not swelling the chest).' }
    ],
    recommendTitle: lang === 'id' ? 'Rekomendasi:' : 'Recommendation:',
    recommendDesc: lang === 'id' ? 'Konsistensi lebih penting dari durasi. Lakukan rutinitas ini di hari "Rest" dengan intensitas ringan agar otot siap untuk jadwal lari berikutnya.' : 'Consistency is more important than duration. Perform this routine on "Rest" days at low intensity to prep muscles for the next run.'
  };

  return (
    <div className="animate-fade-in">
      {smartAlert()}

      {/* Consistency Banner */}
      <div style={{
        background: `linear-gradient(135deg, ${consistencyColor}15, var(--bg-card))`,
        border: `1px solid ${consistencyColor}40`,
        borderRadius: 14, padding: '16px 20px', marginBottom: 20,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            position: 'relative', width: 48, height: 48, display: 'flex',
            alignItems: 'center', justifyContent: 'center', flexShrink: 0
          }}>
            <svg width="48" height="48" viewBox="0 0 36 36" style={{ position: 'absolute' }}>
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--border)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={consistencyColor} strokeWidth="3" strokeDasharray={`${consistencyScore}, 100`} />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-primary)' }}>{consistencyScore}%</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {lang === 'id' ? 'Konsistensi 7 Hari' : '7-Day Consistency'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              {consistencyMsg}
            </div>
          </div>
        </div>
        
        {/* Streak Badge */}
        {streakWeeks >= 1 && (
          <div style={{
            background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.3)',
            padding: '6px 12px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 6,
            color: '#f97316', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
            </svg>
            {streakWeeks} {lang === 'id' ? 'Minggu Streak' : 'Week Streak'}
          </div>
        )}
      </div>

      <div className="training-header-controls" style={{ marginBottom: 16 }}>


        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={toggleAdaptiveAI}
            style={{
              background: isAdaptiveActive ? 'var(--accent-purple)' : 'var(--bg-card)',
              color: isAdaptiveActive ? '#fff' : 'var(--text-primary)',
              border: `1px solid ${isAdaptiveActive ? 'var(--accent-purple)' : 'var(--border)'}`,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              transition: 'all 0.2s ease'
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill={isAdaptiveActive ? "currentColor" : "none"} fillOpacity={isAdaptiveActive ? "1" : "0"}/>
            </svg>
            {isAdaptiveActive ? 'Adaptive AI: ON' : 'Adaptive AI: OFF'}
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={togglePause}
            style={{
              background: isPaused ? 'rgba(251,113,133,0.1)' : 'var(--bg-card)', 
              color: isPaused ? '#fb7185' : 'var(--text-primary)', 
              border: `1px solid ${isPaused ? 'rgba(251,113,133,0.3)' : 'var(--border)'}`,
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.2s'
            }}
          >
            {isPaused ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                {lang === 'id' ? 'Resume Plan' : 'Resume Plan'}
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                {lang === 'id' ? 'Pause Plan' : 'Pause Plan'}
              </>
            )}
          </button>
          
          <button
          onClick={handleExportICS}
          style={{
            background: 'var(--accent-purple)', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            boxShadow: '0 4px 12px rgba(139,92,246,0.25)', transition: 'transform 0.1s'
          }}
          onMouseDown={e => e.currentTarget.style.transform = 'scale(0.96)'}
          onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          {lang === 'id' ? 'Export ke Calendar' : 'Export to Calendar'}
        </button>
        </div>
      </div>

      {/* Sync banner: actual vs target pace */}
      {showSyncBanner && (
        <div className="alert alert-warning" style={{
          padding: '14px 16px', marginBottom: 18,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--alert-warning-text)', marginBottom: 4 }}>{lang === 'id' ? 'SINKRONISASI DATA' : 'DATA SYNCHRONIZATION'}</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              {lang === 'id' ? (
                <>
                  Pace terbaik lo dari data: <strong style={{ color: 'var(--text-primary)' }}>{formatPace(actualBestPace)} min/km</strong>
                  {' '}· Target lo: <strong style={{ color: '#818cf8' }}>{formatPace(targetPace)} min/km</strong>
                  <br />
                  Rencana latihan ini dirancang untuk membawa lo dari kemampuan saat ini menuju target tersebut.
                  Zone Ngepush / Sedang / Santai di bawah mengacu pada <strong>target pace</strong> lo.
                </>
              ) : (
                <>
                  Your best pace from data: <strong style={{ color: 'var(--text-primary)' }}>{formatPace(actualBestPace)} min/km</strong>
                  {' '}· Your target: <strong style={{ color: '#818cf8' }}>{formatPace(targetPace)} min/km</strong>
                  <br />
                  This training plan is designed to help you reach that target from your current fitness level.
                  The Push / Moderate / Easy zones below refer to your <strong>target pace</strong>.
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {!targetPace && (
        <div className="alert alert-info" style={{ marginBottom: 18, borderLeft: '4px solid #0ea5e9', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: '#0ea5e9', marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4, color: '#0369a1' }}>
              {lang === 'id' ? 'Target Pace Belum Diatur' : 'Target Pace Not Set'}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {lang === 'id' 
                ? 'Rekomendasi pace saat ini masih kosong. Silakan lengkapi Target Pace pada menu Edit Profil agar sistem dapat mengkalkulasi zona latihan.'
                : 'Pace recommendations are currently empty. Please set your Target Pace in Edit Profile so the system can calculate your training zones.'}
            </div>
          </div>
        </div>
      )}

      <div className="pace-grid" style={{ marginBottom: 20 }}>
        <div className="pace-card" style={{ background: 'var(--alert-danger-bg)', border: '1px solid var(--alert-danger-border)', padding: '12px' }}>
          <div className="pace-label" style={{ color: 'var(--alert-danger-text)' }}>{lang === 'id' ? 'Ngepush' : 'Push'}</div>
          <div className="pace-value" style={{ fontSize: '15px' }}>{paces.ngepush}</div>
          <div className="pace-unit" style={{ fontSize: '10px' }}>min/km</div>
          {age && <div style={{ fontSize: 10, color: 'var(--alert-danger-text)', marginTop: 2, fontWeight: 600 }}>HR {getHRForZone(0.8, 0.9)}</div>}
        </div>
        <div className="pace-card" style={{ background: 'var(--alert-info-bg)', border: '1px solid var(--alert-info-border)', padding: '12px' }}>
          <div className="pace-label" style={{ color: 'var(--alert-info-text)' }}>{lang === 'id' ? 'Sedang' : 'Moderate'}</div>
          <div className="pace-value" style={{ fontSize: '15px' }}>{paces.sedang}</div>
          <div className="pace-unit" style={{ fontSize: '10px' }}>min/km</div>
          {age && <div style={{ fontSize: 10, color: 'var(--alert-info-text)', marginTop: 2, fontWeight: 600 }}>HR {getHRForZone(0.7, 0.8)}</div>}
        </div>
        <div className="pace-card" style={{ background: 'var(--alert-success-bg)', border: '1px solid var(--alert-success-border)', padding: '12px' }}>
          <div className="pace-label" style={{ color: 'var(--alert-success-text)' }}>{lang === 'id' ? 'Santai' : 'Easy'}</div>
          <div className="pace-value" style={{ fontSize: '15px' }}>{paces.santai}</div>
          <div className="pace-unit" style={{ fontSize: '10px' }}>min/km</div>
          {age && <div style={{ fontSize: 10, color: 'var(--alert-success-text)', marginTop: 2, fontWeight: 600 }}>HR {getHRForZone(0.6, 0.7)}</div>}
        </div>
      </div>

      {/* ── ADAPTIVE CALENDAR TIMELINE VIEW ── */}
      {(() => {
        const chunkedWeeks = [];
        let currentWeek = [];
        adaptiveCalendar.forEach(day => {
          currentWeek.push(day);
          if (currentWeek.length === 7) {
            chunkedWeeks.push(currentWeek);
            currentWeek = [];
          }
        });
        if (currentWeek.length > 0) chunkedWeeks.push(currentWeek);

        const todayWeekIdx = chunkedWeeks.findIndex(w => w.some(d => d.isToday));
        // Tampilkan dari minggu ini hingga 3 minggu ke depan (total 4 minggu)
        const displayWeeks = chunkedWeeks.slice(Math.max(0, todayWeekIdx), Math.max(0, todayWeekIdx) + 4);

        return (
          <div className="weekly-timeline-container" style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 30 }}>
            {displayWeeks.map((week, wIdx) => {
              if(week.length === 0) return null;

              const startDate = new Date(week[0].date);
              const endDate = new Date(week[week.length-1].date);
              const dateRangeStr = `${startDate.getDate()} ${startDate.toLocaleDateString(lang==='id'?'id-ID':'en-US', {month:'short'})} - ${endDate.getDate()} ${endDate.toLocaleDateString(lang==='id'?'id-ID':'en-US', {month:'short'})}`;

              const numRuns = week.filter(d => {
                const type = (d.workout.jenis || '').toLowerCase();
                return type.includes('run') || type.includes('interval') || type.includes('jog') || type.includes('tempo') || type.includes('hiit');
              }).length;

              return (
                <div key={wIdx} className="week-block" style={{ background: 'var(--bg-surface)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border)' }}>
                  
                  {/* Week Header */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{dateRangeStr}</span>
                        <span style={{ background: 'var(--bg-card)', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)' }}>
                          WEEK {todayWeekIdx + wIdx + 1}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                        Total: {numRuns} {lang === 'id' ? 'Sesi Lari' : 'Runs'}
                      </div>
                    </div>
                  </div>

                  {/* Days List (Grid Squares) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, padding: '16px 20px' }}>
                    {week.map((dItem, dIdx) => {
                       const dObj = new Date(dItem.date);
                       const dayName = dObj.toLocaleDateString(lang==='id'?'id-ID':'en-US', {weekday:'short'}).toUpperCase();
                       const dateNum = dObj.getDate();

                       const isRest = dItem.workout.jenis.includes('Rest') || dItem.workout.jenis.includes('Total');
                       const isCompleted = dItem.hasRun;
                       
                       let colorVar = 'var(--text-muted)';
                       if (dItem.workout.jenis.includes('Interval') || dItem.workout.jenis.includes('Tempo') || dItem.workout.jenis.includes('HIIT')) colorVar = '#f97316';
                       else if (dItem.workout.jenis.includes('Easy') || dItem.workout.jenis.includes('Jog') || dItem.workout.jenis.includes('Zone 2') || dItem.workout.jenis.includes('MAF')) colorVar = '#38bdf8';
                       else if (dItem.workout.jenis.includes('Long') || dItem.workout.jenis.includes('Base Run')) colorVar = '#818cf8';
                       else if (!isRest) colorVar = '#34d399';
                       
                       return (
                         <div id={dItem.isToday ? 'today-card' : ''} key={dIdx} onClick={() => handleDayClick(dItem)} style={{ minHeight: 130, background: 'var(--bg-card)', borderRadius: 12, padding: '14px 12px', border: dItem.isToday ? '2px solid var(--accent-purple)' : '1px solid var(--border)', cursor: 'pointer', opacity: dItem.isPast && !dItem.isToday ? 0.6 : 1, transition: 'transform 0.15s, background 0.15s', display: 'flex', flexDirection: 'column' }} onMouseEnter={e => { if(!dItem.isPast) e.currentTarget.style.background = 'var(--bg-card-hover)'; e.currentTarget.style.transform = 'translateY(-2px)'}} onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.transform = 'translateY(0)'}}>
                           
                           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                             <div>
                               <div style={{ fontSize: 11, fontWeight: 700, color: dItem.isToday ? 'var(--accent-purple)' : 'var(--text-muted)' }}>{dayName}</div>
                               <div style={{ fontSize: 20, fontWeight: 800, color: dItem.isToday ? 'var(--accent-purple)' : 'var(--text-primary)' }}>{dateNum}</div>
                             </div>
                             {isCompleted && (
                               <div style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                 <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                               </div>
                             )}
                           </div>

                           <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                             {isRest ? (
                               <div style={{ color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                 <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                 {lang === 'id' ? 'Add (Rest)' : 'Add (Rest)'}
                               </div>
                             ) : (
                               <div style={{ borderLeft: `4px solid ${colorVar}`, paddingLeft: 10 }}>
                                 <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.3 }}>
                                   {getJenis(dItem.workout.jenis)}
                                 </div>
                                 <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                   {getDurasi(dItem.workout.durasi)}
                                 </div>
                               </div>
                             )}
                           </div>
                         </div>
                       );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      <details style={{ marginTop: 20 }}>
        <summary style={{
          cursor: 'pointer', padding: '12px 16px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10, fontSize: 13,
          fontWeight: 600, color: 'var(--text-secondary)', userSelect: 'none',
          transition: 'all 0.2s', outline: 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
            {guides.title}
          </div>
        </summary>
        <div style={{
          marginTop: 8, padding: '18px 20px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 24
        }}>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8 }}>{guides.coreTitle}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              {guides.coreDesc}
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              {guides.coreList.map((item, idx) => (
                <li key={idx}><strong style={{color: 'var(--text-primary)'}}>{item.name}:</strong> {item.desc}</li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>{guides.yogaTitle}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              {guides.yogaDesc}
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              {guides.yogaList.map((item, idx) => (
                <li key={idx}><strong style={{color: 'var(--text-primary)'}}>{item.name}:</strong> {item.desc}</li>
              ))}
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>{guides.breathTitle}</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              {guides.breathDesc}
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              {guides.breathList.map((item, idx) => (
                <li key={idx}><strong style={{color: 'var(--text-primary)'}}>{item.name}:</strong> {item.desc}</li>
              ))}
            </ul>
          </div>
          <div className="alert alert-info" style={{ marginTop: 4 }}>
            <strong>{guides.recommendTitle}</strong> {guides.recommendDesc}
          </div>
        </div>
      </details>

      {/* Manual Log Modal */}
      {showLogModal && createPortal(
        <div className="profile-modal-backdrop" onClick={() => setShowLogModal(false)} style={{ zIndex: 99999 }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
            style={{ 
              maxWidth: 400, width: '100%', background: 'var(--bg-surface)', 
              borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: 'var(--shadow-premium)', border: '1px solid var(--border)'
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
                {lang === 'id' ? 'Tandai Selesai' : 'Mark as Done'}
              </h2>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, padding: 0 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div className="form-group" style={{ marginBottom: 16 }}>
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{lang === 'id' ? 'Jenis Aktivitas' : 'Activity Type'}</label>
                <select 
                  className="form-input" 
                  value={['Easy Run', 'Interval / Tempo', 'Long Run', 'Recovery Jog', 'Core & Leg Stabilizer', 'Yoga / Mobility', 'Jalan Kaki', 'Berenang', 'Sepeda'].includes(logData.type) ? logData.type : 'Lainnya'}
                  onChange={e => setLogData({ ...logData, type: e.target.value === 'Lainnya' ? '' : e.target.value })}
                  style={{ marginBottom: ['Easy Run', 'Interval / Tempo', 'Long Run', 'Recovery Jog', 'Core & Leg Stabilizer', 'Yoga / Mobility', 'Jalan Kaki', 'Berenang', 'Sepeda'].includes(logData.type) ? 0 : 8 }}
                >
                  {/* Keep the original scheduled workout as the first option if it's not in the common list but was auto-populated */}
                  {!['Easy Run', 'Interval / Tempo', 'Long Run', 'Recovery Jog', 'Core & Leg Stabilizer', 'Yoga / Mobility', 'Jalan Kaki', 'Berenang', 'Sepeda', ''].includes(logData.type) && logData.type !== 'Lainnya' && (
                    <option value="Lainnya">{logData.type} (Jadwal)</option>
                  )}
                  <option value="Easy Run">Easy Run</option>
                  <option value="Interval / Tempo">Interval / Tempo</option>
                  <option value="Long Run">Long Run</option>
                  <option value="Recovery Jog">Recovery Jog</option>
                  <option value="Core & Leg Stabilizer">Core & Leg Stabilizer</option>
                  <option value="Yoga / Mobility">Yoga / Mobility</option>
                  <option value="Jalan Kaki">Jalan Kaki</option>
                  <option value="Berenang">Berenang</option>
                  <option value="Sepeda">Sepeda</option>
                  <option value="Lainnya">{lang === 'id' ? 'Lainnya...' : 'Other...'}</option>
                </select>
                
                {!['Easy Run', 'Interval / Tempo', 'Long Run', 'Recovery Jog', 'Core & Leg Stabilizer', 'Yoga / Mobility', 'Jalan Kaki', 'Berenang', 'Sepeda'].includes(logData.type) && (
                  <input 
                    type="text" 
                    className="form-input animate-scale-in" 
                    value={logData.type}
                    onChange={e => setLogData({ ...logData, type: e.target.value })}
                    placeholder={lang === 'id' ? 'Ketik nama aktivitas...' : 'Type activity name...'}
                  />
                )}
              </div>
              <div className="form-group" style={{ marginBottom: 24 }}>
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>{lang === 'id' ? 'Durasi (menit)' : 'Duration (minutes)'}</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={logData.duration}
                  onChange={e => setLogData({ ...logData, duration: parseInt(e.target.value) || 0 })}
                  min="1"
                />
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => setShowLogModal(false)}
                >
                  {lang === 'id' ? 'Batal' : 'Cancel'}
                </button>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    const finalType = logData.type.trim() || 'Custom Activity';
                    if (onLogManualActivity) onLogManualActivity(logData.date, finalType, logData.duration);
                    setShowLogModal(false);
                  }}
                >
                  {lang === 'id' ? 'Simpan' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}
      
      {/* ── EDIT SCHEDULE MODAL ── */}
      {showEditModal && editDayData && createPortal(
        <div className="modal-overlay" style={{ zIndex: 9999 }} onClick={() => setShowEditModal(false)}>
          <div className="modal-content animate-scale-in" style={{ padding: '24px', maxWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{lang === 'id' ? 'Ganti Jadwal' : 'Change Schedule'}</h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              {lang === 'id' ? `Mau ganti latihan untuk tanggal ${editDayData.date}?` : `Want to change the workout for ${editDayData.date}?`}
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              <button className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'flex-start' }} onClick={() => {
                if (onUpdatePlanOverrides) {
                  const newO = { ...planOverrides, [editDayData.date]: { jenis: 'Core & Leg Stabilizer', durasi: '15-20 menit - Bodyweight', tujuan: 'Melatih otot inti (Plank/Bridge) dan engkel, TANPA squat/lunges berat.' } };
                  onUpdatePlanOverrides(newO);
                }
                setShowEditModal(false);
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, color: 'var(--accent-emerald)' }}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                Core & Leg Stabilizer
              </button>
              
              <button className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'flex-start' }} onClick={() => {
                if (onUpdatePlanOverrides) {
                  const newO = { ...planOverrides, [editDayData.date]: { jenis: 'Yoga / Mobility', durasi: '20-30 menit - Matras', tujuan: 'Peregangan dinamis fokus pada pinggul, betis, dan peregangan hamstring.' } };
                  onUpdatePlanOverrides(newO);
                }
                setShowEditModal(false);
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, color: 'var(--accent-sky)' }}><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>
                Yoga / Mobility
              </button>

              <button className="btn" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)', justifyContent: 'flex-start' }} onClick={() => {
                if (onUpdatePlanOverrides) {
                  const newO = { ...planOverrides, [editDayData.date]: { jenis: 'Total Rest', durasi: '-', tujuan: 'Pemulihan pasif total. Fokus pada tidur berkualitas dan asupan protein.' } };
                  onUpdatePlanOverrides(newO);
                }
                setShowEditModal(false);
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: 8, color: 'var(--alert-danger-text)' }}><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.92-10.24l5.58-3.33"></path></svg>
                {lang === 'id' ? 'Skip Latihan (Rest)' : 'Skip Workout (Rest)'}
              </button>
            </div>

            {editDayData.workout.isOverridden && (
              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={() => {
                if (onUpdatePlanOverrides) {
                  const newO = { ...planOverrides };
                  delete newO[editDayData.date];
                  onUpdatePlanOverrides(newO);
                }
                setShowEditModal(false);
              }}>
                {lang === 'id' ? 'Reset ke Jadwal Asli' : 'Reset to Original'}
              </button>
            )}
          </div>
        </div>
      , document.body)}

    </div>
  );
}

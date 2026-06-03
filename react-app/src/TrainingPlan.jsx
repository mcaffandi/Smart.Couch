import { useState } from 'react';
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

export default function TrainingPlan({ activities, programStyle, goal, paces, latestSleepScore, actualBestPace, targetPace, selectedDays, gender, weight, height, age, lang = 'id' }) {
  const [isPaused, setIsPaused] = useState(() => localStorage.getItem('smartcoach_paused') === 'true');
  const [aiPlan, setAiPlan] = useState(() => {
    try { return JSON.parse(localStorage.getItem('smartcoach_ai_plan')) || null; } catch { return null; }
  });
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');

  const togglePause = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    localStorage.setItem('smartcoach_paused', newState.toString());
  };
  const basePlan = buildTrainingPlan(programStyle, goal, paces, selectedDays);
  const plan = aiPlan || basePlan;



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
            <strong>Kondisi Drop:</strong> Skor tidur lo {latestSleepScore} — tidur kurang. Kalau jadwal hari ini interval atau tempo, <strong>sangat disarankan ganti ke Easy Run atau Rest</strong> untuk cegah cedera.
          </>
        ) : (
          <>
            <strong>Poor Sleep:</strong> Your sleep score is {latestSleepScore} — insufficient rest. If today's scheduled run is an interval or tempo, <strong>it is highly recommended to switch to an Easy Run atau Rest</strong> to prevent injury.
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
            <strong>Kondisi Prima:</strong> Tidur lo sangat baik (skor {latestSleepScore}). Tubuh dalam kondisi prime — waktu ideal untuk push intensitas tinggi.
          </>
        ) : (
          <>
            <strong>Prime Condition:</strong> Your sleep is excellent (score {latestSleepScore}). Your body is in prime shape — an ideal time to push high-intensity training.
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

  const generateAIPlan = async () => {
    let apiKey = localStorage.getItem('groq_api_key');
    // Will attempt to use server proxy if apiKey is not set.
    
    setAiLoading(true);
    setAiError('');

    try {
      const recentRuns = (activities || []).slice(0, 5).map(a => {
        const dist = ((a.distance || 0) / 100000).toFixed(2);
        const dur = Math.round((a.duration || 0) / 60000);
        return lang === 'id' 
          ? `Jarak: ${dist}km, Waktu: ${dur}m, HR: ${a.avgHr || 0}bpm`
          : `Distance: ${dist}km, Duration: ${dur}m, HR: ${a.avgHr || 0}bpm`;
      }).join('\n');

      const daysInstruction = selectedDays && selectedDays.length > 0
        ? (lang === 'id' 
            ? `Hari Lari yang DIREQUEST: ${selectedDays.join(', ')}.\nSANGAT PENTING: Hanya jadwalkan lari pada hari yang direquest tersebut. Untuk hari selain itu, WAJIB diisi dengan "Total Rest" atau latihan silang/pemulihan aktif seperti "Core & Leg Stabilizer".`
            : `REQUESTED Running Days: ${selectedDays.join(', ')}.\nVERY IMPORTANT: Only schedule running workouts on these specific requested days. For other days, write "Total Rest" or active recovery/cross-training like "Core & Leg Stabilizer".`)
        : (lang === 'id'
            ? `Hari Lari: Pelari menyerahkan jadwal kepadamu. Atur hari lari yang optimal (3-5 hari seminggu sesuai target). Untuk hari selain itu, WAJIB diisi dengan "Total Rest" atau "Core & Leg Stabilizer".`
            : `Running Days: The runner lets you decide. Optimize running days (3-5 days/week based on the target). For other days, write "Total Rest" or "Core & Leg Stabilizer".`);

      const genderInstruction = gender ? `Jenis Kelamin: ${gender === 'Pria' ? 'Laki-laki' : 'Perempuan'}. ` : '';
      const bmiInstruction = weight && height ? `Berat: ${weight}kg, Tinggi: ${height}cm. ` : '';

      const prompt = lang === 'id'
        ? `Lo adalah pelatih lari elit (EnduraUP). Buatkan jadwal lari 1 minggu (Senin-Minggu) dalam format JSON array yang ketat.
Atlet ini punya target utama: ${goal}.
${daysInstruction}
${genderInstruction}${bmiInstruction}

Target Pace: ${formatPace(targetPace) || targetPace} min/km.
Data lari terakhir mereka (jadikan referensi penyesuaian beban):
${recentRuns || "Belum ada riwayat lari."}
Tidur semalam: skor ${latestSleepScore || "Tidak ada data"}.

PERHATIAN (KONSISTENSI): Skor konsistensi 7 hari terakhir atlet ini adalah ${consistencyScore}%. 
Jika konsistensi rendah (<50%), berikan jadwal adaptasi (Easy Run) lebih banyak agar memotivasi dan tidak cedera. JANGAN jadwalkan interval berat jika skornya di bawah 50%.
Jika konsistensi >80%, lo boleh ngasih jadwal progresif (Tempo/Interval/Long Run) yang menantang!

Sesuaikan intensitas! Jika HR kemarin tinggi atau tidur kurang, tambahkan rest/recovery.
Output harus STRICTLY JSON array of objects dengan keys persis: "hari" (Senin, Selasa, Rabu, Kamis, Jumat, Sabtu, Minggu), "jenis" (HANYA BOLEH ISI DENGAN: "Total Rest", "Easy Run", "Interval", "Long Run", "Core & Leg Stabilizer", atau "Active Recovery"), "durasi" (contoh: "30 menit", "5x400m", "–"), "tujuan" (alasan logis). Pastikan urutan dari Senin sampai Minggu (7 item).
Return ONLY the raw JSON array.`
        : `You are an elite running coach (EnduraUP). Create a strict 1-week training plan (Monday-Sunday) in JSON array format.
This athlete's main goal: ${goal}.
${daysInstruction}
${genderInstruction}${bmiInstruction}

Target Pace: ${formatPace(targetPace) || targetPace} min/km.
Their latest run data (use as reference to adjust load):
${recentRuns || "No running history yet."}
Sleep last night: score ${latestSleepScore || "No data"}.

ATTENTION (CONSISTENCY): This athlete's 7-day consistency score is ${consistencyScore}%. 
If consistency is low (<50%), provide more adaptation runs (Easy Runs) to motivate them without causing injury. DO NOT schedule heavy intervals if the score is below 50%.
If consistency is >80%, feel free to give them challenging progressive runs (Tempo/Interval/Long Run)!

Adjust intensity! If heart rate was high or sleep was insufficient, add rest/recovery.
Output must be a STRICTLY JSON array of objects with keys exactly: "hari" (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday), "jenis" (MUST BE ONE OF: "Total Rest", "Easy Run", "Interval", "Long Run", "Core & Leg Stabilizer", or "Active Recovery"), "durasi" (e.g. "30 minutes", "5x400m", "–"), "tujuan" (logical reasoning). Ensure the order goes Monday to Sunday (7 items).
Return ONLY the raw JSON array.`;

      let content = '';

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const endpoint = apiKey ? 'https://api.groq.com/openai/v1/chat/completions' : '/api/coach';
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        signal: controller.signal,
        headers,
        body: JSON.stringify({
          prompt: prompt,
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        })
      });
      clearTimeout(timeoutId);
      
      const data = await res.json();
      if (!res.ok || data.error) {
        if (!apiKey && res.status === 404) {
          throw new Error("MISSING_API_KEY");
        }
        throw new Error(data.error?.message || data.error || 'API Error');
      }
      content = data.choices[0].message.content;

      content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].hari) {
        setAiPlan(parsed);
        localStorage.setItem('smartcoach_ai_plan', JSON.stringify(parsed));
      } else {
        throw new Error(lang === 'id' ? 'Format JSON dari AI tidak sesuai.' : 'JSON format from AI is invalid.');
      }
    } catch (e) {
      if (e.message === 'MISSING_API_KEY') {
        setAiError('MISSING_API_KEY');
      } else {
        setAiError((lang === 'id' ? 'Gagal men-generate jadwal dari AI: ' : 'Failed to generate training plan from AI: ') + e.message);
      }
    }
    setAiLoading(false);
  };

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
            onClick={generateAIPlan}
            disabled={aiLoading}
            style={{
              background: aiPlan ? 'var(--bg-card)' : 'var(--accent-purple)',
              color: aiPlan ? 'var(--accent-purple)' : '#fff',
              border: aiPlan ? '1px solid var(--accent-purple)' : 'none',
              padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {aiLoading ? (
              <svg className="spinner-rotate" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="2" x2="12" y2="6"></line>
                <line x1="12" y1="18" x2="12" y2="22"></line>
                <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                <line x1="2" y1="12" x2="6" y2="12"></line>
                <line x1="18" y1="12" x2="22" y2="12"></line>
                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor" fillOpacity="0.3"/>
              </svg>
            )}
            {aiLoading ? (lang === 'id' ? 'Menganalisis...' : 'Analyzing...') : (aiPlan ? (lang === 'id' ? 'Regenerate AI Plan' : 'Regenerate AI Plan') : (lang === 'id' ? 'AI: Buatkan Jadwal Dinamis' : 'AI: Generate Dynamic Plan'))}
          </button>
          {aiPlan && (
            <button
              className="login-link-btn"
              onClick={() => { setAiPlan(null); localStorage.removeItem('smartcoach_ai_plan'); }}
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
            >
              {lang === 'id' ? 'Kembali ke Default' : 'Back to Default'}
            </button>
          )}
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



      {aiError === 'MISSING_API_KEY' ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16, background: 'rgba(251,113,133,0.1)', padding: 16, borderRadius: 12, border: '1px solid rgba(251,113,133,0.3)' }}>
          <p style={{ fontSize: 13, color: '#fb7185', fontWeight: 600, margin: 0 }}>
            {lang === 'id' ? 'API Key Groq belum disetting. Masukkan API Key untuk menggunakan AI Coach.' : 'Groq API Key has not been set. Please enter it to use the AI Coach.'}
          </p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              type="password"
              className="form-input"
              value={tempApiKey}
              onChange={e => { setTempApiKey(e.target.value); }}
              placeholder="gsk_..."
              style={{ flex: 1, minWidth: 200, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
            <button
              className="btn btn-primary"
              style={{ padding: '8px 16px', borderRadius: 8, width: 'auto' }}
              onClick={() => {
                if (tempApiKey.trim()) {
                  localStorage.setItem('groq_api_key', tempApiKey.trim());
                  setAiError('');
                  generateAIPlan();
                }
              }}
            >
              {lang === 'id' ? 'Simpan & Generate' : 'Save & Generate'}
            </button>
          </div>
        </div>
      ) : aiError ? (
        <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginBottom: 16 }}>{aiError}</div>
      ) : null}

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
        <div className="pace-card" style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.2)' }}>
          <div className="pace-label" style={{ color: '#fb7185' }}>{lang === 'id' ? 'Ngepush' : 'Push'}</div>
          <div className="pace-value">{paces.ngepush}</div>
          <div className="pace-unit">min/km</div>
          {age && <div style={{ fontSize: 11, color: '#fb7185', marginTop: 4, fontWeight: 600 }}>HR {getHRForZone(0.8, 0.9)}</div>}
        </div>
        <div className="pace-card" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div className="pace-label" style={{ color: '#38bdf8' }}>{lang === 'id' ? 'Sedang' : 'Moderate'}</div>
          <div className="pace-value">{paces.sedang}</div>
          <div className="pace-unit">min/km</div>
          {age && <div style={{ fontSize: 11, color: '#38bdf8', marginTop: 4, fontWeight: 600 }}>HR {getHRForZone(0.7, 0.8)}</div>}
        </div>
        <div className="pace-card" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <div className="pace-label" style={{ color: '#34d399' }}>{lang === 'id' ? 'Santai' : 'Easy'}</div>
          <div className="pace-value">{paces.santai}</div>
          <div className="pace-unit">min/km</div>
          {age && <div style={{ fontSize: 11, color: '#34d399', marginTop: 4, fontWeight: 600 }}>HR {getHRForZone(0.6, 0.7)}</div>}
        </div>
      </div>

      {/* ── ADAPTIVE CALENDAR SECTION ── */}
      {(() => {
        const adaptiveCalendar = buildAdaptiveCalendar(plan, activities, isPaused);
        // Only show from yesterday to next 6 days (8 days total) for a concise view
        const todayIdx = adaptiveCalendar.findIndex(d => d.isToday);
        const startIdx = Math.max(0, todayIdx - 2);
        const displayDays = adaptiveCalendar.slice(startIdx, startIdx + 8);
        
        return (
          <div style={{ marginBottom: 30 }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
              {lang === 'id' ? 'Kalender Berjalan' : 'Running Calendar'}
            </h3>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
              {displayDays.map((dItem, i) => {
                const dateObj = new Date(dItem.date);
                const dayName = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short' });
                const dateNum = dateObj.getDate();
                const monthStr = dateObj.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short' });
                
                const isMissed = dItem.workout.missed;
                const isCompleted = dItem.hasRun;
                const isRescheduled = dItem.workout.rescheduled;
                
                let borderColor = 'var(--border)';
                let bg = 'var(--bg-card)';
                if (dItem.isToday) { borderColor = 'var(--accent-purple)'; bg = 'rgba(167, 139, 250, 0.05)'; }
                if (isCompleted) { borderColor = '#10b981'; bg = 'rgba(16, 185, 129, 0.05)'; }
                if (isMissed) { borderColor = '#fb7185'; bg = 'rgba(251, 113, 133, 0.05)'; }

                return (
                  <div key={i} style={{ minWidth: 160, maxWidth: 180, flex: '0 0 auto', background: bg, border: `1.5px solid ${borderColor}`, borderRadius: 12, padding: 12, display: 'flex', flexDirection: 'column', opacity: dItem.isPast && !dItem.isToday ? 0.6 : 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: dItem.isToday ? 'var(--accent-purple)' : 'var(--text-muted)' }}>{dayName.toUpperCase()}</div>
                        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>{dateNum} <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{monthStr}</span></div>
                      </div>
                      {isCompleted && <div style={{ color: '#10b981' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>}
                      {isMissed && <div style={{ color: '#fb7185' }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg></div>}
                      {dItem.isToday && !isCompleted && <div style={{ background: 'var(--accent-purple)', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>TODAY</div>}
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, lineHeight: 1.2 }}>
                      {getJenis(dItem.workout.jenis)}
                    </div>
                    {isRescheduled && (
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '2px 6px', borderRadius: 4, display: 'inline-block', marginBottom: 4 }}>
                        {lang === 'id' ? `🔄 Geseran dari ${dItem.workout.originalHari}` : `🔄 Moved from ${dItem.workout.originalHari}`}
                      </div>
                    )}

                    
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{getDurasi(dItem.workout.durasi)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
        {lang === 'id' ? 'Template Rencana Mingguan' : 'Weekly Blueprint Template'}
      </h3>


      {/* Desktop Table View */}
      <div className="training-table-desktop" style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
        <table className="training-table">
          <thead>
            <tr>
              <th>{lang === 'id' ? 'Hari' : 'Day'}</th>
              <th>{lang === 'id' ? 'Jenis Latihan' : 'Workout Type'}</th>
              <th>{lang === 'id' ? 'Durasi / Intensitas' : 'Duration / Intensity'}</th>
              <th>{lang === 'id' ? 'Tujuan' : 'Target / Purpose'}</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{getHari(row.hari)}</td>
                <td><span className={`badge ${getBadgeClass(row.jenis)}`}>{getJenis(row.jenis)}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{getDurasi(row.durasi)}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{getTujuan(row.tujuan)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View */}
      <div className="training-cards-mobile">
        {plan.map((row, i) => (
          <div key={i} className="training-card-item">
            <div className="training-card-header">
              <span className="training-card-day">{getHari(row.hari)}</span>
              <span className={`badge ${getBadgeClass(row.jenis)}`}>{getJenis(row.jenis)}</span>
            </div>
            <div className="training-card-dur">
              {getDurasi(row.durasi)}
            </div>
            <div className="training-card-tujuan">
              {getTujuan(row.tujuan)}
            </div>
          </div>
        ))}
      </div>

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
    </div>
  );
}

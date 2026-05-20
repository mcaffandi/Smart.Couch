import { useState } from 'react';
import { buildTrainingPlan } from './utils';

const getBadgeClass = (jenis) => {
  if (jenis.includes('Rest') || jenis.includes('Total')) return 'badge-rest';
  if (jenis.includes('Easy') || jenis.includes('Active') || jenis.includes('Walk') || jenis.includes('Zone 2') || jenis.includes('MAF')) return 'badge-easy';
  if (jenis.includes('Interval') || jenis.includes('HIIT') || jenis.includes('Tempo')) return 'badge-interval';
  if (jenis.includes('Long') || jenis.includes('Base Run')) return 'badge-long';
  if (jenis.includes('Core') || jenis.includes('Stabilizer') || jenis.includes('Yoga') || jenis.includes('Breathing') || jenis.includes('Mobility')) return 'badge-recovery';
  return 'badge-recovery';
};

export default function TrainingPlan({ activities, programStyle, goal, paces, latestSleepScore, actualBestPace, targetPace, selectedDays }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiPlan, setAiPlan] = useState(() => {
    try {
      const saved = localStorage.getItem('smartcoach_ai_plan');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [aiError, setAiError] = useState('');
  
  const defaultPlan = buildTrainingPlan(programStyle, goal, paces, selectedDays);
  const plan = aiPlan || defaultPlan;

  const formatPace = (minKm) => {
    if (!minKm) return null;
    const m = Math.floor(minKm);
    const s = Math.round((minKm - m) * 60);
    return `${m}:${String(s).padStart(2, '0')}`;
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
        <strong>Kondisi Drop:</strong> Skor tidur lo {latestSleepScore} — tidur kurang. Kalau jadwal hari ini interval atau tempo, <strong>sangat disarankan ganti ke Easy Run atau Rest</strong> untuk cegah cedera.
      </div>
    );
    if (latestSleepScore < 80) return (
      <div className="alert alert-warning" style={{ marginBottom: 18 }}>
        <strong>Kondisi Sedang:</strong> Tidur lo cukup tapi belum optimal (skor {latestSleepScore}). Jalankan latihan sesuai jadwal, tapi jangan dipaksain sampai batas.
      </div>
    );
    return (
      <div className="alert alert-success" style={{ marginBottom: 18 }}>
        <strong>Kondisi Prima:</strong> Tidur lo sangat baik (skor {latestSleepScore}). Tubuh dalam kondisi prime — waktu ideal untuk push intensitas tinggi.
      </div>
    );
  };

  const generateAIPlan = async () => {
    const apiKey = localStorage.getItem('groq_api_key');
    if (!apiKey) {
      setAiError('API Key Groq belum disetting di Dashboard.');
      return;
    }
    setAiLoading(true);
    setAiError('');

    try {
      const recentRuns = (activities || []).slice(0, 5).map(a => {
        const dist = ((a.distance || 0) / 100000).toFixed(2);
        const dur = Math.round((a.duration || 0) / 60000);
        return `Jarak: ${dist}km, Waktu: ${dur}m, HR: ${a.avgHr || 0}bpm`;
      }).join('\n');

      const daysInstruction = selectedDays && selectedDays.length > 0
        ? `Hari Lari yang DIREQUEST: ${selectedDays.join(', ')}.\nSANGAT PENTING: Hanya jadwalkan lari pada hari yang direquest tersebut. Untuk hari selain itu, WAJIB diisi dengan "Total Rest" atau "Cross-Training/Recovery".`
        : `Hari Lari: Pelari menyerahkan jadwal kepadamu. Atur hari lari yang optimal (3-5 hari seminggu sesuai target). Untuk hari istirahat, WAJIB diisi dengan "Total Rest" atau "Cross-Training/Recovery".`;

      const prompt = `Lo adalah pelatih lari elit (EnduraUP). Buatkan jadwal lari 1 minggu (Senin-Minggu) dalam format JSON array yang ketat. 
Atlet ini punya target utama: ${goal}. 
${daysInstruction}

Target Pace: ${formatPace(targetPace) || targetPace} min/km. 
Data lari terakhir mereka (jadikan referensi penyesuaian beban): 
${recentRuns || "Belum ada riwayat lari."}
Tidur semalam: skor ${latestSleepScore || "Tidak ada data"}.

Sesuaikan intensitas! Jika HR kemarin tinggi atau tidur kurang, tambahkan rest/recovery.
Output harus STRICTLY JSON array of objects dengan keys persis: "hari" (Senin-Minggu), "jenis" (contoh: "Easy Run", "Interval", "Total Rest"), "durasi" (contoh: "30 menit", "5x400m", "–"), "tujuan" (alasan logis). Pastikan urutan dari Senin sampai Minggu (7 item).
Return ONLY the raw JSON array.`;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        })
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (data.error) throw new Error(data.error.message);
      
      let content = data.choices[0].message.content;
      // strip markdown formatting if the model wraps it in ```json ... ```
      content = content.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].hari) {
        setAiPlan(parsed);
        localStorage.setItem('smartcoach_ai_plan', JSON.stringify(parsed));
      } else {
        throw new Error('Format JSON dari AI tidak sesuai.');
      }
    } catch (e) {
      setAiError('Gagal men-generate jadwal dari AI: ' + e.message);
    }
    setAiLoading(false);
  };

  const handleExportICS = () => {
    const today = new Date();
    const dayOfWeek = today.getDay() || 7;
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1);

    const weekDaysMap = { 'Senin': 0, 'Selasa': 1, 'Rabu': 2, 'Kamis': 3, 'Jumat': 4, 'Sabtu': 5, 'Minggu': 6 };
    let icsContent = "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//EnduraUP//Training Plan//EN\n";

    plan.forEach((session) => {
      if (!session || !session.jenis) return;
      const offset = weekDaysMap[session.hari];
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
      icsContent += `SUMMARY:🏃 ${session.jenis}\n`;
      icsContent += `DESCRIPTION:Durasi/Intensitas: ${session.durasi}\\n\\nTujuan: ${session.tujuan}\n`;
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

  return (
    <div className="animate-fade-in">
      {smartAlert()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
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
            {aiLoading ? '🔄 Menganalisis...' : (aiPlan ? '⚡ Regenerate AI Plan' : '⚡ AI: Buatkan Jadwal Dinamis')}
          </button>
          {aiPlan && (
            <button 
              className="login-link-btn"
              onClick={() => { setAiPlan(null); localStorage.removeItem('smartcoach_ai_plan'); }}
              style={{ fontSize: 12, color: 'var(--text-muted)' }}
            >
              Kembali ke Default
            </button>
          )}
        </div>
        
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
          Export ke Calendar
        </button>
      </div>

      {aiError && (
        <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginBottom: 16 }}>{aiError}</div>
      )}

      {/* Sync banner: actual vs target pace */}
      {showSyncBanner && (
        <div style={{
          background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 18,
          display: 'flex', alignItems: 'flex-start', gap: 12
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 4 }}>SINKRONISASI DATA</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              Pace terbaik lo dari data: <strong style={{ color: 'var(--text-primary)' }}>{formatPace(actualBestPace)} min/km</strong>
              {' '}· Target lo: <strong style={{ color: '#818cf8' }}>{formatPace(targetPace)} min/km</strong>
              <br />
              Rencana latihan ini dirancang untuk membawa lo dari kemampuan saat ini menuju target tersebut.
              Zone Ngepush / Sedang / Santai di bawah mengacu pada <strong>target pace</strong> lo.
            </div>
          </div>
        </div>
      )}

      <div className="pace-grid" style={{ marginBottom: 20 }}>
        <div className="pace-card" style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.2)' }}>
          <div className="pace-label" style={{ color: '#fb7185' }}>Ngepush</div>
          <div className="pace-value">{paces.ngepush}</div>
          <div className="pace-unit">min/km</div>
        </div>
        <div className="pace-card" style={{ background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.2)' }}>
          <div className="pace-label" style={{ color: '#38bdf8' }}>Sedang</div>
          <div className="pace-value">{paces.sedang}</div>
          <div className="pace-unit">min/km</div>
        </div>
        <div className="pace-card" style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.2)' }}>
          <div className="pace-label" style={{ color: '#34d399' }}>Santai</div>
          <div className="pace-value">{paces.santai}</div>
          <div className="pace-unit">min/km</div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid var(--border)' }}>
        <table className="training-table">
          <thead>
            <tr>
              <th>Hari</th>
              <th>Jenis Latihan</th>
              <th>Durasi / Intensitas</th>
              <th>Tujuan</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((row, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{row.hari}</td>
                <td><span className={`badge ${getBadgeClass(row.jenis)}`}>{row.jenis}</span></td>
                <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{row.durasi}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{row.tujuan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <details style={{ marginTop: 20 }}>
        <summary style={{
          cursor: 'pointer', padding: '12px 16px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10, fontSize: 13,
          fontWeight: 600, color: 'var(--text-secondary)', userSelect: 'none',
          transition: 'all 0.2s', outline: 'none'
        }}>
          ▶ Panduan Cross-Training (Core, Yoga, Breathing)
        </summary>
        <div style={{
          marginTop: 8, padding: '18px 20px', background: 'var(--bg-card)',
          border: '1px solid var(--border)', borderRadius: 10,
          display: 'flex', flexDirection: 'column', gap: 24
        }}>
          
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8 }}>💪 1. Core & Leg Stabilizer (Tanpa Squat / Lunges)</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              Fokus stabilitas pinggul, gluteus, & engkel. 100% bodyweight. Lakukan 3 set x 10-15 repetisi.
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              <li><strong style={{color: 'var(--text-primary)'}}>Glute Bridges:</strong> Rebahan, tekuk lutut, angkat pinggul sejajar paha. Tahan pantat 2 detik di atas. (Fokus Hamstring & Bokong)</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Clamshells:</strong> Tidur miring, lutut tekuk 90°. Buka lutut atas perlahan tanpa goyang pinggul. (Cegah lutut masuk ke dalam)</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Donkey Kicks:</strong> Posisi merangkak, tendang satu tumit ke arah langit-langit. Kunci punggung agar tidak melengkung. (Sangat efektif untuk Gluteus/Bokong)</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Fire Hydrants:</strong> Posisi merangkak, angkat lutut ke arah samping luar. (Membuka mobilitas persendian pinggul)</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Calf Raises (Jinjit):</strong> Jinjit perlahan lalu turun perlahan di ujung anak tangga. (Mencegah cedera tulang kering / <em>Shin Splints</em>)</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>🧘‍♀️ 2. Yoga / Mobility Matras</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              Fokus memanjangkan otot yang tegang dan membuka mobilitas pinggul. Tahan pose 30-45 detik.
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              <li><strong style={{color: 'var(--text-primary)'}}>Downward Dog:</strong> Tangan & kaki di lantai (V terbalik). Tarik tumit ke lantai untuk peregangan achilles.</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Pigeon Pose:</strong> Lipat satu kaki di depan matras, kaki belakang lurus. Sangat ampuh untuk otot bokong/piriformis.</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Cat-Cow:</strong> Posisi merangkak. Lengkungkan punggung ke atas, lalu tekuk ke bawah. Melumasi tulang belakang.</li>
            </ul>
          </div>

          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#34d399', marginBottom: 8 }}>🫁 3. Breathing & Relaksasi</div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10 }}>
              Fokus melatih kapasitas oksigen dan menurunkan <em>resting heart rate</em> secara pasif.
            </p>
            <ul style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, paddingLeft: 16 }}>
              <li><strong style={{color: 'var(--text-primary)'}}>Box Breathing (4-4-4-4):</strong> Tarik napas 4 detik, tahan 4d, buang 4d, tahan 4d (tanpa napas). Ulangi 5-10 menit.</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Strict Nasal Breathing:</strong> Lakukan pernapasan hanya menggunakan <strong>hidung</strong> (tarik & buang).</li>
              <li><strong style={{color: 'var(--text-primary)'}}>Diaphragmatic:</strong> Saat napas ditarik, perut harus membesar seperti balon (bukan dada yang membusung).</li>
            </ul>
          </div>
          <div className="alert alert-info" style={{ marginTop: 4 }}>
            Rekomendasi: Konsistensi lebih penting dari durasi. Lakukan rutinitas ini di hari "Rest" dengan intensitas ringan agar otot siap untuk jadwal lari berikutnya.
          </div>
        </div>
      </details>
    </div>
  );
}

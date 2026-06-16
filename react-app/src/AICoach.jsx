import { useState, useMemo } from 'react';
import { Sparkles, Activity, Calendar, Zap, AlertTriangle, ArrowRight, Settings } from 'lucide-react';
import { formatPace } from './utils';

export default function AICoach({ activities, profile, lang = 'id', isPremium, setShowPremiumModal }) {
  const [loading, setLoading] = useState(false);
  const [analysisRaw, setAnalysisRaw] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [savedKey, setSavedKey] = useState(!!localStorage.getItem('groq_api_key'));
  const [useServer, setUseServer] = useState(!localStorage.getItem('groq_api_key'));

  const saveKey = () => {
    if (!apiKey.trim()) return;
    const clean = apiKey.trim();
    localStorage.setItem('groq_api_key', clean);
    setApiKey(clean);
    setSavedKey(true);
    setUseServer(false);
    setErrorMsg('');
  };

  const getUsage = () => {
    try {
      const usage = JSON.parse(localStorage.getItem('enduraup_ai_usage') || '{"count": 0, "weekStart": 0}');
      const now = Date.now();
      if (now - usage.weekStart > 7 * 24 * 60 * 60 * 1000) {
        return { count: 0, weekStart: now };
      }
      return usage;
    } catch(e) {
      return { count: 0, weekStart: Date.now() };
    }
  };

  const incrementUsage = () => {
    const usage = getUsage();
    usage.count++;
    localStorage.setItem('enduraup_ai_usage', JSON.stringify(usage));
  };

  const getAIAnalysis = async () => {
    if (!isPremium && useServer) {
      const usage = getUsage();
      if (usage.count >= 5) {
        setErrorMsg(lang === 'id' ? "Batas AI Coach gratis (5x/minggu) telah habis. Upgrade ke PRO untuk akses tanpa batas!" : "Free AI limit (5x/week) reached. Upgrade to PRO for unlimited access!");
        if (setShowPremiumModal) setShowPremiumModal(true);
        return;
      }
    }
    setLoading(true);
    setAnalysisRaw(null);
    setErrorMsg('');
    try {
      // Prepare recent data safely
      const recentRuns = [...activities].sort((a, b) => new Date(b.startTimeLocal || 0).getTime() - new Date(a.startTimeLocal || 0).getTime()).slice(0, 5).map(a => {
        let date = lang === 'id' ? "Tgl tidak diketahui" : "Unknown date";
        try {
          const d = new Date(a.startTimeLocal);
          if (!isNaN(d.getTime())) {
            date = d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
          }
        } catch (err) {}

        const dist = ((a.distance || 0) / 100000).toFixed(2);
        const dur = Math.round((a.duration || 0) / 60000);
        const pace = dist > 0 ? (dur / dist).toFixed(2) : "0";
        const cadenceStr = a.average_cadence ? `, Cadence ${Math.round(a.average_cadence * 2)} spm` : "";
        return `- ${date}: Jarak ${dist}km, Waktu ${dur}m, Pace ${pace}m/km, HR ${a.avgHr || 0}bpm${cadenceStr}`;
      }).join('\n');

      const jsonFormatStr = `{
  "focuses": [
    { "title": "Nama Fokus Singkat", "desc": "Penjelasan detail", "badge": "Teks badge misal '158 spm sekarang'", "color": "amber" },
    { "title": "Fokus 2", "desc": "Penjelasan detail", "badge": "Teks badge", "color": "rose" },
    { "title": "Fokus 3", "desc": "Penjelasan detail", "badge": "Teks badge", "color": "emerald" }
  ],
  "schedule": [
    { "day": "SENIN", "title": "Jenis Lari", "desc": "Instruksi lari (durasi, pace, hr)" },
    { "day": "RABU", "title": "Jenis Lari", "desc": "Instruksi lari" },
    { "day": "JUM'AT", "title": "Jenis Lari", "desc": "Instruksi lari" },
    { "day": "MINGGU", "title": "Long Run", "desc": "Instruksi lari panjang" }
  ],
  "drills": [
    { "title": "Nama Drill", "desc": "Cara melakukan drill" },
    { "title": "Drill Lanjutan", "desc": "Penjelasan" }
  ],
  "tips": "Tips khusus 1 kalimat (cuaca, nutrisi, atau mental)."
}`;

      const prompt = lang === 'id'
        ? `Lo adalah pelatih lari elit (EnduraUP) yang analitis dan to the point. Evaluasi data pelari ini dan buatkan jadwal mingguan terstruktur.

Data pelari:
- Umur: ${profile?.age || 30} tahun
- Target: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

5 Lari Terakhir:
${recentRuns || "Belum ada data lari."}

ATURAN WAJIB:
1. Pahami "Zone 2 Training" (80% lari santai untuk pondasi aerobik). Pujilah jika lari pelan, beri peringatan jika HR selalu tembus >160bpm.
2. Gunakan data Cadence (jika ada) untuk koreksi teknik. Cadence ideal >170spm.
3. KELUARKAN HANYA FORMAT JSON VALID. JANGAN ADA TEKS APAPUN DI LUAR JSON.

Struktur JSON Wajib:
${jsonFormatStr}`
        : `You are an elite analytical running coach. Evaluate the runner's data and create a structured weekly plan.

Runner profile:
- Age: ${profile?.age || 30} years old
- Goal: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

Last 5 Runs:
${recentRuns || "No running data yet."}

RULES:
1. Enforce "Zone 2 Training" (80% easy runs). Praise slow running for base building.
2. Use Cadence data if available to correct form (target >170spm).
3. RETURN ONLY VALID JSON. NO MARKDOWN, NO EXTRA TEXT.

Required JSON Structure:
${jsonFormatStr}`;

      if (useServer) {
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, response_format: { type: "json_object" } })
        });

        if (res.status === 404) {
          setUseServer(false);
          setSavedKey(false);
          setErrorMsg(lang === 'id' ? "Proxy tidak berjalan. Silakan konfigurasi API Key Anda." : "Local proxy not running. Please configure your API key.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setUseServer(false);
          setSavedKey(false);
          setErrorMsg(data.error || "Server proxy error.");
          setLoading(false);
          return;
        }

        if (data.choices && data.choices.length > 0) {
          try {
            const parsed = JSON.parse(data.choices[0].message.content);
            setAnalysisRaw(parsed);
            if (!isPremium && useServer) incrementUsage();
          } catch(e) {
            setErrorMsg("Gagal mem-parsing struktur AI (Format JSON tidak valid).");
          }
        } else {
          setErrorMsg("Gagal memproses analisis.");
        }
      } else {
        const cleanKey = apiKey.trim();
        if (!cleanKey) {
          setErrorMsg(lang === 'id' ? "API Key wajib diisi." : "API Key is required.");
          setLoading(false);
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': \`Bearer \${cleanKey}\`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
            response_format: { type: "json_object" }
          })
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.error) {
          setErrorMsg(\`API Groq Ditolak: \${data.error.message}\`);
          setSavedKey(false);
          localStorage.removeItem('groq_api_key');
          setApiKey('');
        } else if (data.choices && data.choices.length > 0) {
          try {
            const parsed = JSON.parse(data.choices[0].message.content);
            setAnalysisRaw(parsed);
          } catch(e) {
            setErrorMsg("Gagal mem-parsing struktur AI (Format JSON tidak valid).");
          }
        } else {
          setErrorMsg("Gagal memproses analisis.");
          setSavedKey(false);
        }
      }
    } catch (e) {
      setErrorMsg("Gagal terhubung ke server AI: " + e.message);
      if (useServer) {
        setUseServer(false);
        setSavedKey(false);
      }
    }
    setLoading(false);
  };

  const handleResetKey = () => {
    setSavedKey(false);
    setUseServer(false);
    setAnalysisRaw(null);
  };

  const getColorVars = (colorStr) => {
    if (colorStr === 'amber' || colorStr === 'orange' || colorStr === 'yellow') return { line: '#f59e0b', bg: 'rgba(245, 158, 11, 0.1)' };
    if (colorStr === 'rose' || colorStr === 'red') return { line: '#f43f5e', bg: 'rgba(244, 63, 94, 0.1)' };
    if (colorStr === 'emerald' || colorStr === 'green') return { line: '#10b981', bg: 'rgba(16, 185, 129, 0.1)' };
    if (colorStr === 'sky' || colorStr === 'blue') return { line: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.1)' };
    return { line: '#a78bfa', bg: 'rgba(167, 139, 250, 0.1)' }; // default purple
  };

  return (
    <div className="chart-container animate-fade-in" style={{ 
      background: analysisRaw ? 'var(--bg-surface)' : 'var(--bg-card)',
      borderColor: analysisRaw ? 'rgba(167, 139, 250, 0.3)' : 'var(--border)',
      boxShadow: analysisRaw ? '0 12px 32px rgba(139, 92, 246, 0.05)' : 'none',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto',
      padding: analysisRaw ? '24px' : '20px'
    }}>
      {/* Background glow if analysis present */}
      {analysisRaw && <div style={{position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.08) 0%, transparent 70%)', borderRadius: '50%', pointerEvents: 'none'}} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, position: 'relative', zIndex: 1 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '-0.02em' }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(192, 132, 252, 0.2))', border: '1px solid rgba(139, 92, 246, 0.3)', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)'}}>
              <Sparkles size={18} color="var(--accent-purple)" />
            </div>
            {lang === 'id' ? 'AI Coach Insights' : 'AI Coach Insights'}
          </h3>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 42 }}>
            {lang === 'id' ? 'Analisis metrik \u0026 program latihan terstruktur.' : 'Metric analysis \u0026 structured training plan.'}
          </div>
        </div>

        {/* Top Right Actions */}
        {analysisRaw && !loading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', width: 'auto', borderRadius: 20 }} onClick={getAIAnalysis}>
              <Sparkles size={14} style={{marginRight: 6}} /> {lang === 'id' ? 'Refresh AI' : 'Refresh AI'}
            </button>
            {(savedKey || !useServer) && (
              <button onClick={handleResetKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Settings size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {(!savedKey && !useServer) ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {lang === 'id'
                ? 'Masukkan Groq API Key lo untuk mengaktifkan AI Coach. AI akan menganalisis 5 aktivitas lari terakhir serta profil lo untuk memberikan rekomendasi latihan.'
                : 'Enter your Groq API Key to enable the AI Coach. It will analyze your last 5 runs and runner profile to provide training feedback.'}
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
              <input
                type="password"
                className="form-input"
                value={apiKey}
                onChange={e => { setApiKey(e.target.value); setErrorMsg(''); }}
                placeholder="gsk_..."
                style={{ flex: 1, minWidth: 200, background: 'var(--bg-surface)' }}
              />
              <button className="btn btn-primary" style={{ width: 'auto' }} onClick={saveKey}>
                {lang === 'id' ? 'Simpan' : 'Save'}
              </button>
            </div>
            {errorMsg && (
              <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{width: 6, height: 6, borderRadius: 3, background: '#fb7185'}} />{errorMsg}</div>
            )}
          </div>
        ) : loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0', gap: 16, background: 'rgba(139, 92, 246, 0.02)', borderRadius: 16, border: '1px dashed rgba(139, 92, 246, 0.2)' }}>
            <svg className="spinner-rotate" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)', filter: 'drop-shadow(0 0 8px rgba(139,92,246,0.4))' }}>
              <line x1="12" y1="2" x2="12" y2="6"></line>
              <line x1="12" y1="18" x2="12" y2="22"></line>
              <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
              <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
              <line x1="2" y1="12" x2="6" y2="12"></line>
              <line x1="18" y1="12" x2="22" y2="12"></line>
              <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
              <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
            </svg>
            <div style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600, letterSpacing: '0.5px' }}>
              {lang === 'id' ? 'Menganalisis matriks biologis dan histori lari...' : 'Analyzing biological metrics and run history...'}
            </div>
          </div>
        ) : !analysisRaw ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'var(--bg-card)', padding: 24, borderRadius: 16, border: '1px solid var(--border)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
              {lang === 'id'
                ? 'Dapatkan ulasan performa instan dan tips latihan spesifik (Bento-Grid) berdasarkan riwayat larimu dari AI Coach.'
                : 'Get instant performance insights and custom running recommendations (Bento-Grid) from your AI Coach.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 8, flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={getAIAnalysis}
                disabled={activities.length === 0}
                style={{ width: 'auto', padding: '12px 24px', fontSize: 14 }}
              >
                <Sparkles size={18} style={{marginRight: 8}} /> {lang === 'id' ? 'Generate AI Plan' : 'Generate AI Plan'}
              </button>
            </div>
            {errorMsg && (
              <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginTop: 4, textAlign: 'center' }}>{errorMsg}</div>
            )}
          </div>
        ) : (
          /* STRUCTURED BENTO-GRID OUTPUT */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24, animation: 'fadeInUp 0.4s ease-out' }}>
            
            {/* Section 1: Focuses */}
            {analysisRaw.focuses && analysisRaw.focuses.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Activity size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {analysisRaw.focuses.length} Fokus Utama Latihan Lo
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
                  {analysisRaw.focuses.map((foc, i) => {
                    const c = getColorVars(foc.color);
                    return (
                      <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 16, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: c.line }} />
                        <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{foc.title}</h4>
                        <p style={{ margin: '0 0 12px 0', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{foc.desc}</p>
                        {foc.badge && (
                          <span style={{ background: c.bg, color: c.line, padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700, display: 'inline-block' }}>
                            {foc.badge}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Section 2: Weekly Schedule */}
            {analysisRaw.schedule && analysisRaw.schedule.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Calendar size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Jadwal Mingguan ({analysisRaw.schedule.length} Hari)
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
                  {analysisRaw.schedule.map((sch, i) => {
                    // determine highlight color based on run type
                    let borderColor = 'var(--accent-sky)';
                    if (sch.title.toLowerCase().includes('interval') || sch.title.toLowerCase().includes('speed')) borderColor = 'var(--accent-rose)';
                    else if (sch.title.toLowerCase().includes('tempo')) borderColor = 'var(--accent-amber)';
                    else if (sch.title.toLowerCase().includes('long')) borderColor = 'var(--accent-purple)';

                    return (
                      <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                        <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: borderColor }} />
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{sch.day}</div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{sch.title}</h4>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{sch.desc}</p>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
                  *Sisa hari = istirahat aktif (jalan, stretching, atau off total)
                </div>
              </div>
            )}

            {/* Section 3: Drills / Technical Tips */}
            {analysisRaw.drills && analysisRaw.drills.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <Zap size={16} color="var(--text-muted)" />
                  <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Drill Teknik Lari
                  </span>
                </div>
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: '8px 16px' }}>
                  {analysisRaw.drills.map((drill, i) => (
                    <div key={i} style={{ display: 'flex', gap: 16, padding: '16px 0', borderBottom: i === analysisRaw.drills.length - 1 ? 'none' : '1px solid var(--border)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(139, 92, 246, 0.1)', color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 12, fontWeight: 800 }}>
                        {i + 1}
                      </div>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{drill.title}</h4>
                        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{drill.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Section 4: General Tips */}
            {analysisRaw.tips && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: 16, borderRadius: 12 }}>
                <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                    Catatan Ekstra
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                    {analysisRaw.tips}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html:\`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      \`}} />
    </div>
  );
}

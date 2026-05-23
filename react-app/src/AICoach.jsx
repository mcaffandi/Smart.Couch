import { useState } from 'react';

export default function AICoach({ activities, profile, lang = 'id' }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [savedKey, setSavedKey] = useState(!!localStorage.getItem('groq_api_key'));
  // Use server proxy if no local API key is saved
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

  const getAIAnalysis = async () => {
    setLoading(true);
    setAnalysis('');
    setErrorMsg('');
    try {
      // Prepare recent data safely
      const recentRuns = activities.slice(0, 5).map(a => {
        let date = lang === 'id' ? "Tanggal tidak diketahui" : "Unknown date";
        try {
          const d = new Date(a.startTimeLocal);
          if (!isNaN(d.getTime())) {
            date = d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'short', day: 'numeric', month: 'short' });
          }
        } catch (err) {}

        const dist = ((a.distance || 0) / 100000).toFixed(2);
        const dur = Math.round((a.duration || 0) / 60000);
        const pace = dist > 0 ? (dur / dist).toFixed(2) : "0";
        return lang === 'id'
          ? `- ${date}: Jarak ${dist}km, Waktu ${dur}m, Pace ${pace}m/km, HR ${a.avgHr || 0}bpm`
          : `- ${date}: Dist ${dist}km, Dur ${dur}m, Pace ${pace}m/km, HR ${a.avgHr || 0}bpm`;
      }).join('\n');

      const formatPace = (p) => {
        if(!p) return "0:00";
        const m = Math.floor(p);
        const s = Math.round((p - m) * 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      const prompt = lang === 'id'
        ? `Lo adalah seorang pelatih lari elit (EnduraUP) dengan gaya bicara lugas, cerdas, dan to the point (pakai bahasa pergaulan profesional Indonesia seperti "lo" dan "gue").

Data pelari:
- Umur: ${profile?.age || 30} tahun
- Target Utama: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

5 Data Lari Terakhir:
${recentRuns || "Belum ada data lari."}

Berikan:
1. Analisis singkat performa dari data di atas.
2. Rekomendasi tajam untuk latihan selanjutnya agar bisa mencapai target pace-nya.
Jawab dalam 1-2 paragraf saja, langsung ke intinya, tanpa basa-basi.`
        : `You are an elite running coach (EnduraUP) with a direct, smart, and to the point speaking style. Use professional, modern, and motivating English (e.g. conversational but high authority, like a personal coach).

Runner profile:
- Age: ${profile?.age || 30} years old
- Main Goal: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

Last 5 Run Activities:
${recentRuns || "No running data yet."}

Provide:
1. A brief analysis of their performance based on the data above.
2. Sharp recommendations for their next workouts to help them reach their target pace.
Keep the answer to 1-2 paragraphs max, direct, and without fluff.`;

      if (useServer) {
        // Try calling Vercel serverless proxy first
        const res = await fetch('/api/coach', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ prompt })
        });

        if (res.status === 404) {
          setUseServer(false);
          setSavedKey(false);
          setErrorMsg(lang === 'id' ? "Proxy lokal tidak berjalan. Silakan konfigurasi API Key Anda di bawah." : "Local proxy not running. Please configure your API key below.");
          setLoading(false);
          return;
        }

        const data = await res.json();
        if (!res.ok) {
          setUseServer(false);
          setSavedKey(false);
          setErrorMsg(data.error || (lang === 'id' ? "Error server proxy. Silakan masukkan API Key secara manual." : "Server proxy error. Please enter your API key manually."));
          setLoading(false);
          return;
        }

        if (data.choices && data.choices.length > 0) {
          setAnalysis(data.choices[0].message.content);
        } else {
          setErrorMsg(lang === 'id' ? "Gagal memproses analisis." : "Failed to process analysis.");
        }
      } else {
        // Direct call using user's saved API Key
        const cleanKey = apiKey.trim();
        if (!cleanKey) {
          setErrorMsg(lang === 'id' ? "API Key wajib diisi." : "API Key is required.");
          setLoading(false);
          return;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout

        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${cleanKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          })
        });
        clearTimeout(timeoutId);
        const data = await res.json();

        if (data.error) {
          setErrorMsg(lang === 'id' ? `API Groq Ditolak: ${data.error.message}` : `Groq API Rejected: ${data.error.message}`);
          setSavedKey(false);
          localStorage.removeItem('groq_api_key');
          setApiKey('');
        } else if (data.choices && data.choices.length > 0) {
          setAnalysis(data.choices[0].message.content);
        } else {
          setErrorMsg(lang === 'id' ? "Gagal memproses analisis. Cek konfigurasi API Key." : "Failed to process analysis. Check your API Key configuration.");
          setSavedKey(false);
        }
      }
    } catch (e) {
      setErrorMsg((lang === 'id' ? "Gagal terhubung ke server AI: " : "Failed to connect to AI server: ") + e.message);
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
    setAnalysis('');
  };

  return (
    <div className="chart-container animate-fade-in" style={{ 
      marginTop: 20, 
      background: analysis ? 'rgba(139, 92, 246, 0.03)' : undefined,
      borderColor: analysis ? 'rgba(167, 139, 250, 0.3)' : undefined
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}>
              <path d="M12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" fill="currentColor" fillOpacity="0.2"/>
            </svg>
            {lang === 'id' ? 'AI Coach Personal' : 'AI Personal Coach'}
          </h3>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'id' ? 'Analisis data lari & rekomendasi berbasis AI' : 'AI-driven run analysis & training tips'}
          </div>
        </div>

        {/* Top Right Actions */}
        {analysis && !loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(savedKey || !useServer) && (
              <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }} onClick={handleResetKey}>
                {lang === 'id' ? 'Ganti Key' : 'Change Key'}
              </button>
            )}
            <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--accent-purple)', fontWeight: 700, textDecoration: 'none' }} onClick={getAIAnalysis}>
              {lang === 'id' ? 'Analisis Ulang' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      {(!savedKey && !useServer) ? (
        /* Configuration Needed */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {lang === 'id'
              ? 'Masukkan Groq API Key lo untuk mengaktifkan AI Coach. AI akan menganalisis 5 aktivitas lari terakhir serta profil lo untuk memberikan rekomendasi latihan.'
              : 'Enter your Groq API Key to enable the AI Coach. It will analyze your last 5 runs and runner profile to provide training feedback.'}
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setErrorMsg(''); }}
              placeholder="gsk_..."
              style={{ flex: 1, minWidth: 200 }}
            />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={saveKey}>
              {lang === 'id' ? 'Simpan' : 'Save'}
            </button>
          </div>
          {errorMsg && (
            <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600 }}>{errorMsg}</div>
          )}
        </div>
      ) : loading ? (
        /* Loading state */
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 12 }}>
          <svg className="spinner-rotate" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-purple)' }}>
            <line x1="12" y1="2" x2="12" y2="6"></line>
            <line x1="12" y1="18" x2="12" y2="22"></line>
            <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
            <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
            <line x1="2" y1="12" x2="6" y2="12"></line>
            <line x1="18" y1="12" x2="22" y2="12"></line>
            <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
            <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
          </svg>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>
            {lang === 'id' ? 'AI Coach sedang menganalisis datamu...' : 'AI Coach is analyzing your data...'}
          </div>
        </div>
      ) : !analysis ? (
        /* Configured but no analysis yet (Call-to-Action) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
            {lang === 'id'
              ? 'Dapatkan ulasan performa instan dan tips latihan spesifik berdasarkan riwayat larimu dari AI Coach.'
              : 'Get instant performance insights and custom running recommendations from your AI Coach.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 12 }}>
            {(savedKey || !useServer) ? (
              <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }} onClick={handleResetKey}>
                {lang === 'id' ? 'Ganti API Key' : 'Change API Key'}
              </button>
            ) : (
              <div />
            )}
            <button
              className="btn btn-primary"
              onClick={getAIAnalysis}
              disabled={activities.length === 0}
              style={{ width: 'auto', background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)' }}
            >
              {lang === 'id' ? 'Mulai Analisis AI' : 'Start AI Analysis'}
            </button>
          </div>
          {errorMsg && (
            <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginTop: 4 }}>{errorMsg}</div>
          )}
        </div>
      ) : (
        /* Analysis Output */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13.5, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', borderLeft: '3px solid var(--accent-purple)', paddingLeft: 12 }}>
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}

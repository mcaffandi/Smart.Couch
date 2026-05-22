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

  return (
    <div className="animate-fade-in" style={{ marginTop: 20 }}>
      {(!savedKey && !useServer) ? (
        <div className="info-card purple" style={{ borderColor: errorMsg ? '#fb7185' : undefined }}>
          <label className="form-label" style={{ color: errorMsg ? '#fb7185' : 'var(--accent-purple)', fontWeight: 700 }}>
            {errorMsg 
              ? (lang === 'id' ? 'API Key Ditolak / Gagal' : 'API Key Rejected / Failed') 
              : (lang === 'id' ? 'Konfigurasi Groq API Key' : 'Configure Groq API Key')}
          </label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <input
              type="password"
              className="form-input"
              value={apiKey}
              onChange={e => { setApiKey(e.target.value); setErrorMsg(''); }}
              placeholder="gsk_..."
              style={{ flex: 1, background: 'rgba(0,0,0,0.2)', borderColor: errorMsg ? 'rgba(251,113,133,0.5)' : undefined }}
            />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={saveKey}>
              {lang === 'id' ? 'Simpan Konfigurasi' : 'Save Configuration'}
            </button>
          </div>
          {errorMsg && (
            <div style={{ fontSize: 12, color: '#fb7185', marginTop: 10, fontWeight: 600 }}>{errorMsg}</div>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            {lang === 'id' 
              ? 'Kunci API disimpan secara lokal di browser untuk keamanan.' 
              : 'API Key is stored locally in your browser for security.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           {!analysis && (
             <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
               {(savedKey || !useServer) && (
                 <button
                    className="login-link-btn"
                    style={{ fontSize: 12, color: 'var(--text-muted)' }}
                    onClick={() => { setSavedKey(false); setUseServer(false); }}
                  >
                   {lang === 'id' ? 'Ganti API Key' : 'Change API Key'}
                 </button>
               )}
               <button
                  className="btn btn-primary"
                  onClick={getAIAnalysis}
                  disabled={loading || activities.length === 0}
                  style={{
                    background: 'var(--accent-purple)',
                    borderColor: 'var(--accent-purple)',
                    width: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                 {loading ? (
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
                 {loading 
                   ? (lang === 'id' ? 'Sedang Menganalisis Data...' : 'Analyzing Data...') 
                   : (lang === 'id' ? 'Analisis AI Coach' : 'AI Coach Analysis')}
               </button>
             </div>
           )}
           {errorMsg && (
             <div style={{ fontSize: 12, color: '#fb7185', marginTop: 4, fontWeight: 600 }}>{errorMsg}</div>
           )}
        </div>
      )}

      {analysis && (
        <div className="chart-container animate-fade-in" style={{ marginTop: 16, background: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(167, 139, 250, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>
                {lang === 'id' ? 'Analisis AI Coach' : 'AI Coach Analysis'}
              </h3>
              <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginTop: 2 }}>
                {lang === 'id' ? 'Didukung oleh Groq LLaMA-3' : 'Powered by Groq LLaMA-3'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              {(savedKey || !useServer) ? (
                <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => { setAnalysis(''); setSavedKey(false); setUseServer(false); }}>
                  {lang === 'id' ? 'Ganti Key' : 'Change Key'}
                </button>
              ) : (
                <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => { setAnalysis(''); setSavedKey(false); setUseServer(false); }}>
                  {lang === 'id' ? 'Gunakan API Key Sendiri' : 'Use Own API Key'}
                </button>
              )}
              <button className="login-link-btn" style={{ fontSize: 12 }} onClick={getAIAnalysis}>
                {lang === 'id' ? 'Analisis Ulang' : 'Regenerate'}
              </button>
            </div>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}

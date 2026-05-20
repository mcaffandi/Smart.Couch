import { useState } from 'react';

export default function AICoach({ activities, profile }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('groq_api_key') || '');
  const [savedKey, setSavedKey] = useState(!!localStorage.getItem('groq_api_key'));

  const saveKey = () => {
    if (!apiKey.trim()) return;
    const clean = apiKey.trim();
    localStorage.setItem('groq_api_key', clean);
    setApiKey(clean);
    setSavedKey(true);
  };

  const getAIAnalysis = async () => {
    const cleanKey = apiKey.trim();
    if (!cleanKey) return;
    setLoading(true);
    setAnalysis('');
    setErrorMsg('');
    try {
      // Prepare recent data safely
      const recentRuns = activities.slice(0, 5).map(a => {
        let date = "Tanggal tidak diketahui";
        try {
          const d = new Date(a.startTimeLocal);
          if (!isNaN(d.getTime())) {
            date = d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
          }
        } catch (err) {}
        
        const dist = ((a.distance || 0) / 100000).toFixed(2);
        const dur = Math.round((a.duration || 0) / 60000);
        const pace = dist > 0 ? (dur / dist).toFixed(2) : "0";
        return `- ${date}: Jarak ${dist}km, Waktu ${dur}m, Pace ${pace}m/km, HR ${a.avgHr || 0}bpm`;
      }).join('\n');
      
      const formatPace = (p) => {
        if(!p) return "0:00";
        const m = Math.floor(p);
        const s = Math.round((p - m) * 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
      };

      const prompt = `Lo adalah seorang pelatih lari elit (SmartCoach AI) dengan gaya bicara lugas, cerdas, dan to the point (pakai bahasa pergaulan profesional Indonesia seperti "lo" dan "gue").

Data pelari:
- Umur: ${profile?.age || 30} tahun
- Target Utama: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

5 Data Lari Terakhir:
${recentRuns || "Belum ada data lari."}

Berikan:
1. Analisis singkat performa dari data di atas.
2. Rekomendasi tajam untuk latihan selanjutnya agar bisa mencapai target pace-nya.
Jawab dalam 1-2 paragraf saja, langsung ke intinya, tanpa basa-basi.`;

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
        setErrorMsg(`API Groq Ditolak: ${data.error.message}`);
        setSavedKey(false);
        localStorage.removeItem('groq_api_key');
        setApiKey('');
      } else if (data.choices && data.choices.length > 0) {
        setAnalysis(data.choices[0].message.content);
      } else {
        setErrorMsg("Gagal memproses analisis. Cek konfigurasi API Key.");
        setSavedKey(false);
      }
    } catch (e) {
      setErrorMsg("Gagal terhubung ke server AI: " + e.message);
      setSavedKey(false);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ marginTop: 20 }}>
      {!savedKey ? (
        <div className="info-card purple" style={{ borderColor: errorMsg ? '#fb7185' : undefined }}>
          <label className="form-label" style={{ color: errorMsg ? '#fb7185' : 'var(--accent-purple)', fontWeight: 700 }}>
            {errorMsg ? 'API Key Ditolak / Gagal' : 'Konfigurasi Groq API Key'}
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
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={saveKey}>Simpan Konfigurasi</button>
          </div>
          {errorMsg && (
            <div style={{ fontSize: 12, color: '#fb7185', marginTop: 10, fontWeight: 600 }}>{errorMsg}</div>
          )}
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Kunci API disimpan secara lokal di browser untuk keamanan.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
           {!analysis && (
             <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16 }}>
               <button 
                  className="login-link-btn" 
                  style={{ fontSize: 12, color: 'var(--text-muted)' }} 
                  onClick={() => setSavedKey(false)}
                >
                 Ganti API Key
               </button>
               <button 
                  className="btn btn-primary" 
                  onClick={getAIAnalysis} 
                  disabled={loading || activities.length === 0}
                  style={{ background: 'var(--accent-purple)', borderColor: 'var(--accent-purple)', width: 'auto' }}
                >
                 {loading ? 'Sedang Menganalisis Data...' : 'Enhance Analysis'}
               </button>
             </div>
           )}
        </div>
      )}

      {analysis && (
        <div className="chart-container animate-fade-in" style={{ marginTop: 16, background: 'rgba(124, 58, 237, 0.08)', borderColor: 'rgba(167, 139, 250, 0.4)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, color: 'var(--text-primary)' }}>AI Coach Analysis</h3>
              <div style={{ fontSize: 11, color: 'var(--accent-purple)', marginTop: 2 }}>Didukung oleh Groq LLaMA-3</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)' }} onClick={() => { setAnalysis(''); setSavedKey(false); }}>Ganti Key</button>
              <button className="login-link-btn" style={{ fontSize: 12 }} onClick={getAIAnalysis}>Regenerate</button>
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

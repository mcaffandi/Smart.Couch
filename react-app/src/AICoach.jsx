import { useState } from 'react';

export default function AICoach({ activities, profile }) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState('');
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
    
    // Prepare recent data
    const recentRuns = activities.slice(0, 5).map(a => {
      const date = new Date(a.startTimeLocal).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' });
      const dist = ((a.distance || 0) / 100000).toFixed(2);
      const dur = Math.round((a.duration || 0) / 60000);
      const pace = (dur / dist).toFixed(2);
      return `- ${date}: Jarak ${dist}km, Waktu ${dur}m, Pace ${pace}m/km, HR ${a.avgHr}bpm`;
    }).join('\n');
    
    const prompt = `Lo adalah seorang pelatih lari elit (SmartCoach AI) dengan gaya bicara lugas, cerdas, dan to the point (pakai bahasa pergaulan profesional Indonesia seperti "lo" dan "gue").

Data pelari:
- Umur: ${profile.age} tahun
- Target Utama: ${profile.goal}
- Target Pace: ${profile.targetPace} min/km

5 Data Lari Terakhir:
${recentRuns || "Belum ada data lari."}

Berikan:
1. Analisis singkat performa dari data di atas.
2. Rekomendasi tajam untuk latihan selanjutnya agar bisa mencapai target pace-nya.
Jawab dalam 1-2 paragraf saja, langsung ke intinya, tanpa basa-basi.`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cleanKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: "llama3-70b-8192", 
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        })
      });
      const data = await res.json();
      
      if (data.error) {
        setAnalysis(`Terjadi kesalahan dari API Groq: ${data.error.message}`);
      } else if (data.choices && data.choices.length > 0) {
        setAnalysis(data.choices[0].message.content);
      } else {
        setAnalysis("Gagal memproses analisis. Cek konfigurasi API Key.");
      }
    } catch (e) {
      setAnalysis("Gagal terhubung ke server AI: " + e.message);
    }
    setLoading(false);
  };

  return (
    <div className="animate-fade-in" style={{ marginTop: 20 }}>
      {!savedKey ? (
        <div className="info-card purple">
          <label className="form-label" style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>Konfigurasi Groq API Key</label>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <input 
              type="password" 
              className="form-input" 
              value={apiKey} 
              onChange={e => setApiKey(e.target.value)} 
              placeholder="gsk_..."
              style={{ flex: 1, background: 'rgba(0,0,0,0.2)' }}
            />
            <button className="btn btn-primary" style={{ width: 'auto' }} onClick={saveKey}>Simpan Konfigurasi</button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Kunci API disimpan secara lokal di browser untuk keamanan.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
           {!analysis && (
             <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
            <button className="login-link-btn" style={{ fontSize: 12 }} onClick={getAIAnalysis}>Regenerate</button>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
            {analysis}
          </div>
        </div>
      )}
    </div>
  );
}

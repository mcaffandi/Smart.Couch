import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { formatPace } from './utils';

export default function AICoach({ activities, profile, lang = 'id', isPremium, setShowPremiumModal }) {
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
    setAnalysis('');
    setErrorMsg('');
    try {
      // Prepare recent data safely
      const recentRuns = [...activities].sort((a, b) => new Date(b.startTimeLocal || 0).getTime() - new Date(a.startTimeLocal || 0).getTime()).slice(0, 5).map(a => {
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



      const prompt = lang === 'id'
        ? `Lo adalah seorang pelatih lari elit (EnduraUP) dengan gaya bicara lugas, cerdas, dan to the point (pakai bahasa pergaulan profesional Indonesia seperti "lo" dan "gue").

Data pelari:
- Umur: ${profile?.age || 30} tahun
- Target Utama: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

5 Data Lari Terakhir:
${recentRuns || "Belum ada data lari."}

ATURAN WAJIB (PENTING!):
Pahami ilmu lari seperti "Zone 2 Training" atau aturan "80/20". Berlari dengan pace lambat (misal 8-9 min/km) pada sebagian besar sesi SANGATLAH PENTING untuk membangun fondasi aerobik (aerobic base). JANGAN kritik atau sebut pengguna "performa tidak stabil / kurang intensitas" hanya karena pace mereka lambat dibandingkan target pace, melainkan PUJILAH bahwa lari pelan sangat bagus untuk latihan Easy Run agar terhindar dari cedera.

Berikan:
1. Analisis singkat performa dari data di atas dengan bijaksana.
2. Rekomendasi tajam untuk latihan selanjutnya agar bisa mencapai target pace-nya.
Jawab dalam 1-2 paragraf saja, langsung ke intinya, tanpa basa-basi.`
        : `You are an elite running coach (EnduraUP) with a direct, smart, and to the point speaking style. Use professional, modern, and motivating English (e.g. conversational but high authority, like a personal coach).

Runner profile:
- Age: ${profile?.age || 30} years old
- Main Goal: ${profile?.goal || 'maintenance'}
- Target Pace: ${formatPace(profile?.targetPace || 6.0)} min/km

Last 5 Run Activities:
${recentRuns || "No running data yet."}

MANDATORY RULES (IMPORTANT!):
Understand running science such as "Zone 2 Training" or the "80/20 rule". Running at a slow pace (e.g., 8-9 min/km) for the majority of runs is CRUCIAL for building an aerobic base. DO NOT criticize the user for running slow compared to their target pace, but rather PRAISE them for doing proper Easy Runs to avoid injuries.

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
          if (!isPremium && useServer) incrementUsage();
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
      background: analysis ? 'linear-gradient(145deg, rgba(139, 92, 246, 0.05) 0%, rgba(192, 132, 252, 0.02) 100%)' : 'var(--bg-card)',
      borderColor: analysis ? 'rgba(167, 139, 250, 0.3)' : 'var(--border)',
      boxShadow: analysis ? '0 12px 32px rgba(139, 92, 246, 0.1), inset 0 0 0 1px rgba(255,255,255,0.05)' : 'none',
      position: 'relative',
      overflowX: 'hidden',
      overflowY: 'auto'
    }}>
      {/* Background glow if analysis present */}
      {analysis && <div style={{position: 'absolute', top: -50, right: -50, width: 150, height: 150, background: 'rgba(139, 92, 246, 0.2)', filter: 'blur(60px)', borderRadius: '50%', pointerEvents: 'none'}} />}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 1 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 10, letterSpacing: '0.3px' }}>
            <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(192, 132, 252, 0.2))', border: '1px solid rgba(139, 92, 246, 0.3)'}}>
              <Sparkles size={16} color="var(--accent-purple)" />
            </div>
            {lang === 'id' ? 'AI Coach Personal' : 'AI Personal Coach'}
          </h3>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, paddingLeft: 38 }}>
            {lang === 'id' ? 'Analisis data lari & rekomendasi berbasis AI' : 'AI-driven run analysis & training tips'}
          </div>
        </div>

        {/* Top Right Actions */}
        {analysis && !loading && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {(savedKey || !useServer) && (
              <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none', padding: '6px 12px', background: 'var(--bg-surface)', borderRadius: 16, border: '1px solid var(--border)' }} onClick={handleResetKey}>
                {lang === 'id' ? 'Ganti Key' : 'Change Key'}
              </button>
            )}
            <button className="btn btn-primary" style={{ fontSize: 12, padding: '6px 14px', width: 'auto' }} onClick={getAIAnalysis}>
              <Sparkles size={14} style={{marginRight: 6}} /> {lang === 'id' ? 'Analisis Ulang' : 'Regenerate'}
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        {(!savedKey && !useServer) ? (
          /* Configuration Needed */
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
          /* Loading state */
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 16, background: 'rgba(139, 92, 246, 0.02)', borderRadius: 12, border: '1px dashed rgba(139, 92, 246, 0.2)' }}>
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
              {lang === 'id' ? 'AI Coach sedang menganalisis datamu...' : 'AI Coach is analyzing your data...'}
            </div>
          </div>
        ) : !analysis ? (
          /* Configured but no analysis yet (Call-to-Action) */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, background: 'rgba(139, 92, 246, 0.02)', padding: 20, borderRadius: 12, border: '1px solid rgba(139, 92, 246, 0.1)' }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0, textAlign: 'center' }}>
              {lang === 'id'
                ? 'Dapatkan ulasan performa instan dan tips latihan spesifik berdasarkan riwayat larimu dari AI Coach.'
                : 'Get instant performance insights and custom running recommendations from your AI Coach.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', marginTop: 4, flexDirection: 'column', gap: 12 }}>
              <button
                className="btn btn-primary"
                onClick={getAIAnalysis}
                disabled={activities.length === 0}
                style={{ width: 'auto', padding: '12px 24px', fontSize: 14 }}
              >
                <Sparkles size={18} style={{marginRight: 8}} /> {lang === 'id' ? 'Mulai Analisis AI' : 'Start AI Analysis'}
              </button>
              {(savedKey || !useServer) && (
                <button className="login-link-btn" style={{ fontSize: 12, color: 'var(--text-muted)', textDecoration: 'none' }} onClick={handleResetKey}>
                  {lang === 'id' ? 'Ganti API Key' : 'Change API Key'}
                </button>
              )}
            </div>
            {errorMsg && (
              <div style={{ fontSize: 12, color: '#fb7185', fontWeight: 600, marginTop: 4, textAlign: 'center' }}>{errorMsg}</div>
            )}
          </div>
        ) : (
          /* Analysis Output */
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, animation: 'fadeInUp 0.4s ease-out' }}>
            <div style={{ 
              fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', 
              background: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: 12,
              borderLeft: '4px solid var(--accent-purple)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' 
            }}>
              {analysis}
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </div>
  );
}

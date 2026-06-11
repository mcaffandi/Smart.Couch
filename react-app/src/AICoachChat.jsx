import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, Send, X } from 'lucide-react';
import { formatPace, buildTrainingPlan } from './utils';

export default function AICoachChat({ lang, goal, programStyle, targetPace, currentUser, runActs, selectedDays, latestSleepScore, recoveryRemainingHours, trainingReadinessScore, isPremium, setShowPremiumModal, vo2max, hrZones }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        { role: 'assistant', content: lang === 'id' ? `Halo ${currentUser || 'bro'}! Gua pelatih AI lo. Ada yang mau diobrolin soal latihan atau kendala lari hari ini?` : `Hi ${currentUser || 'there'}! I'm your AI Coach. What's on your mind regarding your running today?` }
      ]);
    }
  }, [isOpen, messages.length, lang, currentUser]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const localDictionary = [
    // INDONESIAN MATCHES (Hanya untuk panduan fitur aplikasi & sapaan dasar)
    { match: /halo|hai|pagi|siang|malam|woy|bro|test|tes/, reply: 'Halo juga! Siap buat nge-crush target lari lo hari ini? 💪' },
    { match: /kalender|jadwal|besok|latihan|menu/, reply: 'Coba cek tab "Training Plan" ya, gua udah siapin Kalender Berjalan (Adaptive) di situ. Kalau lo bolos, jadwalnya otomatis gua geser!' },
    { match: /geser|ubah|ganti|rubah|edit/, reply: 'Kalau lo mau ngubah jumlah hari latihan (misal dari 3x seminggu jadi 2x), lo bisa klik tombol "Edit Profil" di sidebar kiri. Kalau soal jadwal lari yang kelewat, tenang aja, kalender *Adaptive* otomatis ngegeser jadwal lo ke hari kosong berikutnya!' },
    { match: /siapa kamu|fungsi bot|ai/, reply: 'Gua Coach AI bawaan dari EnduraUP! Gua dirancang buat jadi asisten lari pribadi lo. Gua bakal bantu jawab seputar jadwal, tips lari, sepatu, sampe keluhan cedera.' },
    
    // ENGLISH MATCHES
    { match: /hello|hi |hey|morning|afternoon|evening/, reply: 'Hello! Ready to crush your running goals today? 💪' },
    { match: /plan|schedule|tomorrow|menu/, reply: 'Check the "Training Plan" tab! I\'ve set up an Adaptive Calendar for you. If you miss a run, I\'ll automatically reschedule it!' },
    { match: /change|shift|edit/, reply: 'If you want to change your training frequency, edit your profile on the left sidebar. As for missed runs, my Adaptive Calendar will automatically shift them to your next available rest day!' },
    { match: /who are you|your purpose/, reply: 'I am the EnduraUP Coach AI! Designed to be your personal running assistant. I can help with schedules, running tips, gear, and minor injury advice.' }
  ];

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

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const msgLower = userMsg.toLowerCase();
    
    // 1. Check Local Dictionary First (Instant Response based on input language)
    // 2. Real AI (Groq API or Vercel Proxy)
    try {
      let apiKey = localStorage.getItem('groq_api_key');

      if (!isPremium && !apiKey) {
        const usage = getUsage();
        if (usage.count >= 5) {
          setMessages(p => [...p, { role: 'assistant', content: lang === 'id' ? "Batas AI Chat gratis (5x/minggu) telah habis. Upgrade ke PRO untuk akses tanpa batas!" : "Free AI Chat limit (5x/week) reached. Upgrade to PRO for unlimited access!" }]);
          setIsTyping(false);
          if (setShowPremiumModal) setShowPremiumModal(true);
          return;
        }
      }

      // Prepare conversation history for LLM (Compact to max last 6 messages to save tokens/context)
      const chatHistory = newMessages.slice(-6).map(m => ({
        role: m.role,
        content: m.content
      }));

      // Consistency Logic inside Chat
      const planRunDays = selectedDays?.length || 3;
      const now = new Date();
      const last7DaysRuns = (runActs || []).filter(a => {
        if (!a.startTimeLocal) return false;
        const d = new Date(a.startTimeLocal);
        const diffDays = (now - d) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7 && (a.distance > 0 || a.duration > 0);
      }).length;
      const consistencyScore = Math.min(100, Math.round((last7DaysRuns / Math.max(1, planRunDays)) * 100));


      
      const formattedPace = formatPace(targetPace);

      const currentDay = now.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { weekday: 'long' });
      const currentTime = now.toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit' });

      const recentRunsStr = [...(runActs || [])]
        .filter(a => (a.distance || 0) > 0 || (a.duration || 0) > 0)
        .sort((a, b) => (b.startTimeLocal || 0) - (a.startTimeLocal || 0))
        .slice(0, 7)
        .map((r, i) => {
          const date = r.startTimeLocal ? new Date(r.startTimeLocal).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' }) : 'Unknown';
          const distKm = ((r.distance || 0) / 100000).toFixed(2);
          const durMin = Math.round((r.duration || 0) / 60000);
          const paceMinPerKm = r.distance > 0 ? (r.duration / 60000) / (r.distance / 100000) : 0;
          const paceStr = formatPace(paceMinPerKm);
          return `- Lari pada ${date}: Jarak ${distKm} km, Waktu ${durMin} menit, Pace ${paceStr} min/km` + (r.avgHr ? `, HR ${r.avgHr} bpm` : '');
        }).join('\n');
      
      const recentRunsContextId = recentRunsStr ? `\n\n[DATA LARI TERAKHIR (Max 7 Sesi)]\n${recentRunsStr}` : '\n\n[DATA LARI TERAKHIR]\nBelum ada data lari.';
      const recentRunsContextEn = recentRunsStr ? `\n\n[RECENT RUNS DATA (Max 7 Sessions)]\n${recentRunsStr}` : '\n\n[RECENT RUNS]\nNo run data yet.';

      let todaysWorkoutId = 'Tidak ada jadwal lari hari ini.';
      let todaysWorkoutEn = 'No scheduled run today.';
      try {
        const paces = { ngepush: formatPace(targetPace*0.8), sedang: formatPace(targetPace*0.9), santai: formatPace(targetPace*1.1) };
        const plan = buildTrainingPlan(programStyle, goal, paces, selectedDays);
        const dayOfWeek = lang === 'id' ? currentDay : now.toLocaleDateString('id-ID', { weekday: 'long' }); // plan uses Indonesian days
        const todayPlan = plan.find(p => p.hari.toLowerCase() === dayOfWeek.toLowerCase());
        if (todayPlan) {
          todaysWorkoutId = `${todayPlan.jenis} (${todayPlan.durasi}). Tujuan: ${todayPlan.tujuan}`;
          todaysWorkoutEn = `${todayPlan.jenis} (${todayPlan.durasi}). Purpose: ${todayPlan.tujuan}`;
        }
      } catch (e) {
        console.warn('Failed to build plan for AI context:', e);
      }

      const vo2maxContextId = vo2max ? `\n- Estimasi VO2Max: ${vo2max.toFixed(1)}` : '';
      const vo2maxContextEn = vo2max ? `\n- Estimated VO2Max: ${vo2max.toFixed(1)}` : '';

      let hrZonesContextId = '';
      let hrZonesContextEn = '';
      if (hrZones && hrZones.length > 0) {
        hrZonesContextId = '\n\n[ZONA DETAK JANTUNG USER SAAT INI]\n' + hrZones.map(z => `- ${z.zone}: ${z.min}-${z.max} bpm`).join('\n');
        hrZonesContextEn = '\n\n[USER CURRENT HEART RATE ZONES]\n' + hrZones.map(z => `- ${z.zone}: ${z.min}-${z.max} bpm`).join('\n');
      }

      const systemPrompt = lang === 'id' 
        ? `Lo adalah Coach AI EnduraUP, pelatih lari profesional yang asik (pake bahasa gaul lo/gue).
WAKTU LOKAL: ${currentDay}, Jam ${currentTime}.
TARGET USER: ${goal}, Program: ${programStyle}, Pace: ${formattedPace} min/km.

[MENU LATIHAN HARI INI]
${todaysWorkoutId}

[DATA FISIK USER SAAT INI]
- Training Readiness: ${trainingReadinessScore}%
- Waktu Pemulihan Sisa: ${recoveryRemainingHours} jam
- Skor Tidur Tadi Malam: ${latestSleepScore || 'Tidak ada data'}
- Skor Konsistensi: ${consistencyScore}%${vo2maxContextId}${recentRunsContextId}${hrZonesContextId}

ATURAN WAJIB (PATUHI INI):
1. JIKA READINESS < 60%: User sedang KECAPAIAN. LO DILARANG KERAS menyuruh atau mengizinkan user lari. Wajib paksa user untuk ISTIRAHAT TOTAL hari ini atau maksimal jalan kaki. Jika user nanya soal lari, tolak dan ingatkan readiness-nya masih ${trainingReadinessScore}%.
2. JIKA READINESS >= 80%: Puji kondisi fisiknya yang prima dan dorong untuk latihan intens.
3. JIKA KONSISTENSI < 50%: Roasting/tegur halus user karena malas.
4. JANGAN KRITIK pace lambat. Pahami ilmu Zone 2 / 80/20. Puji lari lambat sebagai "Easy Run" yang bagus buat aerobic base. Jangan judge pelari jelek hanya karena pacenya jauh dari target.
5. Jawab pertanyaan user dengan singkat, padat, pakai emoji.
6. BERIKAN ANALISA MENDALAM: Saat menganalisa detak jantung (HR) user, WAJIB merujuk pada patokan [ZONA DETAK JANTUNG USER SAAT INI] di atas. Jangan pakai rumus generik umur standar, karena Max HR tiap orang berbeda-beda sesuai datanya. Jangan cuma mengulang sebut angka.
7. JIKA user bahas MENU HARI INI, ingetin menu apa yang harus dia lakuin sesuai jadwal di atas, dan kasih tips singkat cara ngejalaninnya.
8. JIKA user bahas topik di luar lari/olahraga, tolak dengan sopan.`
        : `You are EnduraUP Coach AI, a professional, friendly running coach.
LOCAL TIME: ${currentDay}, ${currentTime}.
USER'S TARGET: ${goal}, Program: ${programStyle}, Pace: ${formattedPace} min/km.

[TODAY'S WORKOUT PLAN]
${todaysWorkoutEn}

[CURRENT PHYSICAL DATA]
- Training Readiness: ${trainingReadinessScore}%
- Remaining Recovery Time: ${recoveryRemainingHours} hours
- Last Night's Sleep Score: ${latestSleepScore || 'No data'}
- Consistency Score: ${consistencyScore}%${vo2maxContextEn}${recentRunsContextEn}${hrZonesContextEn}

STRICT RULES (MUST FOLLOW):
1. IF READINESS < 60%: User is EXHAUSTED. YOU ARE STRICTLY FORBIDDEN to tell them to run. You MUST force them to REST today. If they ask to run, refuse and remind them their readiness is ${trainingReadinessScore}%.
2. IF READINESS >= 80%: Praise their prime condition and encourage intense workouts.
3. IF CONSISTENCY < 50%: Give them a playful roast for being lazy.
4. DO NOT CRITICIZE slow paces. Understand Zone 2 / 80/20 training. Praise slow running as good "Easy Runs" for building aerobic base.
5. Answer concisely with emojis.
6. IN-DEPTH ANALYSIS: When analyzing the user's heart rate, you MUST refer to [USER CURRENT HEART RATE ZONES] provided above. Do not use generic age-based formulas, as everyone's Max HR is different based on their data. Provide actionable feedback instead of just repeating numbers.
7. IF user talks about non-running topics, politely decline.`;

      const endpoint = apiKey ? 'https://api.groq.com/openai/v1/chat/completions' : '/api/coach';
      const headers = { 'Content-Type': 'application/json' };
      if (apiKey) headers['Authorization'] = `Bearer ${apiKey.trim()}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: systemPrompt }, ...chatHistory],
          temperature: 0.7,
          max_tokens: 400
        })
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        if (!apiKey && res.status === 404) {
          setTimeout(() => {
            setMessages(p => [...p, { role: 'assistant', content: lang === 'id' 
              ? 'Pertanyaan lo spesifik nih! Sayangnya proxy Vercel ga jalan dan API Key lo belum diset. Tolong masukin API Key Groq di tab AI Coach supaya gua bisa jawab pertanyaan kayak ChatGPT beneran! ✨'
              : 'That is a very specific question! My Vercel proxy is down and your API key is not set. Please provide a Groq API Key in the AI Coach tab so I can answer like ChatGPT! ✨' 
            }]);
            setIsTyping(false);
          }, 1000);
          return;
        }
        throw new Error(data.error?.message || data.error || 'API Error');
      }
      
      const aiReply = data.choices[0].message.content.replace(/—/g, '-');
      if (!isPremium && !apiKey) incrementUsage();
      setMessages(p => [...p, { role: 'assistant', content: aiReply }]);
    } catch (e) {
      // 3. Fallback to Local Rule-Based "AI" with Reasoning
      const isId = lang === 'id';
      let fallbackReply = '';
      
      if (msgLower.includes('pace') || msgLower.includes('kecepatan') || msgLower.includes('cepat') || msgLower.includes('lambat')) {
        fallbackReply = isId 
          ? `(AI Offline Mode) Target pace lo kan ${formattedPace} min/km. Berdasarkan rumus dasar, untuk **Easy Run** lo bisa pelanin jadi sekitar ${formatPace(targetPace + 1.5)} min/km biar detak jantung tetap aman bro!`
          : `(Offline Mode) Your target pace is ${formattedPace} min/km. Based on basic formulas, for an **Easy Run** you should slow down to around ${formatPace(targetPace + 1.5)} min/km to keep your HR low!`;
      } 
      else if (msgLower.includes('hari ini') || msgLower.includes('jadwal') || msgLower.includes('lari apa')) {
        if (consistencyScore < 50) {
          fallbackReply = isId 
            ? `(AI Offline Mode) Sistem baca konsistensi lo baru **${consistencyScore}%**. Gak usah mikir menu berat dulu, hari ini **Easy Run 3KM - 5KM** aja biar kebiasaannya nempel lagi!`
            : `(Offline Mode) Consistency is at **${consistencyScore}%**. Don't do heavy workouts yet, just go for an **Easy Run 3KM - 5KM** today to build the habit back!`;
        } else {
          fallbackReply = isId
            ? `(AI Offline Mode) Konsistensi lo mantap (**${consistencyScore}%**)! Untuk capai target ${goal}, hari ini lo udah siap sikat sesi **Interval ringan** atau siap-siap buat Long Run akhir pekan.`
            : `(Offline Mode) Great consistency (**${consistencyScore}%**)! To reach your ${goal}, you're ready for a light **Interval session** or preparing for a weekend Long Run.`;
        }
      }
      else if (msgLower.includes('capek') || msgLower.includes('sakit') || msgLower.includes('cedera') || msgLower.includes('pegal') || msgLower.includes('rest')) {
        fallbackReply = isId
          ? `(AI Offline Mode) Kalau udah ngerasa gitu mending **Rest (Istirahat)** bro! Jangan dipaksa lari, lakukan *stretching* atau tidur yang cukup hari ini.`
          : `(Offline Mode) If you feel like that, please take a **Rest Day**! Don't force a run, do some stretching and get enough sleep today.`;
      }
      else {
        fallbackReply = isId
          ? `Sori banget bro, server AI utama (Groq) lagi limit/offline. Tapi tenang, tetap fokus aja ke target **${goal}** lo dengan program **${programStyle}**. Kalau butuh panduan, cek tab Training Plan ya! 💪`
          : `Sorry bro, the main AI server (Groq) is currently over limit/offline. But keep focusing on your **${goal}** with the **${programStyle}** plan. Check the Training Plan tab for your schedule! 💪`;
      }

      setMessages(p => [...p, { role: 'assistant', content: fallbackReply }]);
    }
    
    setIsTyping(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 60, height: 60, borderRadius: 30, background: 'linear-gradient(135deg, #818cf8, #c084fc)',
          color: '#fff', border: '1px solid rgba(255,255,255,0.2)',
          boxShadow: '0 8px 32px rgba(139,92,246,0.5), inset 0 0 20px rgba(255,255,255,0.2)',
          display: isOpen ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
          animation: 'pulseGlow 2s infinite'
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.1)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(139,92,246,0.6), inset 0 0 20px rgba(255,255,255,0.4)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(139,92,246,0.5), inset 0 0 20px rgba(255,255,255,0.2)'; }}
      >
        <MessageSquare size={26} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: window.innerWidth < 768 ? 0 : 80, right: window.innerWidth < 768 ? 0 : 20, zIndex: 10000,
          width: window.innerWidth < 768 ? '100%' : 380, height: window.innerWidth < 768 ? '85vh' : 600,
          background: 'rgba(25, 25, 25, 0.7)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.1)', borderBottom: window.innerWidth < 768 ? 'none' : '1px solid rgba(255,255,255,0.1)',
          borderRadius: window.innerWidth < 768 ? '24px 24px 0 0' : 24, display: 'flex', flexDirection: 'column',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)', overflow: 'hidden', animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ padding: '16px 20px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 22, background: 'linear-gradient(135deg, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139,92,246,0.4), inset 0 0 10px rgba(255,255,255,0.3)' }}><Bot size={26} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '0.3px', display: 'flex', alignItems: 'center', gap: 6 }}>
                  Coach AI <div style={{width: 8, height: 8, borderRadius: 4, background: '#10b981', boxShadow: '0 0 8px #10b981'}} />
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{lang === 'id' ? 'Selalu siap membantu' : 'Always ready to help'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={() => { setMessages([]); setInput(''); }} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', cursor: 'pointer', padding: '6px 12px', fontSize: 12, borderRadius: 16, fontWeight: 600, transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}>
                {lang === 'id' ? 'Clear' : 'Clear'}
              </button>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'all 0.2s' }} onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#fff'; }} onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}>
                <X size={22} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%', animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ 
                  background: m.role === 'user' ? 'linear-gradient(135deg, #818cf8, #c084fc)' : 'rgba(255,255,255,0.05)',
                  color: m.role === 'user' ? '#fff' : 'rgba(255,255,255,0.9)',
                  padding: '14px 18px', borderRadius: 20, borderBottomRightRadius: m.role === 'user' ? 4 : 20, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 20,
                  fontSize: 14, lineHeight: 1.5, border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.08)' : 'none',
                  boxShadow: m.role === 'user' ? '0 8px 24px rgba(139,92,246,0.3)' : '0 4px 16px rgba(0,0,0,0.2)'
                }}>
                  {m.content.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, idx) => {
                    if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx} style={{fontWeight: 700, color: m.role==='user'?'#fff':'#fff'}}>{part.slice(2, -2)}</strong>;
                    if (part.startsWith('*') && part.endsWith('*')) return <em key={idx}>{part.slice(1, -1)}</em>;
                    return part;
                  })}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', padding: '14px 18px', borderRadius: 20, borderBottomLeftRadius: 4, animation: 'fadeInUp 0.3s ease-out' }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  <div className="typing-dot" style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4, animation: 'blink 1.4s infinite both' }} />
                  <div className="typing-dot" style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4, animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }} />
                  <div className="typing-dot" style={{ width: 8, height: 8, background: 'rgba(255,255,255,0.5)', borderRadius: 4, animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.2)', display: 'flex', gap: 12, alignItems: 'center' }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={lang === 'id' ? 'Ketik pesan...' : 'Type a message...'}
              style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: 24, padding: '14px 20px', fontSize: 16, outline: 'none', transition: 'all 0.3s' }}
              onFocus={e => { e.target.style.borderColor = 'rgba(139,92,246,0.5)'; e.target.style.background = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = '0 0 0 2px rgba(139,92,246,0.2)'; }}
              onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)'; e.target.style.boxShadow = 'none'; }}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 48, height: 48, borderRadius: 24, background: input.trim() ? 'linear-gradient(135deg, #818cf8, #c084fc)' : 'rgba(255,255,255,0.05)', border: input.trim() ? 'none' : '1px solid rgba(255,255,255,0.1)', color: input.trim() ? '#fff' : 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.3s', boxShadow: input.trim() ? '0 4px 16px rgba(139,92,246,0.4)' : 'none' }}>
              <Send size={20} style={{ transform: input.trim() ? 'translateX(2px)' : 'none', transition: 'transform 0.2s' }} />
            </button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes blink { 0% { opacity: 0.2; transform: scale(0.8); } 20% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0.2; transform: scale(0.8); } }
        @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes pulseGlow { 0% { box-shadow: 0 8px 32px rgba(139,92,246,0.4), 0 0 0 0 rgba(139,92,246,0.4); } 70% { box-shadow: 0 8px 32px rgba(139,92,246,0.6), 0 0 0 15px rgba(139,92,246,0); } 100% { box-shadow: 0 8px 32px rgba(139,92,246,0.4), 0 0 0 0 rgba(139,92,246,0); } }
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}} />
    </>
  );
}

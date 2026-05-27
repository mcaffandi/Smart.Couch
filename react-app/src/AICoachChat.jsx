import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, Send, X } from 'lucide-react';

export default function AICoachChat({ lang, goal, programStyle, targetPace, currentUser }) {
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
    {
      match: /hujan|ujan|gerimis|deras|mendung|cuaca/,
      id: 'Kalau cuaca lagi nggak bersahabat (hujan/deras), mending ganti latihan *Strength Training* di rumah aja hari ini. Latih Core dan Glutes. Keselamatan nomor satu, jadwal larinya kita geser ke hari istirahat berikutnya!',
      en: 'If the weather is bad or it\'s pouring, it\'s better to do strength training indoors. Core and glutes. We can push today\'s run to tomorrow!'
    },
    {
      match: /capek|lelah|tired|pegal|cape|remuk|ngantuk|kurang tidur/,
      id: 'Badan lo lagi minta istirahat tuh. Coba cek *Resting HR* pagi ini, kalau naik drastis mending ambil **Total Rest**. Otot justru berkembang pas lo lagi istirahat, bukan pas lari!',
      en: 'Don\'t push it if you are exhausted. Check your resting HR; if it\'s spiked, take a Total Rest day. Muscles grow when you rest, not when you run!'
    },
    {
      match: /nyeri|sakit|pain|kram|cedera|lutut|engkel|betis/,
      id: 'Waduh, nyeri di bagian mana? Kalau nyerinya tajam menusuk (bukan pegal biasa), STOP lari. Kompres es (RICE) dan istirahat 2-3 hari. Jangan maksain ya, cedera itu mahal!',
      en: 'Where is the pain? If it\'s a sharp pain (not muscle soreness), STOP running. Apply ice and rest for 2-3 days.'
    },
    {
      match: /ngos|napas|engap|jantung|pace|hr|detak/,
      id: 'Pace itu cuma angka, bro! Kalau lo ngerasa ngos-ngosan atau napas berat di pace tertentu, **TURUNIN PACE-NYA**. Tujuan utama lari (apalagi Zone 2) itu ngebangun ketahanan jantung, bukan balapan. Coba selingin jalan kaki (Walk-Run) sampai napas lo stabil lagi.',
      en: 'Pace is just a number! If you are gasping for air, **SLOW DOWN**. The main goal of easy runs is to build aerobic base, not to race. Try Walk-Run intervals until your breathing stabilizes.'
    },
    {
      match: /sepatu|gear|pakaian|baju|celana/,
      id: 'Untuk latihan *Easy Run*, pake sepatu *Daily Trainer* yang empuk buat ngelindungin kaki. Tapi kalau jadwalnya *Interval* atau *Race*, baru deh keluarin sepatu yang responsif/carbon plate-nya.',
      en: 'For Easy Runs, use a cushioned Daily Trainer. Save the responsive carbon-plated shoes for Interval days or Race Day.'
    },
    {
      match: /halo|hi|hai|pagi|siang|malam|woy|bro|test|tes/,
      id: `Halo juga! Siap buat nge-crush target lari lo hari ini? 💪`,
      en: `Hello! Ready to crush your running goals today? 💪`
    },
    {
      match: /kalender|jadwal|plan|besok|latihan|menu/,
      id: `Coba cek tab "Training Plan" ya, gua udah siapin Kalender Berjalan (Adaptive) di situ. Kalau lo bolos, jadwalnya otomatis gua geser!`,
      en: `Check the "Training Plan" tab! I've set up an Adaptive Calendar for you. If you miss a run, I'll automatically reschedule it!`
    },
    {
      match: /makan|minum|nutrisi|gel|sarapan|lapar|haus|air/,
      id: `Makan berat wajib jeda 2-3 jam sebelum lari, bro! Kalau lari pagi dan laper, cukup makan pisang atau roti tawar + madu 30 menit sebelum jalan. Jangan lupa minum 200ml tiap 2-3km biar gak kram perut.`,
      en: `Wait 2-3 hours after a heavy meal before running! If it's a morning run, a banana or toast with honey 30 mins prior is enough. Drink 200ml every 2-3km to avoid cramps.`
    },
    {
      match: /geser|ubah|ganti|rubah|edit/,
      id: `Kalau lo mau ngubah jumlah hari latihan (misal dari 3x seminggu jadi 2x), lo bisa klik tombol "Edit Profil" di sidebar kiri. Kalau soal jadwal lari yang kelewat, tenang aja, kalender *Adaptive* otomatis ngegeser jadwal lo ke hari kosong berikutnya!`,
      en: `If you want to change your training frequency, edit your profile on the left sidebar. As for missed runs, my Adaptive Calendar will automatically shift them to your next available rest day!`
    },
    {
      match: /makasih|terima kasih|thanks|thx|tq/,
      id: `Sama-sama bro! Santai aja, kalau ada yang bingung soal lari langsung tanya ke gua ya. Keep running! 🏃‍♂️🔥`,
      en: `You're welcome! Feel free to ask if you need anything else. Keep running! 🏃‍♂️🔥`
    },
    {
      match: /vo2max|vo2 max|vo2/,
      id: `VO2Max itu ibarat cc mesin mobil, bro. Semakin gede, semakin banyak oksigen yang bisa diolah otot. Cara ningkatinnya? Perbanyak porsi lari santai (Zone 2) dan selipin 1x latihan interval/speed per minggu. Konsistensi kuncinya!`,
      en: `VO2Max is like your engine size. The bigger it is, the more oxygen your muscles can use. To increase it: do mostly easy runs (Zone 2) and add 1x speed/interval session per week. Consistency is key!`
    },
    {
      match: /stretching|pemanasan|pendinginan|warming up|cool down/,
      id: `Penting banget! **Sebelum lari:** Lakuin *Dynamic Stretching* (ayun kaki, lari di tempat, jumping jack) biar otot panas. **Sesudah lari:** Lakuin *Static Stretching* (tahan peregangan 15-20 detik) biar otot gak kaku besoknya.`,
      en: `Crucial! **Before run:** Do *Dynamic Stretching* (leg swings, high knees) to warm up. **After run:** Do *Static Stretching* (hold stretches 15-20s) to prevent stiffness.`
    },
    {
      match: /zone 2|zona 2|z2|maf|detak jantung/,
      id: `Zone 2 (atau MAF) itu lari santai yang HR-nya dijaga di kisaran 60-70% dari Max HR. Cirinya: lo masih bisa lari sambil ngobrol lancar tanpa ngos-ngosan. Ini penting buat ngebangun "fondasi" aerobik lo biar gak gampang capek.`,
      en: `Zone 2 is an easy run where your HR is at 60-70% of your Max HR. You should be able to hold a conversation without gasping. It builds your aerobic base so you don't tire easily.`
    },
    {
      match: /cadence|langkah|spm/,
      id: `Cadence itu jumlah langkah per menit (SPM). Target ideal buat kebanyakan pelari itu di atas **170 SPM**. Langkah yang lebih pendek dan cepat itu ngurangin beban di lutut lo dibanding langkah yang panjang-panjang (overstriding).`,
      en: `Cadence is your steps per minute (SPM). A good target is above **170 SPM**. Taking shorter, quicker steps reduces impact on your knees compared to overstriding.`
    },
    {
      match: /interval|sprint|kecepatan|ngebut/,
      id: `Latihan Interval itu lari ngebut (Zone 4/5) diselingi istirahat/jogging pelan. Fungsinya buat ngelatih VO2Max dan bikin lari santai lo kerasa makin gampang. Lakuin cukup 1x seminggu aja, sisanya fokus lari santai ya!`,
      en: `Interval training is running fast (Zone 4/5) alternated with slow recovery jogs. It improves VO2Max and makes your easy pace feel even easier. Limit this to 1x a week!`
    },
    {
      match: /siapa kamu|fungsi|bot|ai/,
      id: `Gua Coach AI bawaan dari EnduraUP! Gua dirancang buat jadi asisten lari pribadi lo. Gua bakal bantu jawab seputar jadwal, tips lari, sepatu, sampe keluhan cedera.`,
      en: `I am the EnduraUP Coach AI! Designed to be your personal running assistant. I can help with schedules, running tips, gear, and minor injury advice.`
    }
  ];

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const msgLower = userMsg.toLowerCase();
    // 1. Check Local Dictionary First (Instant Response)
    let matchedRule = null;
    for (const rule of localDictionary) {
      if (msgLower.match(rule.match)) {
        matchedRule = rule;
        break;
      }
    }

    if (matchedRule) {
      setTimeout(() => {
        setMessages(p => [...p, { role: 'assistant', content: lang === 'id' ? matchedRule.id : matchedRule.en }]);
        setIsTyping(false);
      }, 800); // slight delay for natural feel
      return;
    }

    // 2. Fallback to Real AI (Groq API)
    try {
      let apiKey = localStorage.getItem('groq_api_key');

      // Prepare conversation history for LLM
      const chatHistory = newMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const systemPrompt = lang === 'id' 
        ? `Lo adalah Coach AI EnduraUP, pelatih lari profesional yang friendly, suportif, dan asik (pake bahasa gaul lo/gue). User saat ini punya goal: ${goal}, style program: ${programStyle}, dan target pace: ${targetPace} min/km. Jawab pertanyaan user dengan singkat, padat, dan pakai emoji. Kasih tips lari yang praktis dan aman secara medis.`
        : `You are EnduraUP Coach AI, a professional, friendly, and supportive running coach. The user's current goal: ${goal}, program style: ${programStyle}, target pace: ${targetPace} min/km. Answer concisely with emojis. Provide practical and medically safe running tips.`;

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
          max_tokens: 150
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
      
      const aiReply = data.choices[0].message.content;
      setMessages(p => [...p, { role: 'assistant', content: aiReply }]);
    } catch (e) {
      setMessages(p => [...p, { role: 'assistant', content: lang === 'id' 
        ? `Waduh, koneksi ke otak AI gua gagal bro: ${e.message}` 
        : `Oops, failed to connect to my AI brain: ${e.message}` 
      }]);
    }
    
    setIsTyping(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed', bottom: 80, right: 20, zIndex: 9999,
          width: 56, height: 56, borderRadius: 28, background: 'var(--accent-purple)',
          color: '#fff', border: 'none', boxShadow: '0 4px 12px rgba(139,92,246,0.4)',
          display: isOpen ? 'none' : 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <MessageSquare size={24} />
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed', bottom: window.innerWidth < 768 ? 0 : 80, right: window.innerWidth < 768 ? 0 : 20, zIndex: 10000,
          width: window.innerWidth < 768 ? '100%' : 360, height: window.innerWidth < 768 ? '85vh' : 500,
          background: 'var(--bg-surface)', border: '1px solid var(--border)',
          borderRadius: window.innerWidth < 768 ? '20px 20px 0 0' : 20, display: 'flex', flexDirection: 'column',
          boxShadow: '0 12px 40px rgba(0,0,0,0.3)', overflow: 'hidden', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}>
          <div style={{ padding: '16px', background: 'var(--bg-card)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 20, background: 'linear-gradient(135deg, #818cf8, #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(139,92,246,0.3)' }}><Bot size={24} color="#fff" /></div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Coach AI</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{lang === 'id' ? 'Selalu siap membantu' : 'Always ready to help'}</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', transition: 'background 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--hover-overlay)'} onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                <X size={20} />
              </button>
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{ 
                  background: m.role === 'user' ? 'var(--accent-purple)' : 'var(--bg-card)',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  padding: '12px 16px', borderRadius: 18, borderBottomRightRadius: m.role === 'user' ? 4 : 18, borderBottomLeftRadius: m.role === 'assistant' ? 4 : 18,
                  fontSize: 13, lineHeight: 1.5, border: m.role === 'assistant' ? '1px solid var(--border)' : 'none',
                  boxShadow: m.role === 'assistant' ? 'none' : '0 2px 8px rgba(139,92,246,0.2)'
                }}>
                  {/* Basic markdown simulation for bold text */}
                  {m.content.split(/(\*\*.*?\*\*|\*.*?\*)/g).map((part, idx) => {
                    if (part.startsWith('**') && part.endsWith('**')) return <strong key={idx}>{part.slice(2, -2)}</strong>;
                    if (part.startsWith('*') && part.endsWith('*')) return <em key={idx}>{part.slice(1, -1)}</em>;
                    return part;
                  })}
                </div>
              </div>
            ))}
            {isTyping && (
              <div style={{ alignSelf: 'flex-start', background: 'var(--bg-card)', border: '1px solid var(--border)', padding: '12px 16px', borderRadius: 18, borderBottomLeftRadius: 4 }}>
                <div style={{ display: 'flex', gap: 4 }}>
                  <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: 3, animation: 'blink 1.4s infinite both' }} />
                  <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: 3, animation: 'blink 1.4s infinite both', animationDelay: '0.2s' }} />
                  <div className="typing-dot" style={{ width: 6, height: 6, background: 'var(--text-muted)', borderRadius: 3, animation: 'blink 1.4s infinite both', animationDelay: '0.4s' }} />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)', display: 'flex', gap: 10, alignItems: 'center' }}>
            <input 
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder={lang === 'id' ? 'Ketik pesan...' : 'Type a message...'}
              style={{ flex: 1, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: 24, padding: '12px 16px', fontSize: 13, outline: 'none' }}
            />
            <button onClick={handleSend} disabled={!input.trim()} style={{ width: 42, height: 42, borderRadius: 21, background: input.trim() ? 'var(--accent-purple)' : 'var(--bg-surface)', border: input.trim() ? 'none' : '1px solid var(--border)', color: input.trim() ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'default', transition: 'all 0.2s' }}>
              <Send size={18} />
            </button>
          </div>
        </div>
      )}
      <style dangerouslySetInnerHTML={{__html:`
        @keyframes blink { 0% { opacity: 0.2; } 20% { opacity: 1; } 100% { opacity: 0.2; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}} />
    </>
  );
}

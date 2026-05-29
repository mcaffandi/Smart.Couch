import React, { useState, useEffect, useRef } from 'react';
import { Bot, MessageSquare, Send, X } from 'lucide-react';

export default function AICoachChat({ lang, goal, programStyle, targetPace, currentUser, runActs, selectedDays }) {
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



  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    
    // Add user message to UI
    const newMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(newMessages);
    setInput('');
    setIsTyping(true);

    const msgLower = userMsg.toLowerCase();
    
    // 1. Direct to Real AI (Groq API)
    try {
      let apiKey = localStorage.getItem('groq_api_key');

      // Prepare conversation history for LLM
      const chatHistory = newMessages.map(m => ({
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

      const systemPrompt = lang === 'id' 
        ? `Lo adalah Coach AI EnduraUP, pelatih lari profesional yang friendly, suportif, dan asik (pake bahasa gaul lo/gue).
User saat ini punya target: ${goal}, style program: ${programStyle}, pace: ${targetPace} min/km.
INFO PENTING: Skor Konsistensi 7 hari terakhir user ini adalah ${consistencyScore}%.
Jika <50%, lo boleh roasting/teguran halus biar dia sadar kalau dia malas, lalu kasih semangat biar lari Easy Run aja dulu.
Jika >=80%, puji dia habis-habisan karena konsisten, dan kasih tahu dia udah siap dikasih menu berat kayak Interval.
Jawab pertanyaan user dengan singkat, padat, dan pakai emoji. Kasih tips lari yang praktis dan aman secara medis.`
        : `You are EnduraUP Coach AI, a professional, friendly, and supportive running coach.
User's goal: ${goal}, style: ${programStyle}, target pace: ${targetPace} min/km.
IMPORTANT: The user's 7-day consistency score is ${consistencyScore}%.
If <50%, give them a playful roast/tough love about being lazy, then encourage them to just do an Easy Run to build the habit.
If >=80%, praise them highly for being consistent and let them know they are ready for tough Interval workouts.
Answer concisely with emojis. Provide practical and medically safe running tips.`;

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

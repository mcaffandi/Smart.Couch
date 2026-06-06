import { useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup } from './firebase';
import { signInWithCredential, GoogleAuthProvider } from 'firebase/auth';

// ─── Toast component ──────────────────────────────────────────────────────────
export function Toast({ toasts }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.type}`}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

// ─── Custom Google One Tap UI / Native Fallback ──────────────────────────────────
export function CustomOneTap({ onSignIn, onClose, lang = 'id' }) {
  const [show, setShow] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID; // Must be set in .env or Vercel
  
  useEffect(() => {
    const dismissed = sessionStorage.getItem('enduraup_onetap_dismissed');
    if (dismissed || window.enduraupOneTapPrompted) return;
    
    // If native client ID is available, use real Google One Tap
    if (clientId) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response) => {
              try {
                const credential = GoogleAuthProvider.credential(response.credential);
                await signInWithCredential(auth, credential);
                setShow(false);
              } catch (e) {
                console.error("Google One Tap Auth Error:", e);
                onSignIn(); // Fallback to normal popup if it fails
              }
            },
            cancel_on_tap_outside: false,
            prompt_parent_id: 'google-one-tap-container'
          });
          if (!window.enduraupOneTapPrompted) {
            window.enduraupOneTapPrompted = true;
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                // Fallback to custom UI if native fails to display
                setShow(true);
              }
            });
          }
        }
      };
      document.body.appendChild(script);
      return () => { 
        if (document.body.contains(script)) {
          document.body.removeChild(script); 
        }
      };
    } else {
      // Fallback to custom UI
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [clientId, onSignIn]);

  const handleClose = () => {
    setShow(false);
    sessionStorage.setItem('enduraup_onetap_dismissed', 'true');
    if (onClose) onClose();
  };

  if (!show) {
    return <div id="google-one-tap-container" style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999 }} />;
  }

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 99999,
      background: 'var(--bg-surface)', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
      width: 360, maxWidth: 'calc(100vw - 40px)', overflow: 'hidden', fontFamily: 'Inter, sans-serif',
      animation: 'slideDownFade 0.4s cubic-bezier(0.16, 1, 0.3, 1)', border: '1px solid var(--border)'
    }}>
      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <div style={{ width: 40, height: 40, background: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Sign in to EnduraUP</div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lang === 'id' ? 'dengan Akun Google' : 'with Google Account'}</div>
          </div>
        </div>
        <button aria-label="Close" onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div style={{ padding: '16px 20px', background: 'var(--bg-card)' }}>
        <button 
          onClick={() => { setShow(false); onSignIn(); }} 
          style={{ width: '100%', padding: '12px', background: '#1a73e8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}
          onMouseOver={e => e.currentTarget.style.background = '#1557b0'}
          onMouseOut={e => e.currentTarget.style.background = '#1a73e8'}
        >
          {lang === 'id' ? 'Lanjutkan sebagai Anda' : 'Continue as yourself'}
        </button>
      </div>
    </div>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────
export function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div className="collapsible-header" onClick={() => setOpen(o => !o)}>
        <span>{title}</span>
        <span style={{ fontSize: 12, transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
      </div>
      {open && <div className="collapsible-content">{children}</div>}
    </div>
  );
}

// ─── Number input ─────────────────────────────────────────────────────────────
export function NumberInput({ value, onChange, min, max, step = 1, label }) {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="number-input-group">
        <button type="button" onClick={() => onChange(Math.max(min ?? -Infinity, parseFloat((value - step).toFixed(2))))}>−</button>
        <input
          type="number" value={value} min={min} max={max} step={step}
          onChange={e => onChange(parseFloat(e.target.value) || 0)}
        />
        <button type="button" onClick={() => onChange(Math.min(max ?? Infinity, parseFloat((value + step).toFixed(2))))}>+</button>
      </div>
    </div>
  );
}

export const LiveCountdown = ({ endTimestamp, lang }) => {
  const [timeLeft, setTimeLeft] = useState(() => Math.max(0, endTimestamp - Date.now()));

  useEffect(() => {
    if (!endTimestamp) return;
    
    // Initial update in case time passed between render and mount
    setTimeLeft(Math.max(0, endTimestamp - Date.now()));
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, endTimestamp - Date.now());
      setTimeLeft(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTimestamp]);

  if (!endTimestamp || timeLeft <= 0) return <span>{lang === 'id' ? 'Selesai' : 'Done'}</span>;

  const totalSeconds = Math.floor(timeLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  
  const pad = (n) => n.toString().padStart(2, '0');

  return (
    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
      {lang === 'id' ? 'Sisa:' : 'Left:'} {hours > 0 ? `${hours}h ` : ''}{pad(minutes)}m {pad(seconds)}s
    </span>
  );
};

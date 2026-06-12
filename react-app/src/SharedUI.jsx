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
              // Only native UI is used; no fallback UI.
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
    }
  }, [clientId, onSignIn]);

  return <div id="google-one-tap-container" style={{ position: 'fixed', top: 20, right: 20, zIndex: 99999 }} />;
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
  const [localVal, setLocalVal] = useState(() => value.toString());

  useEffect(() => {
    if (parseFloat(localVal) !== value) {
      setLocalVal(value.toString());
    }
  }, [value]);

  const handleChange = (e) => {
    let valStr = e.target.value;
    if (/^0+(?=\d)/.test(valStr)) {
      valStr = valStr.replace(/^0+(?=\d)/, '');
    }
    setLocalVal(valStr);
    onChange(parseFloat(valStr) || 0);
  };

  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="number-input-group">
        <button type="button" onClick={() => onChange(Math.max(min ?? -Infinity, parseFloat((value - step).toFixed(2))))}>−</button>
        <input
          type="number" value={localVal} min={min} max={max} step={step}
          onChange={handleChange}
          onBlur={() => setLocalVal(value.toString())}
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

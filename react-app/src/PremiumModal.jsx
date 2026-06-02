import { useState } from 'react';

export default function PremiumModal({ onClose, onUpgrade, isPremium, lang = 'id' }) {
  const [loading, setLoading] = useState(false);

  const handleUpgrade = () => {
    setLoading(true);
    setTimeout(() => {
      onUpgrade();
      setLoading(false);
      onClose();
    }, 1500);
  };

  return (
    <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000 }}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 450, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1), transparent)' }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              👑 EnduraUP PRO
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
              {lang === 'id' ? 'Buka semua potensi latihanmu' : 'Unlock your full training potential'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24, padding: 4 }}>×</button>
        </div>

        <div style={{ padding: '24px' }}>
          {isPremium ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{lang === 'id' ? 'Kamu sudah PRO!' : 'You are PRO!'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{lang === 'id' ? 'Nikmati semua fitur premium EnduraUP.' : 'Enjoy all EnduraUP premium features.'}</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ color: 'var(--accent-purple)', fontSize: 20 }}>✨</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{lang === 'id' ? 'Analisis AI Lanjutan' : 'Advanced AI Analysis'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lang === 'id' ? 'Dapatkan wawasan lebih dalam dari data lari dan tidurmu.' : 'Get deeper insights from your run and sleep data.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ color: '#fbbf24', fontSize: 20 }}>📊</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{lang === 'id' ? 'Statistik Tak Terbatas' : 'Unlimited Statistics'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lang === 'id' ? 'Lihat tren performa untuk rentang waktu berapapun.' : 'View performance trends for any time range.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ color: '#10b981', fontSize: 20 }}>🏃</div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{lang === 'id' ? 'Program Latihan Eksklusif' : 'Exclusive Training Programs'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{lang === 'id' ? 'Rencana maraton dan ultra yang dipersonalisasi penuh.' : 'Fully personalized marathon and ultra plans.'}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-card)', padding: '16px', borderRadius: 12, border: '1px solid var(--accent-purple)', marginBottom: 24, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 0', letterSpacing: 1 }}>
                  🔥 KUOTA PROMO TERBATAS: SISA 10 ORANG! 🔥
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 20 }}>{lang === 'id' ? 'Harga Spesial' : 'Special Price'}</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-primary)' }}>Rp 29.000<span style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 500 }}>/bln</span></div>
                <div style={{ fontSize: 12, color: '#10b981', fontWeight: 600, marginTop: 4 }}>Lebih murah dari secangkir kopi! ☕</div>
                
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>{lang === 'id' ? 'Langkah Upgrade:' : 'Upgrade Steps:'}</div>
                  <ol style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-primary)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <li>{lang === 'id' ? 'Transfer ke BCA 1234567890 a/n EnduraUP' : 'Transfer to BCA 1234567890 (EnduraUP)'}</li>
                    <li>{lang === 'id' ? 'Klik tombol di bawah untuk konfirmasi via WhatsApp' : 'Click the button below to confirm via WhatsApp'}</li>
                    <li>{lang === 'id' ? 'Kirimkan bukti transfer dan Email akun kamu' : 'Send the transfer proof and your account Email'}</li>
                    <li>{lang === 'id' ? 'Admin akan mengaktifkan status PRO kamu!' : 'Admin will activate your PRO status!'}</li>
                  </ol>
                </div>
              </div>

              <a 
                href={`https://wa.me/6281234567890?text=${encodeURIComponent('Halo Admin EnduraUP, saya ingin konfirmasi pembayaran untuk Upgrade ke akun PRO.\n\nEmail akun saya: \n\n[Silakan lampirkan foto bukti transfer di sini]')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-primary" 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', width: '100%', height: 48, fontSize: 16, background: '#10b981', border: 'none', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)' }}
              >
                <span style={{ marginRight: 8 }}>💬</span> {lang === 'id' ? 'Konfirmasi via WhatsApp' : 'Confirm via WhatsApp'}
              </a>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

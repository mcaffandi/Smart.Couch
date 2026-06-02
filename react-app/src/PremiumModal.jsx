import { useState, useMemo } from 'react';
import { Crown, Sparkles, BarChart2, Activity, UploadCloud, ArrowRight, ArrowLeft, CheckCircle, ShieldCheck } from 'lucide-react';

export default function PremiumModal({ onClose, onUpgrade, isPremium, lang = 'id' }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState(1); // 1 = Info, 2 = Checkout
  
  // Generate a random unique code between 11 and 99
  const uniqueCode = useMemo(() => Math.floor(11 + Math.random() * 88), []);
  const basePrice = 29000;
  const totalPrice = basePrice + uniqueCode;

  const handleUpgrade = async () => {
    if (!receipt) {
      alert(lang === 'id' ? 'Harap upload bukti transfer terlebih dahulu.' : 'Please upload transfer receipt first.');
      return;
    }
    setLoading(true);
    try {
      await onUpgrade(receipt, totalPrice); 
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {step === 2 && (
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', transition: 'color 0.2s' }} onMouseOver={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseOut={e => e.currentTarget.style.color = 'var(--text-secondary)'}>
                <ArrowLeft size={20} />
              </button>
            )}
            <div style={{ width: 44, height: 44, borderRadius: 14, background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Crown size={22} color="var(--accent-emerald)" />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {step === 1 ? 'EnduraUP PRO' : (lang === 'id' ? 'Selesaikan Pembayaran' : 'Complete Payment')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
                {step === 1 ? (lang === 'id' ? 'Buka semua potensi latihanmu' : 'Unlock your full training potential') : (lang === 'id' ? 'Selangkah lagi menuju PRO' : 'One step away from PRO')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%', transition: 'all 0.2s' }} onMouseOver={e => { e.currentTarget.style.background = 'var(--bg-base)'; e.currentTarget.style.color = 'var(--text-primary)' }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Content */}
        <div style={{ padding: '30px' }}>
          {isPremium ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: 32, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <ShieldCheck size={32} />
              </div>
              <h3 style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 800, marginBottom: 8, letterSpacing: '-0.5px' }}>{lang === 'id' ? 'Akun PRO Aktif' : 'PRO Account Active'}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 15, lineHeight: 1.6 }}>{lang === 'id' ? 'Kamu sudah bisa menikmati semua fitur premium EnduraUP tanpa batas.' : 'You can now enjoy all EnduraUP premium features without limits.'}</p>
            </div>
          ) : step === 1 ? (
            // --- STEP 1: Info ---
            <div className="animate-fade-in">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 36 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Analisis AI Lanjutan' : 'Advanced AI Analysis'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lang === 'id' ? 'Dapatkan wawasan mendalam dari rutinitas lari dan tidur harian.' : 'Get deep insights from your daily running and sleep routines.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <BarChart2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Statistik Tanpa Batas' : 'Unlimited Statistics'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lang === 'id' ? 'Buka akses riwayat performa penuh untuk semua rentang waktu.' : 'Unlock full performance history access for all time ranges.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', flexShrink: 0 }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Program Eksklusif' : 'Exclusive Programs'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{lang === 'id' ? 'Rencana maraton yang dipersonalisasi sesuai targetmu.' : 'Personalized marathon plans tailored to your specific goals.'}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24, textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 6 }}>
                  <div style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 600 }}>Rp</div>
                  <div style={{ fontSize: 44, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1.5px' }}>29.000</div>
                  <div style={{ fontSize: 16, color: 'var(--text-secondary)', fontWeight: 500 }}>/bln</div>
                </div>
                <div style={{ fontSize: 13, color: 'var(--accent-emerald)', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  {lang === 'id' ? 'Lebih hemat dari secangkir kopi' : 'More affordable than a cup of coffee'}
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="btn" 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 12, transition: 'all 0.2s', cursor: 'pointer' }}
                onMouseOver={e => e.currentTarget.style.transform = 'translateY(-1px)'}
                onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {lang === 'id' ? 'Lanjutkan Pembayaran' : 'Proceed to Payment'}
                <ArrowRight size={18} />
              </button>
            </div>
          ) : (
            // --- STEP 2: Checkout ---
            <div className="animate-fade-in">
              <div style={{ background: 'var(--bg-base)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)', marginBottom: 24, textAlign: 'center' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{lang === 'id' ? 'Total Transfer' : 'Total Transfer'}</div>
                <div style={{ fontSize: 38, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
                  {formatCurrency(totalPrice)}
                </div>
                <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.2)', padding: '12px 16px', borderRadius: 10, marginTop: 16, textAlign: 'left', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ color: '#f59e0b', fontSize: 16, marginTop: 2 }}>ℹ️</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {lang === 'id' ? (
                      <>Pastikan transfer tepat <strong>hingga 2 digit terakhir ({uniqueCode})</strong> agar otomatis terdeteksi sistem.</>
                    ) : (
                      <>Ensure the transfer exactly matches the <strong>last 2 digits ({uniqueCode})</strong> for auto-detection.</>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 700, marginBottom: 16 }}>
                  {lang === 'id' ? 'Instruksi Pembayaran' : 'Payment Instructions'}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                    <div style={{ paddingTop: 2 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{lang === 'id' ? 'Transfer ke Rekening BCA' : 'Transfer to BCA Account'}</div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>No: <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 16, userSelect: 'all' }}>1234 5678 90</span></div>
                      <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>A/N: <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>EnduraUP App</span></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 14, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                    <div style={{ width: '100%', paddingTop: 2 }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 12 }}>{lang === 'id' ? 'Upload Bukti Transfer' : 'Upload Transfer Receipt'}</div>
                      
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '90px', border: receipt ? '1px solid var(--accent-emerald)' : '1px dashed var(--border-light)', borderRadius: 12, cursor: 'pointer', background: receipt ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-base)', transition: 'all 0.2s' }} onMouseOver={e => { if (!receipt) { e.currentTarget.style.borderColor = 'var(--text-muted)'; e.currentTarget.style.background = 'var(--bg-surface)'; } }} onMouseOut={e => { if (!receipt) { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.background = 'var(--bg-base)'; } }}>
                        {receipt ? (
                          <>
                            <CheckCircle size={26} color="var(--accent-emerald)" style={{ marginBottom: 8 }} />
                            <span style={{ fontSize: 13, color: 'var(--accent-emerald)', fontWeight: 600, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {receipt.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={26} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>
                              {lang === 'id' ? 'Pilih Gambar Resi' : 'Select Receipt Image'}
                            </span>
                          </>
                        )}
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              setReceipt(e.target.files[0]);
                            }
                          }}
                          style={{ display: 'none' }} 
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleUpgrade}
                disabled={loading}
                className="btn" 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 10, width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 12, transition: 'all 0.2s', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
                onMouseOver={e => !loading && (e.currentTarget.style.transform = 'translateY(-1px)')}
                onMouseOut={e => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Konfirmasi Pembayaran' : 'Confirm Payment')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

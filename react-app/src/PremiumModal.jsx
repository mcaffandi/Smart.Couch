import { useState, useMemo } from 'react';
import { Crown, Sparkles, BarChart2, Activity, UploadCloud, MessageCircle, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function PremiumModal({ onClose, onUpgrade, isPremium, lang = 'id' }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState(1); // 1 = Info, 2 = Checkout
  
  // Generate a random 3-digit unique code between 100 and 999
  const uniqueCode = useMemo(() => Math.floor(100 + Math.random() * 900), []);
  const basePrice = 29000;
  const totalPrice = basePrice + uniqueCode;

  const handleUpgrade = async () => {
    if (!receipt) {
      alert(lang === 'id' ? 'Harap upload bukti transfer terlebih dahulu.' : 'Please upload transfer receipt first.');
      return;
    }
    setLoading(true);
    try {
      await onUpgrade(receipt, totalPrice); // Pass total price if needed
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
    <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000, backdropFilter: 'blur(8px)' }}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 20, width: '100%', maxWidth: 450, maxHeight: '92vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(0,0,0,0.4)' }}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.15) 0%, rgba(167, 139, 250, 0.05) 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step === 2 && (
              <button onClick={() => setStep(1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, var(--accent-purple), #c084fc)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(167, 139, 250, 0.4)' }}>
              <Crown size={22} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                {step === 1 ? 'EnduraUP PRO' : 'Checkout'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>
                {step === 1 ? (lang === 'id' ? 'Buka semua potensi latihanmu' : 'Unlock your full training potential') : (lang === 'id' ? 'Selesaikan pembayaranmu' : 'Complete your payment')}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 16, transition: 'all 0.2s' }}>✕</button>
        </div>

        <div style={{ padding: '24px' }}>
          {isPremium ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{lang === 'id' ? 'Kamu sudah PRO!' : 'You are PRO!'}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>{lang === 'id' ? 'Nikmati semua fitur premium EnduraUP.' : 'Enjoy all EnduraUP premium features.'}</p>
            </div>
          ) : step === 1 ? (
            // --- STEP 1: Info ---
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(167, 139, 250, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-purple)', flexShrink: 0 }}>
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Analisis AI Lanjutan' : 'Advanced AI Analysis'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lang === 'id' ? 'Dapatkan wawasan lebih dalam dari data lari dan tidur tanpa batas mingguan.' : 'Get deeper insights from your run and sleep data without weekly limits.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(251, 191, 36, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24', flexShrink: 0 }}>
                    <BarChart2 size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Statistik Tak Terbatas' : 'Unlimited Statistics'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lang === 'id' ? 'Lihat tren performa untuk rentang waktu berapapun.' : 'View performance trends for any time range.'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981', flexShrink: 0 }}>
                    <Activity size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4, fontSize: 15 }}>{lang === 'id' ? 'Program Latihan Eksklusif' : 'Exclusive Training Programs'}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{lang === 'id' ? 'Rencana maraton dan ultra yang dipersonalisasi penuh.' : 'Fully personalized marathon and ultra plans.'}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'linear-gradient(135deg, rgba(30,41,59,0.8), rgba(15,23,42,0.9))', padding: '24px', borderRadius: 16, border: '1px solid rgba(167, 139, 250, 0.3)', marginBottom: 24, textAlign: 'center', position: 'relative', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.2)' }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 100, height: 100, background: 'var(--accent-purple)', filter: 'blur(50px)', opacity: 0.3, borderRadius: '50%' }}></div>
                
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, background: 'linear-gradient(90deg, #f43f5e, #fb923c)', color: '#fff', fontSize: 11, fontWeight: 800, padding: '6px 0', letterSpacing: 1 }}>
                  🔥 KUOTA PROMO: SISA 10 ORANG 🔥
                </div>
                
                <div style={{ fontSize: 13, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginTop: 20, fontWeight: 600 }}>{lang === 'id' ? 'Harga Spesial' : 'Special Price'}</div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                  <div style={{ fontSize: 40, fontWeight: 800, color: '#fff', letterSpacing: '-1px' }}>Rp 29.000</div>
                  <div style={{ fontSize: 16, color: 'var(--text-muted)', fontWeight: 500 }}>/bln</div>
                </div>
                <div style={{ fontSize: 13, color: '#34d399', fontWeight: 600, marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  Lebih murah dari secangkir kopi!
                </div>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="btn btn-primary" 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', height: 52, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, var(--accent-purple), #c084fc)', border: 'none', boxShadow: '0 8px 20px rgba(167, 139, 250, 0.3)', borderRadius: 12, transition: 'transform 0.2s, box-shadow 0.2s', cursor: 'pointer' }}
              >
                {lang === 'id' ? 'Lanjutkan ke Pembayaran' : 'Proceed to Payment'}
                <ArrowRight size={20} />
              </button>
            </>
          ) : (
            // --- STEP 2: Checkout ---
            <>
              <div style={{ background: 'var(--bg-card)', padding: '20px', borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Total Pembayaran</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '-0.5px' }}>
                  {formatCurrency(totalPrice)}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  <div style={{ color: '#f59e0b', marginTop: 2 }}>⚠️</div>
                  <div style={{ lineHeight: 1.5 }}>
                    {lang === 'id' ? (
                      <>Pastikan nominal transfer sesuai hingga <strong>3 digit terakhir</strong> ({uniqueCode}) untuk mempercepat proses verifikasi otomatis.</>
                    ) : (
                      <>Ensure the transfer amount matches exactly to the <strong>last 3 digits</strong> ({uniqueCode}) to speed up automatic verification.</>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 20, marginBottom: 24 }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{lang === 'id' ? 'Langkah Pembayaran:' : 'Payment Steps:'}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                    <div>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>{lang === 'id' ? 'Transfer ke Rekening BCA' : 'Transfer to BCA Account'}</div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>No. Rekening: <strong style={{ color: 'var(--text-primary)', fontSize: 15 }}>1234567890</strong></div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>A/N: <strong style={{ color: 'var(--text-primary)' }}>EnduraUP</strong></div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 24, height: 24, borderRadius: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                    <div style={{ width: '100%' }}>
                      <div style={{ fontSize: 14, color: 'var(--text-primary)', fontWeight: 600, marginBottom: 8 }}>{lang === 'id' ? 'Upload Bukti Transfer' : 'Upload Transfer Receipt'}</div>
                      
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '80px', border: receipt ? '1px solid #10b981' : '1px dashed var(--border)', borderRadius: 12, cursor: 'pointer', background: receipt ? 'rgba(16, 185, 129, 0.05)' : 'var(--bg-surface)', transition: 'all 0.2s' }}>
                        {receipt ? (
                          <>
                            <CheckCircle size={24} color="#10b981" style={{ marginBottom: 4 }} />
                            <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                              {receipt.name}
                            </span>
                          </>
                        ) : (
                          <>
                            <UploadCloud size={24} color="var(--text-muted)" style={{ marginBottom: 4 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                              {lang === 'id' ? 'Pilih Gambar Bukti Transfer' : 'Select Receipt Image'}
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
                className="btn btn-primary" 
                style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, width: '100%', height: 52, fontSize: 16, fontWeight: 700, background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)', borderRadius: 12, transition: 'transform 0.2s, box-shadow 0.2s', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? (lang === 'id' ? 'Memproses...' : 'Processing...') : (lang === 'id' ? 'Konfirmasi Pembayaran' : 'Confirm Payment')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

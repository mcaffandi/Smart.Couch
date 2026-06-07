import { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, UploadCloud, ChevronDown, ChevronUp, Copy, CheckCircle, Clock, ArrowLeft } from 'lucide-react';
import { auth } from './firebase';

export default function PremiumModal({ onClose, onUpgrade, isPremium, lang = 'id', globalSettings = {} }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState(1); // 1 = Product Page, 2 = Payment Info (QRIS), 3 = Upload Proof
  const [copied, setCopied] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(1);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 - 1); // 24 hours in seconds

  useEffect(() => {
    if (step === 2 || step === 3) {
      const timer = setInterval(() => {
        setTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const uniqueCode = useMemo(() => Math.floor(11 + Math.random() * 88), []);
  const orderId = useMemo(() => `INV-ENDURA-${Math.floor(10000 + Math.random() * 90000)}`, []);
  
  const price1Month = globalSettings?.proPrice1Month ?? 29000;
  const price3Months = globalSettings?.proPrice3Months ?? 79000;
  const price6Months = globalSettings?.proPrice6Months ?? 149000;
  
  const basePrice = selectedPackage === 6 ? price6Months : selectedPackage === 3 ? price3Months : price1Month;
  const totalPrice = basePrice + uniqueCode;
  
  const quotaRemaining = globalSettings?.proQuotaRemaining ?? 9;

  const qrisImageUrl = globalSettings?.qrisImageUrl || '';

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
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
      <div className="animate-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {step > 1 && (
              <button onClick={() => setStep(step - 1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', padding: 4, display: 'flex' }}>
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                {step === 1 ? 'EnduraUP PRO' : step === 2 ? (lang === 'id' ? 'Pembayaran' : 'Payment') : (lang === 'id' ? 'Konfirmasi' : 'Confirmation')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
                {step === 1 ? (lang === 'id' ? 'Tingkatkan performa latihanmu' : 'Upgrade your training performance') : `Order: ${orderId}`}
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>✕</button>
        </div>

        <div style={{ padding: '30px' }}>
          {step === 1 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pilih Paket Berlangganan</span>
                  
                  {/* Package Options */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div 
                      onClick={() => setSelectedPackage(1)}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${selectedPackage === 1 ? 'var(--accent-purple)' : 'var(--border)'}`, background: selectedPackage === 1 ? 'rgba(167, 139, 250, 0.05)' : 'var(--bg-surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedPackage === 1 ? 'var(--accent-purple)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedPackage === 1 && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)' }} />}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>1 Bulan</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(price1Month)}</span>
                    </div>

                    <div 
                      onClick={() => setSelectedPackage(3)}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${selectedPackage === 3 ? 'var(--accent-purple)' : 'var(--border)'}`, background: selectedPackage === 3 ? 'rgba(167, 139, 250, 0.05)' : 'var(--bg-surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedPackage === 3 ? 'var(--accent-purple)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedPackage === 3 && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)' }} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>3 Bulan</span>
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Lebih Hemat</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(price3Months)}</span>
                    </div>

                    <div 
                      onClick={() => setSelectedPackage(6)}
                      style={{ padding: 16, borderRadius: 12, border: `2px solid ${selectedPackage === 6 ? 'var(--accent-purple)' : 'var(--border)'}`, background: selectedPackage === 6 ? 'rgba(167, 139, 250, 0.05)' : 'var(--bg-surface)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.2s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${selectedPackage === 6 ? 'var(--accent-purple)' : 'var(--text-muted)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {selectedPackage === 6 && <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent-purple)' }} />}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>6 Bulan</span>
                          <span style={{ fontSize: 11, color: '#10b981', fontWeight: 600 }}>Paling Hemat</span>
                        </div>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(price6Months)}</span>
                    </div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '4px 12px', borderRadius: 12, fontWeight: 700 }}>
                    {lang === 'id' ? `🔥 Promo Terbatas! Sisa Kuota: ${quotaRemaining}` : `🔥 Limited Time! Remaining Quota: ${quotaRemaining}`}
                  </span>
                </div>

                <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <li>Analisis AI Lanjutan tanpa batas</li>
                  <li>Riwayat data & statistik performa penuh</li>
                  <li>Rencana latihan terpersonalisasi</li>
                  <li style={{ color: '#10b981', fontWeight: 600 }}>{lang === 'id' ? 'Bonus: Integrasi Strava Sync' : 'Bonus: Strava Sync Integration'}</li>
                </ul>
              </div>

              <button 
                onClick={() => setStep(2)}
                className="btn" 
                style={{ width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}
              >
                {lang === 'id' ? `Beli Sekarang (${formatCurrency(basePrice)})` : `Buy Now (${formatCurrency(basePrice)})`}
                <ShieldCheck size={18} color="var(--bg-base)" />
              </button>
            </>
          )}

          {step === 2 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ textAlign: 'center', background: 'var(--bg-surface)', padding: '24px', borderRadius: 16, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Pembayaran</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: 'var(--accent-purple)', letterSpacing: '-1px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {formatCurrency(totalPrice)}
                  <button onClick={() => copyToClipboard(totalPrice.toString())} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 4 }}>
                    {copied ? <CheckCircle size={18} color="#10b981" /> : <Copy size={18} />}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 12, fontWeight: 600, background: 'rgba(245, 158, 11, 0.1)', padding: '8px 12px', borderRadius: 8, display: 'inline-block' }}>
                  ⚠️ {lang === 'id' ? 'PENTING: Transfer tepat sesuai nominal hingga 2 digit terakhir agar otomatis terverifikasi!' : 'IMPORTANT: Transfer the exact amount including the last 2 digits for automatic verification!'}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
                  {lang === 'id' ? 'Scan QRIS untuk Membayar' : 'Scan QRIS to Pay'}
                </div>
                {qrisImageUrl ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '16px', background: '#fff', borderRadius: 16, border: '1px dashed var(--border)' }}>
                    <img src={qrisImageUrl} alt="QRIS" style={{ width: '200px', height: '200px', objectFit: 'contain' }} />
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '32px 0', background: 'var(--bg-surface)', borderRadius: 16, border: '1px dashed var(--border)' }}>
                    {lang === 'id' ? 'QRIS tidak tersedia' : 'QRIS not available'}
                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 13, marginTop: 8 }}>
                  <Clock size={14} />
                  <span>{lang === 'id' ? 'Selesaikan pembayaran dalam' : 'Complete payment in'} <strong style={{ color: '#ef4444' }}>{formatTime(timeLeft)}</strong></span>
                </div>
              </div>

              <button 
                onClick={() => setStep(3)}
                className="btn" 
                style={{ width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'all 0.2s', marginTop: 12 }}
              >
                {lang === 'id' ? 'Saya Sudah Bayar' : 'I Have Paid'}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                  {lang === 'id' ? 'Upload Bukti Pembayaran' : 'Upload Payment Proof'}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                  {lang === 'id' ? 'Lampirkan screenshot bukti transfer Anda' : 'Attach your transfer receipt screenshot'}
                </div>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 20px', border: '2px dashed var(--border)', borderRadius: 16, cursor: 'pointer', background: receipt ? 'rgba(167, 139, 250, 0.05)' : 'var(--bg-surface)', transition: 'all 0.2s' }}>
                <UploadCloud size={48} color={receipt ? 'var(--accent-purple)' : 'var(--text-muted)'} style={{ marginBottom: 16 }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: receipt ? 'var(--accent-purple)' : 'var(--text-secondary)', textAlign: 'center' }}>
                  {receipt ? receipt.name : (lang === 'id' ? 'Klik untuk pilih file' : 'Click to select file')}
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                  JPG, PNG (Max. 5MB)
                </span>
                <input 
                  type="file" 
                  accept="image/*" 
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setReceipt(e.target.files[0]);
                    }
                  }}
                />
              </label>

              <button 
                onClick={handleUpgrade}
                disabled={loading || !receipt}
                className="btn" 
                style={{ width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: loading || !receipt ? 'var(--border)' : 'var(--text-primary)', color: loading || !receipt ? 'var(--text-muted)' : 'var(--bg-base)', border: 'none', borderRadius: 12, cursor: loading || !receipt ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                {loading ? (lang === 'id' ? 'Mengirim...' : 'Sending...') : (lang === 'id' ? 'Konfirmasi Pembayaran' : 'Confirm Payment')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

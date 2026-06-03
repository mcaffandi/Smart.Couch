import { useState, useMemo, useEffect } from 'react';
import { ShieldCheck, UploadCloud, ChevronDown, ChevronUp, Copy, CheckCircle, Clock } from 'lucide-react';

export default function PremiumModal({ onClose, onUpgrade, isPremium, lang = 'id' }) {
  const [loading, setLoading] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [step, setStep] = useState(1); // 1 = Product Page, 2 = Payment Gateway (Xendit style)
  const [showOrderSummary, setShowOrderSummary] = useState(false);
  const [copied, setCopied] = useState(false);
  
  // Timer state
  const [timeLeft, setTimeLeft] = useState(24 * 60 * 60 - 1); // 24 hours in seconds

  useEffect(() => {
    if (step === 2) {
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

  // Generate a random unique code between 11 and 99
  const uniqueCode = useMemo(() => Math.floor(11 + Math.random() * 88), []);
  const orderId = useMemo(() => `INV-ENDURA-${Math.floor(10000 + Math.random() * 90000)}`, []);
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(amount);
  };

  // -------------------------------------------------------------
  // STEP 1: PRODUCT PAGE
  // -------------------------------------------------------------
  if (step === 1) {
    return (
      <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 10000, backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.7)' }}>
        <div className="animate-fade-in" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ padding: '24px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                EnduraUP PRO
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 500 }}>
                {lang === 'id' ? 'Tingkatkan performa latihanmu' : 'Upgrade your training performance'}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>✕</button>
          </div>

          <div style={{ padding: '30px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 32 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>1Bln Berlangganan PRO</span>
                  <span style={{ fontSize: 11, background: 'rgba(245, 158, 11, 0.15)', color: '#d97706', padding: '3px 8px', borderRadius: 12, width: 'fit-content', fontWeight: 700 }}>
                    {lang === 'id' ? '🔥 Sisa Kuota: 9/10' : '🔥 Remaining Quota: 9/10'}
                  </span>
                </div>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>Rp 29.000</span>
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
              style={{ width: '100%', height: 54, fontSize: 15, fontWeight: 700, background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', borderRadius: 12, cursor: 'pointer' }}
            >
              {lang === 'id' ? 'Beli Sekarang (Rp 29.000)' : 'Buy Now (Rp 29.000)'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // STEP 2: PAYMENT GATEWAY (XENDIT STYLE)
  // -------------------------------------------------------------
  return (
    <div className="profile-modal-backdrop" style={{ zIndex: 10000, backgroundColor: '#f4f5f7', backdropFilter: 'none' }}>
      <div className="animate-fade-in" style={{ width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', padding: '20px 0' }}>
        
        {/* Gateway Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, padding: '0 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={20} color="#10b981" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#1f2937' }}>EnduraUP Secure Pay</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Batalkan</button>
        </div>

        {/* Invoice Card */}
        <div style={{ background: '#ffffff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' }}>
          
          {/* Amount Header */}
          <div style={{ padding: '24px', textAlign: 'center', background: '#ffffff', borderBottom: '1px solid #f3f4f6' }}>
            <div style={{ fontSize: 13, color: '#6b7280', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Pembayaran</div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#111827', letterSpacing: '-1px' }}>
              {formatCurrency(totalPrice)}
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, fontSize: 13, color: '#d97706', background: '#fef3c7', padding: '6px 12px', borderRadius: 20 }}>
              <Clock size={14} />
              <span style={{ fontWeight: 600 }}>Selesaikan dalam {formatTime(timeLeft)}</span>
            </div>
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {/* Order Summary Accordion */}
            <div style={{ padding: '16px 24px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
              <div 
                onClick={() => setShowOrderSummary(!showOrderSummary)} 
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
              >
                <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>Rincian Pesanan</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#6b7280' }}>
                  <span style={{ fontSize: 13 }}>{orderId}</span>
                  {showOrderSummary ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>
              
              {showOrderSummary && (
                <div className="animate-fade-in" style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563' }}>
                    <span>1x EnduraUP PRO (1 Bulan)</span>
                    <span style={{ fontWeight: 600 }}>Rp 29.000</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#4b5563' }}>
                    <span>Kode Unik Pembayaran</span>
                    <span style={{ fontWeight: 600, color: '#10b981' }}>+Rp {uniqueCode}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Payment Instructions */}
            <div style={{ padding: '24px' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Transfer Bank (Verifikasi Manual)</div>
              
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '16px', marginBottom: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#1d4ed8', fontStyle: 'italic' }}>BCA</div>
                  <div style={{ fontSize: 12, background: '#e0e7ff', color: '#4338ca', padding: '2px 8px', borderRadius: 4, fontWeight: 600 }}>Bank Transfer</div>
                </div>
                
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Nomor Rekening</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#111827', letterSpacing: '1px' }}>1234 5678 90</div>
                  <button onClick={() => copyToClipboard('1234567890')} style={{ background: 'transparent', border: 'none', color: '#2563eb', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                    {copied ? <CheckCircle size={14} color="#10b981" /> : <Copy size={14} />}
                    {copied ? 'Tersalin' : 'Salin'}
                  </button>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>A/N <span style={{ fontWeight: 600, color: '#374151' }}>EnduraUP App</span></div>
              </div>

              {/* Upload Receipt */}
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Konfirmasi Pembayaran</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 16, lineHeight: 1.5 }}>
                Setelah melakukan transfer sesuai nominal <strong>{formatCurrency(totalPrice)}</strong>, harap unggah bukti transfer untuk verifikasi.
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100px', border: receipt ? '1px solid #10b981' : '1px dashed #d1d5db', borderRadius: 8, cursor: 'pointer', background: receipt ? '#f0fdf4' : '#f9fafb', transition: 'all 0.2s' }}>
                {receipt ? (
                  <>
                    <CheckCircle size={28} color="#10b981" style={{ marginBottom: 8 }} />
                    <span style={{ fontSize: 13, color: '#059669', fontWeight: 600, maxWidth: '90%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {receipt.name}
                    </span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
                    <span style={{ fontSize: 13, color: '#4b5563', fontWeight: 600 }}>Unggah Bukti Transfer</span>
                    <span style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>JPG, PNG (Maks 5MB)</span>
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

          {/* Sticky Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid #f3f4f6', background: '#ffffff' }}>
            <button 
              onClick={handleUpgrade}
              disabled={loading || !receipt}
              style={{ width: '100%', height: 48, fontSize: 15, fontWeight: 700, background: (!receipt || loading) ? '#e5e7eb' : '#2563eb', color: (!receipt || loading) ? '#9ca3af' : '#ffffff', border: 'none', borderRadius: 8, transition: 'all 0.2s', cursor: (!receipt || loading) ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Memproses...' : 'Saya Sudah Bayar'}
            </button>
          </div>
          
        </div>
        
        {/* Secure Footer */}
        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#9ca3af', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          <ShieldCheck size={14} /> Payments are secure and encrypted.
        </div>
      </div>
    </div>
  );
}

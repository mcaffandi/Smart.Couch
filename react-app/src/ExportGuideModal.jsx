import React from 'react';
import { X, ExternalLink, Download, FileSpreadsheet, Smartphone } from 'lucide-react';

export default function ExportGuideModal({ onClose, lang = 'id' }) {
  const isId = lang === 'id';

  return (
    <div className="profile-modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div 
        className="animate-fade-in" 
        style={{ 
          background: 'var(--bg-surface)', 
          padding: 0, 
          borderRadius: 16, 
          width: '100%', 
          maxWidth: 600, 
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: 'var(--shadow-premium)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-card)' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Download size={20} color="var(--brand)" />
              {isId ? 'Panduan Export Data Smartwatch' : 'Smartwatch Data Export Guide'}
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-secondary)' }}>
              {isId ? 'Pilih merk jam kamu untuk melihat caranya.' : 'Choose your watch brand to see the steps.'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: 8, display: 'flex' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-surface)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Garmin */}
          <section>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#007cc3' }} />
              Garmin
            </h4>
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>{isId ? 'Cara 1: Full Backup (Semua Data - File ZIP)' : 'Method 1: Full Backup (ZIP File)'}</strong>
              </p>
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>{isId ? 'Buka web Garmin Connect di Laptop/PC.' : 'Open Garmin Connect web on Laptop/PC.'}</li>
                <li>{isId ? 'Klik ikon Profil ➡️ Account Settings ➡️ Data Management.' : 'Click Profile ➡️ Account Settings ➡️ Data Management.'}</li>
                <li>{isId ? 'Klik tombol Export Your Data.' : 'Click Export Your Data.'}</li>
                <li>{isId ? 'Garmin akan mengirimkan file .ZIP ke email. Upload file ZIP tersebut langsung ke sini!' : 'Garmin will send a .ZIP file to your email. Upload that ZIP directly here!'}</li>
              </ol>

              <div style={{ height: 1, background: 'var(--border)', margin: '12px 0' }} />

              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                <strong>{isId ? 'Cara 2: Export 1 Aktivitas (File GPX)' : 'Method 2: Single Activity (GPX File)'}</strong>
              </p>
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>{isId ? 'Buka web Garmin Connect, buka sesi lari kamu.' : 'Open Garmin Connect web, go to your run session.'}</li>
                <li>{isId ? 'Klik ikon Gear (Pengaturan) di pojok kanan atas.' : 'Click the Gear icon on the top right.'}</li>
                <li>{isId ? 'Pilih "Export to GPX".' : 'Select "Export to GPX".'}</li>
              </ol>
            </div>
          </section>

          {/* Strava */}
          <section>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fc4c02' }} />
              Strava (Universal)
            </h4>
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 12px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {isId ? 'Bisa dipakai untuk semua jam (Apple, Amazfit, Xiaomi, dll) yang sudah nyambung ke Strava.' : 'Can be used for any watch connected to Strava.'}
              </p>
              <ol style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li>{isId ? 'Buka web Strava (strava.com) di Laptop/PC.' : 'Open Strava web on Laptop/PC.'}</li>
                <li>{isId ? 'Buka aktivitas lari kamu.' : 'Open your run activity.'}</li>
                <li>{isId ? 'Di menu sebelah kiri, klik ikon titik tiga (...).' : 'Click the three dots (...) menu on the left.'}</li>
                <li>{isId ? 'Pilih "Export GPX".' : 'Select "Export GPX".'}</li>
              </ol>
            </div>
          </section>

          {/* Coros & Amazfit */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <section>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4b5563' }} />
                Coros
              </h4>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>{isId ? 'Buka aplikasi Coros di HP.' : 'Open Coros app on Phone.'}</li>
                  <li>{isId ? 'Pilih riwayat lari.' : 'Select run history.'}</li>
                  <li>{isId ? 'Ketuk ikon Share (Bagikan).' : 'Tap Share icon.'}</li>
                  <li>{isId ? 'Pilih "Export Data" ➡️ Format "GPX".' : 'Select "Export Data" ➡️ "GPX" format.'}</li>
                </ol>
              </div>
            </section>
            
            <section>
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
                Amazfit / Zepp
              </h4>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
                <ol style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <li>{isId ? 'Buka aplikasi Zepp di HP.' : 'Open Zepp app on Phone.'}</li>
                  <li>{isId ? 'Buka sesi lari kamu.' : 'Open run session.'}</li>
                  <li>{isId ? 'Ketuk ikon titik tiga (...).' : 'Tap three dots (...).'}</li>
                  <li>{isId ? 'Pilih "Export Track" ➡️ "GPX".' : 'Select "Export Track" ➡️ "GPX".'}</li>
                </ol>
              </div>
            </section>
          </div>

          <section style={{ marginTop: 8 }}>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <Smartphone size={16} color="var(--text-secondary)" />
              Huawei & Apple Watch
            </h4>
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ margin: '0 0 8px 0', fontSize: 13, color: 'var(--text-secondary)' }}>
                {isId ? 'Karena ekosistem tertutup, gunakan aplikasi perantara:' : 'Due to closed ecosystem, use bridge apps:'}
              </p>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                <li style={{ marginBottom: 4 }}><strong>Huawei:</strong> {isId ? 'Gunakan aplikasi Health Sync (Android) untuk sync ke Strava, lalu ikuti panduan Strava.' : 'Use Health Sync app to sync to Strava, then follow Strava guide.'}</li>
                <li><strong>Apple Watch:</strong> {isId ? 'Gunakan aplikasi HealthFit (iOS) untuk export GPX, atau sambungkan ke Strava.' : 'Use HealthFit app to export GPX, or connect to Strava.'}</li>
              </ul>
            </div>
          </section>

          {/* Excel Fallback */}
          <section>
            <h4 style={{ margin: '0 0 12px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8, fontSize: 16 }}>
              <FileSpreadsheet size={16} color="#10b981" />
              {isId ? 'Manual (Excel)' : 'Manual (Excel)'}
            </h4>
            <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, border: '1px solid var(--border)' }}>
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                {isId ? 'Jam tidak didukung? Kamu bisa download Template Excel di menu Import, lalu ketik manual data larimu dan upload ke sini!' : 'Watch not supported? Download the Excel Template in the Import menu, type your data, and upload it!'}
              </p>
            </div>
          </section>

        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onClose} 
            style={{ width: '100%', padding: '12px', fontSize: 14 }}
          >
            {isId ? 'Tutup Panduan' : 'Close Guide'}
          </button>
        </div>
      </div>
    </div>
  );
}

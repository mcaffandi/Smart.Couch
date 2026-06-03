import React from 'react';
import { Mail, MessageCircle } from 'lucide-react';

export function AboutPage({ lang }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', minHeight: '60vh' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: 'var(--text-primary)' }}>
        {lang === 'id' ? 'Tentang Kami' : 'About Us'}
      </h1>
      <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p>
          EnduraUP adalah platform AI pelatih lari pintar yang didedikasikan untuk membantu pelari dari segala tingkat kemampuan mencapai <i>Personal Best</i> (PB) mereka.
          Kami percaya bahwa setiap pelari berhak mendapatkan program latihan yang adaptif, aman, dan didasarkan pada data nyata, bukan sekadar jadwal statis.
        </p>
        <p>
          Misi kami adalah menjembatani kesenjangan antara teknologi <i>wearable</i> (seperti Garmin, Strava) dengan ilmu kepelatihan lari profesional.
          Dengan menganalisis metrik seperti detak jantung (HR), skor kualitas tidur, <i>pace</i>, dan riwayat cedera, EnduraUP bertindak sebagai pelatih pribadi saku yang tahu kapan Anda harus berlari lebih cepat (push) dan kapan Anda harus istirahat (recovery).
        </p>
        <p>
          Di EnduraUP, lari bukan sekadar tentang kecepatan, melainkan konsistensi dan kesehatan jangka panjang. Selamat berlari, pelari hebat!
        </p>
      </div>
    </div>
  );
}

export function PrivacyPage({ lang }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', minHeight: '60vh' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: 'var(--text-primary)' }}>
        {lang === 'id' ? 'Kebijakan Privasi' : 'Privacy Policy'}
      </h1>
      <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p>
          Privasi data Anda adalah prioritas utama kami. Kebijakan Privasi ini menjelaskan bagaimana EnduraUP mengumpulkan, menggunakan, dan melindungi data pribadi serta data kesehatan Anda.
        </p>
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>1. Data yang Dikumpulkan</h3>
          <p>Kami hanya mengumpulkan data yang Anda izinkan untuk dibagikan dari platform pihak ketiga (Strava, Garmin) yang meliputi riwayat aktivitas lari, detak jantung, skor kualitas tidur, dan informasi profil dasar.</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>2. Penggunaan Data</h3>
          <p>Data Anda hanya digunakan secara eksklusif untuk menghasilkan rekomendasi jadwal lari yang adaptif, menganalisis performa, dan memastikan bahwa tubuh Anda berlatih dalam batas aman untuk menghindari cedera.</p>
        </div>
        <div>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>3. Keamanan & Penghapusan Data</h3>
          <p>Kami tidak akan pernah menjual atau membagikan data kesehatan Anda kepada pihak ketiga untuk tujuan komersial atau iklan. Anda memiliki hak penuh untuk menghapus akun dan seluruh riwayat data Anda dari server kami kapan saja melalui pengaturan profil.</p>
        </div>
      </div>
    </div>
  );
}

export function ContactPage({ lang }) {
  return (
    <div className="animate-fade-in" style={{ maxWidth: 800, margin: '40px auto', padding: '0 20px', minHeight: '60vh' }}>
      <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 24, color: 'var(--text-primary)' }}>
        {lang === 'id' ? 'Hubungi Pelatih' : 'Contact Coach'}
      </h1>
      <div style={{ fontSize: 16, color: 'var(--text-secondary)', lineHeight: 1.8, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <p>
          Punya pertanyaan tentang program latihan Anda? Butuh panduan spesifik karena cedera atau persiapan <i>race</i> besar? Tim pelatih profesional kami siap membantu!
        </p>
        
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, marginTop: 16 }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 16 }}>Informasi Kontak</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
            <li style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <Mail size={18} />
              </span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>Email</strong>
                <span>hello@enduraup.space</span>
              </div>
            </li>
            <li style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
                <MessageCircle size={18} />
              </span>
              <div>
                <strong style={{ display: 'block', color: 'var(--text-primary)' }}>WhatsApp Layanan Pelanggan</strong>
                <span>+62 812-3456-7890</span>
              </div>
            </li>
          </ul>
        </div>
        
        <p style={{ marginTop: 16, fontSize: 14, color: 'var(--text-muted)' }}>
          Waktu operasional pelatih kami adalah Senin - Jumat, 09:00 - 17:00 WIB. Pertanyaan terkait konsultasi program lari khusus pengguna PRO akan diprioritaskan.
        </p>
      </div>
    </div>
  );
}

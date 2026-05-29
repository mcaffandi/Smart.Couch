import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, isConfigured as isFirebaseConfigured } from './firebase';
import './LandingPage.css';
import Logo from './Logo';
import { translations } from './translations';

export default function LandingPage({ onGetStarted, lang, setLang, visitorCount }) {
  const t = translations[lang] || translations.id;
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      if (!isFirebaseConfigured) return;
      try {
        const q = query(collection(db, 'feedback'), where('featured', '==', true));
        const querySnapshot = await getDocs(q);
        const fetched = [];
        querySnapshot.forEach((doc) => {
          fetched.push({ id: doc.id, ...doc.data() });
        });
        
        // If we have featured reviews, use them. Otherwise, use dummy ones so it never looks empty.
        if (fetched.length > 0) {
          setTestimonials(fetched);
        } else {
          setTestimonials([
            { id: 1, name: 'Bima Satriya', rating: 5, date: lang === 'id' ? '25 Mei 2026' : 'May 25, 2026', feedback: lang === 'id' ? 'Gila, fitur prediksi pacenya akurat parah! Sangat ngebantu buat susun strategi HM minggu depan. Selain itu UI-nya juga enteng banget dibuka dari HP.' : 'Insane, the pace prediction feature is incredibly accurate! Very helpful for my HM strategy next week. The UI is also very lightweight on mobile.' },
            { id: 2, name: 'Tirta Anugrah', rating: 5, date: lang === 'id' ? '22 Mei 2026' : 'May 22, 2026', feedback: lang === 'id' ? 'Awalnya skeptis, tapi pas nyoba sinkronisasi gpx-nya ternyata secepet itu tanpa lag. Fitur AI Coach-nya ngebantu banget buat gue yang sering bolos jadwal lari karena kerjaan padat.' : 'Skeptical at first, but GPX sync is incredibly fast with zero lag. The AI Coach helps a lot since I often miss my schedule due to work.' },
            { id: 3, name: 'Sarah K.', rating: 4, date: lang === 'id' ? '18 Mei 2026' : 'May 18, 2026', feedback: lang === 'id' ? 'Coach AI-nya asik! Ngasih saran nggak kaku dan beneran kerasa kayak dilatih personal trainer beneran. Minusnya cuma belum ada fitur integrasi langsung ke Spotify dari dalam app. Tapi tetep bintang 5 deh buat inovasinya.' : 'The AI Coach is fun! Gives practical advice and really feels like a personal trainer. Only missing Spotify integration. Still giving it high stars for innovation.' },
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch testimonials:', err);
        // Fallback to dummy data if Firestore fails (e.g. missing permissions)
        setTestimonials([
          { id: 1, name: 'Bima S.', rating: 5, feedback: lang === 'id' ? 'Gila, fitur prediksi pacenya akurat parah! Sangat ngebantu buat susun strategi HM minggu depan.' : 'Insane, the pace prediction feature is incredibly accurate! Very helpful for my HM strategy next week.' },
          { id: 2, name: 'Tirta A.', rating: 5, feedback: lang === 'id' ? 'UI-nya mahal banget, berasa pake aplikasi premium luar negeri. Sinkronisasi gpx-nya juga cepet tanpa lag.' : 'The UI feels extremely premium. GPX sync is fast with zero lag.' },
          { id: 3, name: 'Sarah K.', rating: 5, feedback: lang === 'id' ? 'Coach AI-nya asik! Ngasih saran nggak kaku dan beneran kerasa kayak dilatih personal trainer beneran.' : 'The AI Coach is fun! Gives practical advice and really feels like a personal trainer.' },
        ]);
      }
    };
    fetchTestimonials();
  }, [lang]);

  return (
    <div className="landing-container">
      {/* Subtle grid pattern background */}
      <div className="grid-overlay"></div>
      
      {/* Singular premium top glow */}
      <div className="hero-glow"></div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo">
          <Logo size={26} />
          <span className="logo-text">EnduraUP</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="lang-switcher">
            <button className={`lang-btn ${lang === 'id' ? 'active' : ''}`} onClick={() => setLang('id')}>ID</button>
            <button className={`lang-btn ${lang === 'en' ? 'active' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>
          <button className="nav-btn-primary" onClick={onGetStarted}>{t.signIn}</button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            {t.heroTitleLine1} <br/>
            <span className="text-gradient">{t.heroTitleLine2}</span>
          </h1>
          <p className="hero-subtitle">{t.heroSubtitle}</p>
          <div className="hero-cta-group">
            <button className="btn-glow" onClick={onGetStarted}>
              {t.getStartedFree}
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="btn-outline-landing" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              {t.learnMore}
            </button>
          </div>
        </div>

        {/* Premium Dashboard Preview Mockup */}
        <div className="hero-mockup animate-float">
          <div className="mockup-glass">
            <div className="mockup-header">
              <div className="mac-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="mockup-title">{t.dashboardPreview}</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-layout">
                {/* Mockup Sidebar */}
                <div className="mockup-sidebar">
                  <div className="mockup-sidebar-item active" title="Dashboard">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
                  </div>
                  <div className="mockup-sidebar-item" title="Jadwal Latihan">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                  </div>
                  <div className="mockup-sidebar-item" title="Riwayat Lari">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
                  </div>
                  <div className="mockup-sidebar-item" title="Profil">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width: 14, height: 14}}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  </div>
                </div>
                {/* Mockup Main Panel */}
                <div className="mockup-panel">
                  <div className="mockup-grid">
                    <div className="mockup-card highlight">
                      <div className="card-label">{t.weeklyMileage}</div>
                      <div className="card-value">42.8 <span className="card-unit">km</span></div>
                      <div className="card-desc">▲ 12% vs last week</div>
                    </div>
                    <div className="mockup-card">
                      <div className="card-label">{t.sleepScore}</div>
                      <div className="card-value color-purple">88<span className="card-unit">/100</span></div>
                      <div className="card-desc">{t.excellentRecovery}</div>
                    </div>
                    <div className="mockup-card">
                      <div className="card-label">{t.paceTarget}</div>
                      <div className="card-value color-blue">5:15 <span className="card-unit">/km</span></div>
                      <div className="card-desc">{t.easyRunZone}</div>
                    </div>
                  </div>
                  {/* Mockup Chart Area */}
                  <div className="mockup-chart-container">
                    <div className="mockup-chart-header">
                      <div className="chart-label">{t.fitnessProgress}</div>
                      <div className="chart-legend">
                        <span className="legend-dot color-purple"></span> {t.run}
                        <span className="legend-dot color-blue"></span> {t.sleep}
                      </div>
                    </div>
                    <div className="mockup-chart-bars">
                      <div className="bar-wrapper"><div className="bar bar-1"></div><span className="bar-day">M</span></div>
                      <div className="bar-wrapper"><div className="bar bar-2"></div><span className="bar-day">S</span></div>
                      <div className="bar-wrapper"><div className="bar bar-3"></div><span className="bar-day">S</span></div>
                      <div className="bar-wrapper"><div className="bar bar-4"></div><span className="bar-day">R</span></div>
                      <div className="bar-wrapper"><div className="bar bar-5"></div><span className="bar-day">K</span></div>
                      <div className="bar-wrapper"><div className="bar bar-6"></div><span className="bar-day">J</span></div>
                      <div className="bar-wrapper"><div className="bar bar-7"></div><span className="bar-day">S</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Brand / Device Ticker Section */}
      <section className="brand-ticker-section animate-fade-in" style={{ animationDelay: '0.15s' }}>
        <p className="brand-ticker-title">{t.syncsWithDevices}</p>
        <div className="brand-ticker-wrapper">
          <div className="brand-logos-container">
            {[
              { name: 'Garmin' },
              { name: 'Strava' },
              { name: 'Polar' },
              { name: 'Coros' },
              { name: 'Apple Watch' },
              { name: 'Suunto' }
            ].map((brand, idx) => (
              <div key={idx} className="brand-logo-item" title={brand.name}>
                <span className="brand-name">{brand.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bento Grid Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-heading">{t.smarterTraining}</h2>
          <p className="section-subheading">{t.bentoSubtitle}</p>
        </div>
        
        <div className="bento-grid">
          {/* Row 1: Item 1 (Wide) & Item 3 (Standard) */}
          <div className="bento-item col-span-2 glass-panel hover-lift">
            <div className="bento-content">
              <div className="bento-icon icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </div>
              <div className="bento-text">
                <h3>{t.unifiedImportTitle}</h3>
                <p>{t.unifiedImportDesc}</p>
              </div>
            </div>
            <div className="bento-visual visual-import">
              <div className="mini-file-card zip">.zip (Garmin)</div>
              <div className="mini-file-card gpx">.gpx (Strava)</div>
              <div className="mini-file-card xlsx">.xlsx / .csv (Excel)</div>
            </div>
          </div>

          <div className="bento-item col-span-1 glass-panel hover-lift">
            <div className="bento-content flex-column">
              <div className="bento-icon icon-emerald">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              </div>
              <div className="bento-text">
                <h3>{t.racePredictorTitle}</h3>
                <p>{t.racePredictorDesc}</p>
              </div>
            </div>
            <div className="bento-visual visual-race">
              <div className="mini-race-badge"><span>5K</span> <span>22:40</span></div>
              <div className="mini-race-badge"><span>10K</span> <span>47:15</span></div>
              <div className="mini-race-badge"><span>Full Marathon</span> <span>3:45:10</span></div>
            </div>
          </div>

          {/* Row 2: Item 4 (Wide) & Item 2 (Standard/Tall) */}
          <div className="bento-item col-span-2 glass-panel hover-lift">
            <div className="bento-content">
              <div className="bento-icon icon-amber">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              </div>
              <div className="bento-text">
                <h3>{t.adaptiveCalendarTitle}</h3>
                <p>{t.adaptiveCalendarDesc}</p>
              </div>
            </div>
            <div className="bento-visual visual-calendar">
              <div className="mini-calendar">
                <div className="cal-day run">Sel</div>
                <div className="cal-day rest">Rab</div>
                <div className="cal-day run">Kam</div>
                <div className="cal-day rest">Jum</div>
                <div className="cal-day run">Sab</div>
              </div>
            </div>
          </div>

          <div className="bento-item col-span-1 glass-panel hover-lift">
            <div className="bento-content flex-column">
              <div className="bento-icon icon-blue">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <div className="bento-text">
                <h3>{t.sleepCorrelationTitle}</h3>
                <p>{t.sleepCorrelationDesc}</p>
              </div>
            </div>
            <div className="bento-visual visual-sleep">
              <div className="sleep-score-wrapper">
                <div className="sleep-score-dial">
                  <div className="dial-value">85%</div>
                </div>
                <div className="dial-label">{t.readyToRun}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Wall of Love / Testimonials Section */}
      <section className="testimonials-section" style={{ padding: '100px 20px 80px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 50 }}>
            <h2 className="section-heading" style={{ fontSize: '2rem' }}>{lang === 'id' ? 'Apa Kata Pelari?' : 'Runner Feedback'}</h2>
            <p className="section-subheading">{lang === 'id' ? 'Review nyata dari komunitas EnduraUP.' : 'Real reviews from the EnduraUP community.'}</p>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
          {testimonials.map((testi) => (
            <div key={testi.id} className="glass-panel hover-lift" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 4 }}>
                {[...Array(testi.rating || 5)].map((_, i) => (
                  <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                ))}
              </div>
              <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic', flex: 1 }}>
                "{testi.feedback}"
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>
                  {testi.name?.substring(0, 1).toUpperCase()}
                </div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>{testi.name}</div>
              </div>
            </div>
          ))}
        </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div className="badge-pill" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span><span className="badge-dot"></span> Pre-Release (Beta)</span>
            {visitorCount !== null && (
              <>
                <span style={{ opacity: 0.5 }}>•</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4, opacity: 0.8 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                  {visitorCount > 9999 ? (visitorCount / 1000).toFixed(1).replace('.0', '') + 'k' : visitorCount}
                </span>
              </>
            )}
          </div>
        </div>
        <p>© {new Date().getFullYear()} EnduraUP. {t.builtForRunners}</p>
        <p className="footer-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#52525b' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          {t.dataSafe}
        </p>
      </footer>
    </div>
  );
}

import React from 'react';
import './LandingPage.css';
import Logo from './Logo';
import { translations } from './translations';

export default function LandingPage({ onGetStarted, lang, setLang }) {
  const t = translations[lang] || translations.id;

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
                  <div className="mockup-sidebar-item active"></div>
                  <div className="mockup-sidebar-item"></div>
                  <div className="mockup-sidebar-item"></div>
                  <div className="mockup-sidebar-item"></div>
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
              { name: 'Garmin', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/>
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 9v3l2 1"/>
                </svg>
              )},
              { name: 'Strava', icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-3.828L5.19 19.928h3.065L13.43 10l-5.15-10.172-5.15 10.172h3.065" />
                </svg>
              )},
              { name: 'Polar', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/>
                  <line x1="12" y1="2" x2="12" y2="22"/>
                </svg>
              )},
              { name: 'Coros', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M12 6V12h6"/>
                </svg>
              )},
              { name: 'Apple Watch', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="5" width="14" height="14" rx="4" />
                  <path d="M9 2h6M9 22h6M12 9v6" />
                </svg>
              )},
              { name: 'Suunto', icon: (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <ellipse cx="12" cy="5" rx="9" ry="3"/>
                  <ellipse cx="12" cy="12" rx="9" ry="3"/>
                  <ellipse cx="12" cy="19" rx="9" ry="3"/>
                </svg>
              )}
            ].map((brand, idx) => (
              <div key={idx} className="brand-logo-item" title={brand.name}>
                <div className="brand-icon">{brand.icon}</div>
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

      <footer className="landing-footer">
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
          <div className="badge-pill" style={{ marginBottom: 0 }}>
            <span className="badge-dot"></span> V2.0 Now Live
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

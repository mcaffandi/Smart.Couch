import React from 'react';
import './LandingPage.css';
import Logo from './Logo';

export default function LandingPage({ onGetStarted }) {
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
        <button className="nav-btn-primary" onClick={onGetStarted}>Sign In</button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <h1 className="hero-title">
            Unlock your true <br/>
            <span className="text-gradient">running potential</span>
          </h1>
          <p className="hero-subtitle">
            Upload your Garmin or Strava data and let our AI create a highly personalized training plan tailored to your sleep, recovery, and goals.
          </p>
          <div className="hero-cta-group">
            <button className="btn-glow" onClick={onGetStarted}>
              Get Started Free
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="btn-outline-landing" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              Learn More
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
              <div className="mockup-title">EnduraUP Dashboard Preview</div>
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
                      <div className="card-label">Weekly Mileage</div>
                      <div className="card-value">42.8 <span className="card-unit">km</span></div>
                      <div className="card-desc">▲ 12% vs last week</div>
                    </div>
                    <div className="mockup-card">
                      <div className="card-label">Sleep Score</div>
                      <div className="card-value color-purple">88<span className="card-unit">/100</span></div>
                      <div className="card-desc">Excellent Recovery</div>
                    </div>
                    <div className="mockup-card">
                      <div className="card-label">Pace Target</div>
                      <div className="card-value color-blue">5:15 <span className="card-unit">/km</span></div>
                      <div className="card-desc">Easy Run Zone</div>
                    </div>
                  </div>
                  {/* Mockup Chart Area */}
                  <div className="mockup-chart-container">
                    <div className="mockup-chart-header">
                      <div className="chart-label">Fitness Progress (VO2 Max Equivalent)</div>
                      <div className="chart-legend">
                        <span className="legend-dot color-purple"></span> Lari
                        <span className="legend-dot color-blue"></span> Tidur
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

      {/* Bento Grid Features Section */}
      <section id="features" className="features-section">
        <div className="section-header">
          <h2 className="section-heading">Smarter Training, Faster Results</h2>
          <p className="section-subheading">A comprehensive tool built specifically for runners who want data-driven plans without the clutter.</p>
        </div>
        
        <div className="bento-grid">
          {/* Row 1: Item 1 (Wide) & Item 3 (Standard) */}
          <div className="bento-item col-span-2 glass-panel hover-lift">
            <div className="bento-content">
              <div className="bento-icon icon-purple">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
              </div>
              <div className="bento-text">
                <h3>Unified Data Import</h3>
                <p>Drag and drop ZIP exports from Garmin Connect, standard GPX files from Strava, or custom Excel/CSV training templates. We seamlessly parse and consolidate your history without requiring complex API integrations.</p>
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
                <h3>Race Predictor</h3>
                <p>Get accurate estimated finishing times for 5K, 10K, Half, and Full Marathons, calculated via the Pete Riegel formula using your recent pacing statistics.</p>
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
                <h3>Adaptive Training Calendar</h3>
                <p>Generate highly tailored training schedules that fit your schedule. Choose which days to run, select your program style (ngepush, sedang, or santai), and watch your target paces adjust dynamically.</p>
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
                <h3>AI Recovery &amp; Sleep Correlation</h3>
                <p>We don't just look at mileage. Our AI maps the relationship between your sleep scores and your heart rate zones to prevent overtraining and optimize recovery.</p>
              </div>
            </div>
            <div className="bento-visual visual-sleep">
              <div className="sleep-score-wrapper">
                <div className="sleep-score-dial">
                  <div className="dial-value">85%</div>
                </div>
                <div className="dial-label">Ready to Run</div>
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
        <p>© {new Date().getFullYear()} EnduraUP. Built for runners, by runners.</p>
        <p className="footer-privacy" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 12, color: '#52525b' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#10b981' }}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
          Data Anda aman bersama kami. Kami tidak membagikan atau menjual data latihan Anda.
        </p>
      </footer>
    </div>
  );
}

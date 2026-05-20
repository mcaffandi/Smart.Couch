import React from 'react';
import './LandingPage.css';
import Logo from './Logo';

export default function LandingPage({ onGetStarted }) {
  return (
    <div className="landing-container">
      {/* Dynamic Background Elements */}
      <div className="bg-orb orb-1"></div>
      <div className="bg-orb orb-2"></div>
      <div className="bg-orb orb-3"></div>

      {/* Navbar */}
      <nav className="landing-nav">
        <div className="nav-logo" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Logo size={28} />
          <span className="logo-text">EnduraUP</span>
        </div>
        <button className="nav-btn" onClick={onGetStarted}>Sign In</button>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="badge-pill pulse-glow">
            <span className="badge-dot"></span> V2.0 Now Live
          </div>
          <h1 className="hero-title">
            Unlock Your True 
            <span className="text-gradient"> Running Potential</span>
          </h1>
          <p className="hero-subtitle">
            Upload your Garmin or Strava data and let our AI create a highly personalized training plan tailored to your sleep, recovery, and goals.
          </p>
          <div className="hero-cta-group">
            <button className="btn-glow" onClick={onGetStarted}>
              Get Started Free
              <svg className="arrow-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <button className="btn-outline" onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
              Learn More
            </button>
          </div>
        </div>
        
        {/* Mockup / Dashboard Preview */}
        <div className="hero-mockup animate-float">
          <div className="mockup-glass">
            <div className="mockup-header">
              <div className="mac-dots">
                <span></span><span></span><span></span>
              </div>
              <div className="mockup-title">EnduraUP Dashboard</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-grid">
                <div className="mockup-card">
                  <div className="card-label">Avg Pace</div>
                  <div className="card-value gradient-text">5:20<span className="card-unit">/km</span></div>
                </div>
                <div className="mockup-card">
                  <div className="card-label">Training Status</div>
                  <div className="card-value text-emerald">Peaking</div>
                </div>
                <div className="mockup-card">
                  <div className="card-label">Sleep Score</div>
                  <div className="card-value text-purple">92</div>
                </div>
              </div>
              <div className="mockup-chart">
                <div className="bar bar-1"></div>
                <div className="bar bar-2"></div>
                <div className="bar bar-3"></div>
                <div className="bar bar-4"></div>
                <div className="bar bar-5"></div>
                <div className="bar bar-6"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <h2 className="section-heading">Smarter Training, Faster Results</h2>
        <div className="features-grid">
          <div className="feature-card glass-panel hover-lift">
            <div className="feature-icon icon-purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3>Garmin Integration</h3>
            <p>Directly import your ZIP exports from Garmin Connect to instantly populate your historical running and sleep data.</p>
          </div>
          <div className="feature-card glass-panel hover-lift">
            <div className="feature-icon icon-blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <h3>AI-Driven Analytics</h3>
            <p>Our algorithms analyze the correlation between your sleep scores and running performance to adapt your daily schedule.</p>
          </div>
          <div className="feature-card glass-panel hover-lift">
            <div className="feature-icon icon-emerald">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            </div>
            <h3>Race Predictor</h3>
            <p>Accurate time predictions for 5K, 10K, Half Marathon, and Full Marathon based on your current VO2 Max equivalent and pacing.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p>© {new Date().getFullYear()} EnduraUP. Built for runners, by runners.</p>
      </footer>
    </div>
  );
}

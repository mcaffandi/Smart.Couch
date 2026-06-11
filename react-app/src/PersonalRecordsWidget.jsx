import React, { useMemo } from 'react';

const formatDurationStr = (ms) => {
  if (!ms) return '--:--';
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
};

export default function PersonalRecordsWidget({ activities = [], lang = 'id' }) {
  const records = useMemo(() => {
    // Distance categories in meters
    const targets = [
      { id: '1k', label: '1K', min: 1000, max: 1200, color: '#94a3b8' },
      { id: '1m', label: '1MI', min: 1609, max: 1800, color: '#f87171' },
      { id: '3k', label: '3K', min: 3000, max: 3300, color: '#38bdf8' },
      { id: '5k', label: '5K', min: 5000, max: 5500, color: '#818cf8' },
      { id: '10k', label: '10K', min: 10000, max: 10500, color: '#fbbf24' },
      { id: '21k', label: 'HM', min: 21000, max: 21500, color: '#a78bfa' },
    ];

    const results = targets.map(t => ({ ...t, best: null }));

    activities.forEach(a => {
      const distMeters = (a.distance || 0) / 100;
      if (distMeters <= 0 || !a.duration) return;

      results.forEach(target => {
        if (distMeters >= target.min && distMeters <= target.max) {
          if (!target.best || a.duration < target.best.duration) {
            target.best = {
              duration: a.duration,
              date: a.startTimeLocal
            };
          }
        }
      });
    });

    return results;
  }, [activities]);

  return (
    <div style={{ marginTop: 32, marginBottom: 16 }}>
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 20 }}>
        {lang === 'id' ? 'Personal Records' : 'Personal Records'}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 16 }}>
        {records.map((rec) => {
          const hasRecord = !!rec.best;
          
          return (
            <div key={rec.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              
              {/* Hexagon Badge */}
              <div style={{
                width: 76, height: 84,
                background: hasRecord ? rec.color : 'var(--border)',
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                display: 'flex', justifyContent: 'center', alignItems: 'center',
                marginBottom: 12
              }}>
                <div style={{
                  width: 72, height: 80,
                  background: hasRecord ? 'linear-gradient(180deg, var(--bg-surface) 0%, rgba(30,30,35,1) 100%)' : 'var(--bg-card)',
                  clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                  display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'
                }}>
                  {hasRecord ? (
                    <>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#fff', letterSpacing: 0.5 }}>{rec.label}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill={rec.color} style={{ marginTop: 4 }}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </>
                  ) : (
                    <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-muted)' }}>{rec.label}</span>
                  )}
                </div>
              </div>

              {/* Record Details */}
              {hasRecord ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)' }}>
                    {formatDurationStr(rec.best.duration)}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 4, fontWeight: 500 }}>
                    {new Date(rec.best.date).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>
                  —
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

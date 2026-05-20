import { useState } from 'react';

const ITEMS_PER_PAGE = 10;

export default function RunHistory({ activities }) {
  const [page, setPage] = useState(0);

  const sorted = [...activities].sort((a, b) =>
    (b.startTimeLocal ?? 0) - (a.startTimeLocal ?? 0)
  );

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paged = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const msToDate = (ms) => {
    const d = new Date(ms);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getBadge = (avgHr, maxHr) => {
    if (!avgHr) return null;
    const intensity = avgHr;
    if (intensity > 170) return { label: 'Ngepush', cls: 'badge-interval' };
    if (intensity > 155) return { label: 'Sedang', cls: 'badge-long' };
    return { label: 'Santai', cls: 'badge-easy' };
  };

  const RouteMap = ({ route }) => {
    if (!route || route.length < 2) return null;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    route.forEach(([lat, lon]) => {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lon < minLon) minLon = lon;
      if (lon > maxLon) maxLon = lon;
    });

    const width = 200;
    const height = 120;
    const pad = 10;
    
    // lat is y (inverted), lon is x
    const getPt = (lat, lon) => {
      const x = pad + (lon - minLon) / (maxLon - minLon || 1) * (width - 2*pad);
      const y = pad + (maxLat - lat) / (maxLat - minLat || 1) * (height - 2*pad);
      return `${x},${y}`;
    };

    const pts = route.map(([lat, lon]) => getPt(lat, lon)).join(' ');

    return (
      <div className="route-map-container" style={{ 
        width: '100%', height: '120px', background: 'rgba(30, 41, 59, 0.4)', 
        borderRadius: 8, marginTop: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' 
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <polyline points={pts} fill="none" stroke="#818cf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  };

  return (
    <div>
      <div className="history-list">
        {paged.map((act, i) => {
          const distKm = ((act.distance ?? 0) / 100000).toFixed(2);
          const durMin = Math.round((act.duration ?? 0) / 60000);
          const pace = act.distance && act.duration
            ? ((act.duration / 60000) / (act.distance / 100000)).toFixed(2)
            : '–';
          const badge = getBadge(act.avgHr, act.maxHr);

          return (
            <div className="history-item animate-fade-in" key={i} style={{ animationDelay: `${i * 0.04}s` }}>
              <div className="history-meta">
                <span className="history-date">{msToDate(act.startTimeLocal)}</span>
                <span className="history-name">{act.name ?? 'Running Session'}</span>
                {badge && <span className={`badge ${badge.cls}`} style={{ marginTop: 4, width: 'fit-content' }}>{badge.label}</span>}
              </div>
              <div className="history-stats">
                <div className="history-stat">
                  <div className="history-stat-value">{distKm}</div>
                  <div className="history-stat-label">km</div>
                </div>
                {durMin > 0 && (
                  <div className="history-stat">
                    <div className="history-stat-value">{durMin}</div>
                    <div className="history-stat-label">menit</div>
                  </div>
                )}
                {act.avgHr && (
                  <div className="history-stat">
                    <div className="history-stat-value">{Math.round(act.avgHr)}</div>
                    <div className="history-stat-label">avg HR</div>
                  </div>
                )}
              </div>
              {act.route && act.route.length > 0 && <RouteMap route={act.route} />}
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '7px 16px' }}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            ← Prev
          </button>
          <span style={{ display: 'flex', alignItems: 'center', fontSize: 13, color: 'var(--text-muted)' }}>
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn btn-secondary"
            style={{ width: 'auto', padding: '7px 16px' }}
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page === totalPages - 1}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Flame, Medal, Crown, Zap, Trophy } from 'lucide-react';

import { Activity, Dumbbell, Bike, Waves, Footprints, Edit2, Trash2 } from 'lucide-react';
const ITEMS_PER_PAGE = 12;

export default function RunHistory({ activities, profileWeight = 70, lang = 'id', onEdit, onDelete, onViewDetails }) {
  const [page, setPage] = useState(0);

  const sorted = [...activities].sort((a, b) =>
    (b.startTimeLocal ?? 0) - (a.startTimeLocal ?? 0)
  );

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paged = sorted.slice(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE);

  const msToDate = (ms) => {
    const d = new Date(ms);
    const dateStr = d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr} • ${timeStr}`;
  };

  const getBadge = (avgHr, maxHr) => {
    if (!avgHr) return null;
    const intensity = avgHr;
    if (intensity > 170) return { label: lang === 'id' ? 'Ngepush' : 'Interval/Push', cls: 'badge-interval' };
    if (intensity > 155) return { label: lang === 'id' ? 'Sedang' : 'Moderate', cls: 'badge-long' };
    return { label: lang === 'id' ? 'Santai' : 'Easy', cls: 'badge-easy' };
  };

  const RouteMap = ({ route }) => {
    if (!route || route.length < 2) return null;
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    route.forEach((pt) => {
      const lat = pt.lat !== undefined ? pt.lat : pt[0];
      const lon = pt.lon !== undefined ? pt.lon : pt[1];
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

    const pts = route.map((pt) => {
      const lat = pt.lat !== undefined ? pt.lat : pt[0];
      const lon = pt.lon !== undefined ? pt.lon : pt[1];
      return getPt(lat, lon);
    }).join(' ');

    return (
      <div className="route-map-container" style={{
        width: '45px', height: '30px', flexShrink: 0
      }}>
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          <polyline points={pts} fill="none" stroke="#818cf8" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  };

  const calculateBadges = (acts) => {
    const badges = [];
    if (acts.length >= 1) badges.push({ id: 'first', icon: <Star size={28} color="#eab308" />, title: lang === 'id' ? 'Langkah Pertama' : 'First Step', desc: lang === 'id' ? 'Menyelesaikan lari pertama.' : 'Completed first run.', color: 'rgba(234, 179, 8, 0.15)', border: '#eab308' });
    if (acts.length >= 5) badges.push({ id: 'streak', icon: <Flame size={28} color="#ef4444" />, title: 'On Fire', desc: lang === 'id' ? '5+ sesi lari terselesaikan.' : '5+ sessions completed.', color: 'rgba(239, 68, 68, 0.15)', border: '#ef4444' });
    if (acts.some(a => a.distance >= 500000)) badges.push({ id: '5k', icon: <Trophy size={28} color="#3b82f6" />, title: '5K Finisher', desc: lang === 'id' ? 'Berhasil lari 5km+.' : 'Completed 5km+ run.', color: 'rgba(59, 130, 246, 0.15)', border: '#3b82f6' });
    if (acts.some(a => a.distance >= 1000000)) badges.push({ id: '10k', icon: <Medal size={28} color="#10b981" />, title: '10K Finisher', desc: lang === 'id' ? 'Berhasil lari 10km+.' : 'Completed 10km+ run.', color: 'rgba(16, 185, 129, 0.15)', border: '#10b981' });
    if (acts.some(a => a.distance >= 2109700)) badges.push({ id: 'hm', icon: <Crown size={28} color="#a78bfa" />, title: 'Half Marathon', desc: lang === 'id' ? 'Menyelesaikan jarak HM.' : 'Completed HM distance.', color: 'rgba(167, 139, 250, 0.15)', border: '#a78bfa' });
    
    const hasSpeedy = acts.some(a => {
      if(!a.duration || !a.distance || a.distance < 300000) return false;
      const pace = (a.duration / 60000) / (a.distance / 100000);
      return pace <= 5.5;
    });
    if (hasSpeedy) badges.push({ id: 'speed', icon: <Zap size={28} color="#06b6d4" />, title: 'Speed Demon', desc: lang === 'id' ? 'Pace lari sub 5:30/km.' : 'Sub 5:30/km pace.', color: 'rgba(6, 182, 212, 0.15)', border: '#06b6d4' });

    return badges;
  };


  const earnedBadges = calculateBadges(activities);

  return (
    <div>
      {earnedBadges.length > 0 && (
        <div style={{ marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
            {lang === 'id' ? `Pencapaian (${earnedBadges.length})` : `Achievements (${earnedBadges.length})`}
          </h3>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="hide-scrollbar">
            {earnedBadges.map((b, idx) => (
              <motion.div
                key={b.id}
                initial={{ opacity: 0, scale: 0.8, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.4, delay: idx * 0.1, type: 'spring', bounce: 0.5 }}
                style={{
                  minWidth: 160,
                  flex: '0 0 auto',
                  background: 'var(--bg-card)',
                  border: `1px solid ${b.border}`,
                  boxShadow: `0 4px 12px ${b.color}`,
                  borderRadius: 16,
                  padding: 16,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <div style={{ position: 'absolute', top: -10, right: -10, opacity: 0.1, filter: 'grayscale(100%)', transform: 'scale(2.5)' }}>{b.icon}</div>
                <div>{b.icon}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{b.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, mt: 4 }}>{b.desc}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}



      <div className="history-list">
        {paged.map((act, i) => {
          const distKm = ((act.distance ?? 0) / 100000);
          const totalSecs = Math.round((act.duration ?? 0) / 1000);
          const durationMins = totalSecs / 60;
          
          let kcal = 0;
          if (act.distance > 0) {
            kcal = Math.round(distKm * profileWeight * 1.036);
          } else if (act.isManual || act.manualType) {
            kcal = Math.round(durationMins * 8);
          }

          const m = Math.floor(totalSecs / 60);
          const s = totalSecs % 60;
          const formattedDur = `${m}:${s.toString().padStart(2, '0')}`;
          const overallSecPerKm = act.distance && act.duration
            ? (act.duration / 1000) / (act.distance / 100000)
            : null;
            
          let finalPaceStr = '–';
          let isFastPace = false;
          
          if (act.laps && act.laps.length > 0 && overallSecPerKm) {
            const fastLaps = act.laps.filter(lap => {
              const p = lap.distance ? lap.moving_time / (lap.distance / 1000) : Infinity;
              return p <= overallSecPerKm;
            });
            if (fastLaps.length > 0) {
              const totalFastTime = fastLaps.reduce((acc, lap) => acc + lap.moving_time, 0);
              const totalFastDist = fastLaps.reduce((acc, lap) => acc + lap.distance, 0);
              if (totalFastDist > 0) {
                const trueFastPace = (totalFastTime / (totalFastDist / 1000)) / 60;
                finalPaceStr = `${Math.floor(trueFastPace)}:${Math.round((trueFastPace % 1) * 60).toString().padStart(2, '0')}`;
                isFastPace = true;
              }
            }
          }
          
          if (!isFastPace && overallSecPerKm) {
            const pace = overallSecPerKm / 60;
            finalPaceStr = `${Math.floor(pace)}:${Math.round((pace % 1) * 60).toString().padStart(2, '0')}`;
          }

          const badge = getBadge(act.avgHr, act.maxHr);

          return (
            <div 
              className="history-item animate-fade-in" 
              key={i} 
              onClick={() => onViewDetails && onViewDetails(act)}
              style={{ animationDelay: `${i * 0.04}s`, position: 'relative', display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, cursor: onViewDetails ? 'pointer' : 'default' }}
            >
              <div className="history-meta" style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <span className="history-date">{msToDate(act.startTimeLocal)}</span>
                <span className="history-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', width: '100%' }}>{act.name ?? (lang === 'id' ? 'Aktivitas Harian' : 'Daily Activity')}</span>
                {badge && <span className={`badge ${badge.cls}`} style={{ marginTop: 6, display: 'inline-flex', alignSelf: 'flex-start' }}>{badge.label}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
                {act.route && act.route.length > 0 ? (
                  <div style={{ marginRight: 8 }}>
                    <RouteMap route={act.route} />
                  </div>
                ) : (
                  <div style={{ marginRight: 8, padding: 6, borderRadius: 10, background: 'var(--bg-base)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                    {act.manualType === 'strength' ? <Dumbbell size={18} /> :
                     act.manualType === 'cycling' ? <Bike size={18} /> :
                     act.manualType === 'swimming' ? <Waves size={18} /> :
                     act.manualType === 'walking' ? <Footprints size={18} /> :
                     <Activity size={18} />}
                  </div>
                )}

                <div className="history-stats" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {act.distance > 0 && (
                    <div className="history-stat">
                      <div className="history-stat-value">{distKm.toFixed(2)}</div>
                      <div className="history-stat-label">km</div>
                    </div>
                  )}
                  {totalSecs > 0 && (
                    <div className="history-stat">
                      <div className="history-stat-value">{formattedDur}</div>
                      <div className="history-stat-label">{lang === 'id' ? 'waktu' : 'time'}</div>
                    </div>
                  )}
                  {finalPaceStr !== '–' && act.manualType !== 'strength' && act.manualType !== 'yoga' && (
                    <div className="history-stat">
                      <div className="history-stat-value" style={{ color: isFastPace ? 'var(--accent-purple)' : 'inherit', fontWeight: isFastPace ? 800 : 'inherit' }}>
                        {isFastPace ? `🔥 ${finalPaceStr}` : finalPaceStr}
                      </div>
                      <div className="history-stat-label" style={{ color: isFastPace ? 'var(--accent-purple)' : 'inherit' }}>
                        {isFastPace ? 'active pace' : 'pace'}
                      </div>
                    </div>
                  )}
                  {kcal > 0 && (
                    <div className="history-stat">
                      <div className="history-stat-value">{kcal}</div>
                      <div className="history-stat-label">kcal</div>
                    </div>
                  )}
                  {act.avgHr && (
                    <div className="history-stat">
                      <div className="history-stat-value">{Math.round(act.avgHr)}</div>
                      <div className="history-stat-label">avg HR</div>
                    </div>
                  )}
                </div>
              </div>

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

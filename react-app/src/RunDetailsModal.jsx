import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Zap, TrendingUp, Edit2, Trash2, Map as MapIcon, Share } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { formatPace } from './utils';

function MapBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20] });
    }
  }, [map, points]);
  return null;
}

export default function RunDetailsModal({ act, onClose, lang = 'id', stravaAccessToken, isPremium, onEdit, onDelete, onShare, onSaveLaps }) {
  const [laps, setLaps] = useState(act.laps || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getBadge = (avgHr, maxHr) => {
    if (!avgHr) return null;
    if (avgHr > 165 || maxHr > 185) return { label: lang === 'id' ? 'On Fire' : 'On Fire', cls: 'badge-fire' };
    if (avgHr > 152) return { label: lang === 'id' ? 'Ngepush' : 'Hard', cls: 'badge-ngepush' };
    if (avgHr > 133) return { label: lang === 'id' ? 'Sedang' : 'Moderate', cls: 'badge-sedang' };
    return { label: lang === 'id' ? 'Santai' : 'Easy', cls: 'badge-santai' };
  };

  useEffect(() => {
    async function fetchLaps() {
      // Jika sudah punya cache laps di dalam activity, gak usah panggil API Strava lagi!
      if (act.laps && act.laps.length > 0) {
        setLaps(act.laps);
        return;
      }
      
      if (!act.stravaId) return;
      if (!stravaAccessToken) {
        setError(lang === 'id' ? 'Strava tidak terhubung.' : 'Strava not connected.');
        return;
      }
      
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`https://www.strava.com/api/v3/activities/${act.stravaId}`, {
          headers: {
            'Authorization': `Bearer ${stravaAccessToken}`
          }
        });
        
        if (!res.ok) {
          throw new Error('Failed to fetch activity details from Strava');
        }
        
        const data = await res.json();
        if (data.laps && data.laps.length > 0) {
          setLaps(data.laps);
          if (onSaveLaps) {
            onSaveLaps(act.startTimeLocal, data.laps);
          }
        }
      } catch (err) {
        console.error('Error fetching Strava activity:', err);
        setError(lang === 'id' ? 'Gagal mengambil data Laps dari Strava.' : 'Failed to fetch Laps from Strava.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLaps();
  }, [act.stravaId, stravaAccessToken, lang, act.laps, act.startTimeLocal, onSaveLaps]);

  const msToDate = (ms) => {
    const d = new Date(ms);
    const dateStr = d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeStr = d.toLocaleTimeString(lang === 'id' ? 'id-ID' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${dateStr} • ${timeStr}`;
  };

  const distKm = ((act.distance ?? 0) / 100000).toFixed(2);
  const totalSecs = Math.round((act.duration ?? 0) / 1000);
  const m = Math.floor(totalSecs / 60);
  const s = totalSecs % 60;
  const formattedDur = `${m}:${s.toString().padStart(2, '0')}`;
  
  const overallSecPerKm = act.distance && act.duration
    ? (act.duration / 1000) / (act.distance / 100000)
    : null;
    
  const pace = formatPace(overallSecPerKm / 60);

  const formatSecs = (total) => {
    const min = Math.floor(total / 60);
    const sec = Math.round(total % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="profile-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }} style={{ zIndex: 99999 }}>
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ 
            maxWidth: 500, 
            width: '100%', 
            maxHeight: '90vh', 
            display: 'flex', 
            flexDirection: 'column', 
            background: 'var(--bg-surface)',
            borderRadius: 16,
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            border: '1px solid var(--border)',
            overflow: 'hidden'
          }}
        >
          <div style={{ padding: '20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {act.name || (lang === 'id' ? 'Sesi Lari' : 'Run Session')}
                </h2>
                {onEdit && (
                  <button 
                    onClick={() => {
                      const newName = window.prompt(lang === 'id' ? 'Masukkan nama baru:' : 'Enter new name:', act.name || '');
                      if (newName) onEdit(act.startTimeLocal, newName);
                    }}
                    style={{ background: 'rgba(167, 139, 250, 0.1)', border: 'none', color: 'var(--accent-purple)', cursor: 'pointer', padding: 6, borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Edit2 size={14} />
                  </button>
                )}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{msToDate(act.startTimeLocal)}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {onShare && (
                <button onClick={onShare} className="btn-close" style={{ background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', padding: 8, borderRadius: '50%', boxShadow: '0 4px 12px rgba(167, 139, 250, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Share size={18} />
                </button>
              )}
              <button onClick={onClose} className="btn-close" style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={20} />
              </button>
            </div>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Activity size={20} color="#818cf8" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{distKm}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'id' ? 'Jarak (km)' : 'Distance'}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <TrendingUp size={20} color="#34d399" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{formattedDur}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'id' ? 'Durasi' : 'Time'}</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Zap size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{pace}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>{lang === 'id' ? 'Pace (/km)' : 'Pace'}</div>
              </div>
            </div>

            {act.route && act.route.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapIcon size={16} color="#818cf8" />
                  Route Map
                </h3>
                <div style={{ height: 200, width: '100%', borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                  <MapContainer center={[0,0]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={false} attributionControl={false}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <Polyline 
                      positions={act.route.map(pt => [pt.lat !== undefined ? pt.lat : pt[0], pt.lon !== undefined ? pt.lon : pt[1]])} 
                      color="#818cf8" 
                      weight={4}
                      opacity={0.8}
                    />
                    <MapBounds points={act.route.map(pt => [pt.lat !== undefined ? pt.lat : pt[0], pt.lon !== undefined ? pt.lon : pt[1]])} />
                  </MapContainer>
                </div>
              </div>
            )}

            {act.stravaId ? (
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Zap size={16} color="#a78bfa" />
                    Laps / Splits
                  </h3>
                </div>

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 13 }}>
                    <div className="spinner" style={{ width: 24, height: 24, border: '3px solid rgba(129, 140, 248, 0.2)', borderTopColor: 'var(--accent-purple)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                    {lang === 'id' ? 'Mengambil data laps...' : 'Fetching laps...'}
                  </div>
                ) : error ? (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: 16, borderRadius: 8, color: '#ef4444', fontSize: 13, textAlign: 'center' }}>
                    {error}
                  </div>
                ) : laps.length > 0 ? (
                  <div style={{ background: 'var(--bg-card)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '12px 16px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Lap</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Dist</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Time</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>Pace</th>
                          <th style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600 }}>HR</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          let isInterval = false;
                          if (act.name && act.name.toLowerCase().includes('interval')) {
                            isInterval = true;
                          } else if (laps.length >= 3) {
                            const paces = laps.map(lap => lap.distance ? lap.moving_time / (lap.distance / 1000) : null).filter(p => p !== null);
                            if (paces.length >= 2) {
                              const minPace = Math.min(...paces);
                              const maxPace = Math.max(...paces);
                              const badge = getBadge(act.avgHr, act.maxHr);
                              const isIntense = badge && (badge.label.toLowerCase().includes('ngepush') || badge.label.toLowerCase().includes('fire') || badge.label.toLowerCase().includes('overreaching'));
                              
                              if (isIntense && (maxPace - minPace > 180 || maxPace > 600)) {
                                isInterval = true;
                              }
                            }
                          }

                          const fastLaps = laps.filter(lap => {
                            if (!overallSecPerKm) return true;
                            const p = lap.distance ? lap.moving_time / (lap.distance / 1000) : Infinity;
                            return p <= overallSecPerKm;
                          });
                          
                          const displayedLaps = isInterval ? fastLaps : laps;
                          
                          return displayedLaps.map((lap, idx) => {
                            const distKm = lap.distance ? (lap.distance / 1000).toFixed(2) : '-';
                            const timeStr = lap.moving_time ? formatSecs(lap.moving_time) : '-';
                            const p = lap.moving_time && lap.distance ? (lap.moving_time / (lap.distance / 1000)) : null;
                            const paceStr = formatPace(p ? p / 60 : null);
                            
                            // Highlight if it's a fast lap
                            const isFast = overallSecPerKm && p && p <= overallSecPerKm;
                            
                            return (
                              <tr key={lap.id} style={{ borderBottom: idx === displayedLaps.length - 1 ? 'none' : '1px solid var(--border)', background: (isInterval ? 'transparent' : (isFast ? 'rgba(167, 139, 250, 0.03)' : 'transparent')) }}>
                                <td style={{ padding: '12px 16px', color: isFast ? 'var(--accent-purple)' : 'var(--text-primary)', fontWeight: 600 }}>{lap.lap_index || idx + 1}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{distKm}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{timeStr}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)', fontWeight: isFast ? 700 : 400 }}>{paceStr}</td>
                                <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                  {lap.average_heartrate ? Math.round(lap.average_heartrate) : '-'}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                    
                    {/* Fast Laps Summary Footer */}
                    {laps.length > 0 && overallSecPerKm && (
                      <div style={{ padding: '12px 16px', background: 'rgba(167, 139, 250, 0.08)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          {lang === 'id' ? 'Rata-rata Pace Lari Cepat (Active):' : 'Avg Fast Pace (Active):'}
                        </span>
                        <span style={{ color: 'var(--accent-purple)', fontWeight: 800, fontSize: 14 }}>
                          {(() => {
                            const fastLaps = laps.filter(lap => {
                              const p = lap.distance ? lap.moving_time / (lap.distance / 1000) : Infinity;
                              return p <= overallSecPerKm;
                            });
                            if (fastLaps.length === 0) return '-';
                            const totalFastTime = fastLaps.reduce((acc, lap) => acc + lap.moving_time, 0);
                            const totalFastDist = fastLaps.reduce((acc, lap) => acc + lap.distance, 0);
                            if (totalFastDist === 0) return '-';
                            const trueFastPace = totalFastTime / (totalFastDist / 1000);
                            return formatPace(trueFastPace / 60);
                          })()}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)', fontSize: 13, background: 'var(--bg-card)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    {lang === 'id' ? 'Tidak ada data laps untuk aktivitas ini.' : 'No laps data found for this activity.'}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, textAlign: 'center', border: '1px dashed var(--border)', marginTop: 8 }}>
                <div style={{ width: 48, height: 48, background: 'rgba(255,255,255,0.05)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  {lang === 'id' ? 'Laps Tidak Tersedia' : 'Laps Unavailable'}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {lang === 'id' 
                    ? 'Aktivitas ini tidak memiliki referensi ID Strava (mungkin di-import secara manual atau tersinkronisasi sebelum fitur splits ditambahkan).' 
                    : 'This activity has no Strava ID reference.'}
                </div>
              </div>
            )}
            
            <style>{`
              @keyframes spin { 100% { transform: rotate(360deg); } }
              .leaflet-container { background: var(--bg-card) !important; }
            `}</style>
          </div>

          {onDelete && (
            <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', background: 'rgba(239, 68, 68, 0.05)', display: 'flex', justifyContent: 'center' }}>
              <button 
                onClick={() => onDelete(act.startTimeLocal)}
                style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '10px 24px', borderRadius: '8px', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Trash2 size={16} /> {lang === 'id' ? 'Hapus Sesi Lari Ini' : 'Delete This Run Session'}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

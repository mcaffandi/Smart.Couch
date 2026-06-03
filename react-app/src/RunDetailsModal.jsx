import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Activity, Zap, TrendingUp, Edit2, Trash2, Map as MapIcon } from 'lucide-react';
import { MapContainer, TileLayer, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapBounds({ points }) {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), { padding: [20, 20] });
    }
  }, [map, points]);
  return null;
}

export default function RunDetailsModal({ act, onClose, lang = 'id', stravaAccessToken, isPremium, onEdit, onDelete }) {
  const [laps, setLaps] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchLaps() {
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
        if (data.laps) {
          setLaps(data.laps);
        }
      } catch (err) {
        console.error('Error fetching Strava activity:', err);
        setError(lang === 'id' ? 'Gagal mengambil data Laps dari Strava.' : 'Failed to fetch Laps from Strava.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchLaps();
  }, [act.stravaId, stravaAccessToken, lang]);

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
  
  const pace = act.distance && act.duration
    ? ((act.duration / 60000) / (act.distance / 100000)).toFixed(2)
    : '–';
    
  const formatPace = (secPerM) => {
    if (!secPerM) return '–';
    const paceMins = Math.floor(secPerM / 60);
    const paceSecs = Math.round(secPerM % 60);
    return `${paceMins}:${paceSecs.toString().padStart(2, '0')}`;
  };

  const formatSecs = (total) => {
    const min = Math.floor(total / 60);
    const sec = Math.round(total % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 9999 }}>
        <motion.div 
          className="modal-content"
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: 500, width: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-surface)' }}
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
            <button onClick={onClose} className="btn-close" style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
              <X size={20} />
            </button>
          </div>

          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }} className="hide-scrollbar">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Activity size={20} color="#818cf8" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{distKm}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>km</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <TrendingUp size={20} color="#34d399" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{formattedDur}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>waktu</div>
              </div>
              <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 12, textAlign: 'center', border: '1px solid var(--border)' }}>
                <Zap size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>{pace}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>/km</div>
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
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={16} color="#a78bfa" />
                  Laps / Splits
                </h3>

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
                        {laps.map((lap, idx) => {
                          const distKm = lap.distance ? (lap.distance / 1000).toFixed(2) : '-';
                          const timeStr = lap.moving_time ? formatSecs(lap.moving_time) : '-';
                          const p = lap.moving_time && lap.distance ? (lap.moving_time / (lap.distance / 1000)) : null;
                          const paceStr = formatPace(p);
                          
                          return (
                            <tr key={lap.id} style={{ borderBottom: idx === laps.length - 1 ? 'none' : '1px solid var(--border)' }}>
                              <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 600 }}>{lap.lap_index || idx + 1}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{distKm}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{timeStr}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>{paceStr}</td>
                              <td style={{ padding: '12px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                                {lap.average_heartrate ? Math.round(lap.average_heartrate) : '-'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
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

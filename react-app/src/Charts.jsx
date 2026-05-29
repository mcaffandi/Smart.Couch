import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { msToDate } from './utils';

// ─── Trend chart (monthly/weekly distance) ──────────────────────────────────
export function TrendChart({ activities, lang = 'id' }) {
  const [viewMode, setViewMode] = useState('month'); // 'month' or 'week'

  const aggregated = {};
  for (const a of activities) {
    if (!a.startTimeLocal) continue;
    // distance in cm → km
    const distKm = (a.distance ?? 0) / 100000;
    if (distKm <= 0) continue;
    
    const d = new Date(a.startTimeLocal);
    let key;
    if (viewMode === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    }
    
    aggregated[key] = (aggregated[key] ?? 0) + distKm;
  }

  const data = Object.entries(aggregated)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, km]) => {
      let label;
      if (viewMode === 'month') {
        label = new Date(key + '-01').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: '2-digit' });
      } else {
        const d = new Date(key);
        label = `${d.getDate()} ${d.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short' })}`;
      }
      return {
        key,
        label,
        km: parseFloat(km.toFixed(1)),
      };
    });

  const totalKm = data.reduce((s, d) => s + d.km, 0).toFixed(1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)'
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>
            {viewMode === 'week' ? (lang === 'id' ? `Minggu, ${label}` : `Week of ${label}`) : label}
          </div>
          <div style={{ fontWeight: 700 }}>{payload[0].value} km</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="chart-title" style={{ fontSize: 14, fontWeight: 600 }}>
          {lang === 'id' ? 'Tren Jarak' : 'Distance Trend'}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 20, padding: 4, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setViewMode('week')}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 16, border: 'none', background: viewMode === 'week' ? 'var(--accent-purple)' : 'transparent', color: viewMode === 'week' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {lang === 'id' ? 'Mingguan' : 'Weekly'}
            </button>
            <button 
              onClick={() => setViewMode('month')}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 16, border: 'none', background: viewMode === 'month' ? 'var(--accent-purple)' : 'transparent', color: viewMode === 'month' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {lang === 'id' ? 'Bulanan' : 'Monthly'}
            </button>
          </div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={15} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickMargin={8} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone" dataKey="km" stroke="#818cf8" strokeWidth={3}
            dot={{ r: 4, fill: '#818cf8', stroke: 'var(--bg-base)', strokeWidth: 2 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HR Zones bar chart ───────────────────────────────────────────────────────
export function HRZoneChart({ zones, avgHr, lang = 'id' }) {
  const data = zones.map(z => {
    let zoneLabel = z.zone;
    if (lang === 'id') {
      zoneLabel = z.zone
        .replace(/Recovery/gi, 'Pemulihan')
        .replace(/Aerobic/gi, 'Aerobik')
        .replace(/Threshold/gi, 'Ambang Batas');
    }
    return {
      zone: zoneLabel.split(' – ')[0],
      label: zoneLabel,
      min: z.min,
      max: z.max,
      color: z.color,
      value: z.max - z.min,
    };
  });

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      const d = payload[0].payload;
      const inZone = avgHr >= d.min && avgHr <= d.max;
      return (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)'
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4, color: d.color }}>{d.label}</div>
          <div style={{ color: 'var(--text-secondary)' }}>{d.min} – {d.max} bpm</div>
          {inZone && (
            <div style={{ color: '#34d399', marginTop: 4 }}>
              {lang === 'id' ? `← Avg HR lo (${avgHr} bpm)` : `← Your avg HR (${avgHr} bpm)`}
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ padding: '20px 16px' }}>
      <div className="chart-title" style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>{lang === 'id' ? 'Zona Detak Jantung' : 'Heart Rate Zones'}</div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={8} />
          <YAxis dataKey="zone" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} width={45} tickMargin={8} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

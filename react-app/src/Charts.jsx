import React, { useState } from 'react';
import { ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, LabelList } from 'recharts';
import { msToDate } from './utils';

// ─── Trend chart (monthly/weekly distance) ──────────────────────────────────
export function TrendChart({ activities, lang = 'id', externalTimeRange, setExternalTimeRange }) {
  const [viewMode, setViewMode] = useState('month'); // 'month', 'week', 'day'
  const [internalTimeRange, setInternalTimeRange] = useState('all');
  
  const timeRange = externalTimeRange !== undefined ? externalTimeRange : internalTimeRange;
  const setTimeRange = setExternalTimeRange !== undefined ? setExternalTimeRange : setInternalTimeRange;

  const now = new Date().getTime();
  const ranges = {
    '1w': now - 7 * 24 * 60 * 60 * 1000,
    '1m': now - 30 * 24 * 60 * 60 * 1000,
    '3m': now - 90 * 24 * 60 * 60 * 1000,
    '6m': now - 180 * 24 * 60 * 60 * 1000,
    '1y': now - 365 * 24 * 60 * 60 * 1000,
  };

  const filteredActivities = activities.filter(a => {
    if (!a.startTimeLocal) return false;
    if (timeRange === 'all') return true;
    return a.startTimeLocal >= ranges[timeRange];
  });

  const aggregated = {};
  for (const a of filteredActivities) {
    if (!a.startTimeLocal) continue;
    // distance in cm → km
    const distKm = (a.distance ?? 0) / 100000;
    if (distKm <= 0) continue;
    
    const d = new Date(a.startTimeLocal);
    let key;
    if (viewMode === 'month') {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    } else if (viewMode === 'week') {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      key = `${monday.getFullYear()}-${String(monday.getMonth() + 1).padStart(2, '0')}-${String(monday.getDate()).padStart(2, '0')}`;
    } else { // day
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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

  // Calculate 3-point Moving Average
  for (let i = 0; i < data.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - 2); j <= i; j++) {
      sum += data[j].km;
      count++;
    }
    data[i].ma = parseFloat((sum / count).toFixed(1));
  }

  const totalKm = data.reduce((s, d) => s + d.km, 0).toFixed(1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)'
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 8, borderBottom: '1px solid var(--border)', paddingBottom: 6 }}>
            {viewMode === 'week' ? (lang === 'id' ? `Minggu, ${label}` : `Week of ${label}`) : label}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--accent-purple)' }}>Volume: {payload[0]?.payload.km} km</div>
          <div style={{ fontWeight: 600, color: 'var(--accent-amber)', marginTop: 4 }}>Trend (MA): {payload[0]?.payload.ma} km</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="chart-title" style={{ fontSize: 14, fontWeight: 600 }}>
            {lang === 'id' ? 'Tren Jarak' : 'Distance Trend'}
          </div>
          <div style={{ display: 'flex', background: 'var(--bg-surface)', borderRadius: 20, padding: 4, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setViewMode('day')}
              style={{ padding: '4px 10px', fontSize: 11, fontWeight: 600, borderRadius: 16, border: 'none', background: viewMode === 'day' ? 'var(--accent-purple)' : 'transparent', color: viewMode === 'day' ? '#fff' : 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.2s' }}
            >
              {lang === 'id' ? 'Harian' : 'Daily'}
            </button>
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
        
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
          {[
            { val: 'all', label: lang === 'id' ? 'Semua' : 'All Time' },
            { val: '1y', label: '1Y' },
            { val: '6m', label: '6M' },
            { val: '3m', label: '3M' },
            { val: '1m', label: '1M' },
            { val: '1w', label: '1W' },
          ].map(r => (
            <button
              key={r.val}
              onClick={() => {
                setTimeRange(r.val);
                if (r.val === '1w' || r.val === '1m') setViewMode('day');
                else if (r.val === '3m' || r.val === '6m') setViewMode('week');
              }}
              style={{
                padding: '4px 12px', fontSize: 11, fontWeight: 600, borderRadius: 12, border: '1px solid var(--border)',
                background: timeRange === r.val ? 'var(--text-primary)' : 'transparent',
                color: timeRange === r.val ? 'var(--bg-base)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <ComposedChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} tickMargin={10} minTickGap={15} />
          <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 10 }} axisLine={false} tickLine={false} width={40} tickMargin={8} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-hover)', opacity: 0.5 }} />
          <Bar dataKey="km" fill="var(--accent-purple)" opacity={0.6} radius={[4, 4, 0, 0]} maxBarSize={40} />
          <Line
            type="monotone" dataKey="ma" stroke="var(--accent-amber)" strokeWidth={3}
            dot={false}
            activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent-amber)' }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── HR Zones bar chart ───────────────────────────────────────────────────────
export function HRZoneChart({ zones, activities = [], avgHr, lang = 'id' }) {
  let totalDurMs = 0;
  const zoneMs = zones.map(() => 0);

  // Estimate time in zone based on avgHr of each activity
  activities.forEach(a => {
    if (!a.avgHr || !a.duration) return;
    totalDurMs += a.duration;
    for (let i = 0; i < zones.length; i++) {
      if (a.avgHr >= zones[i].min && a.avgHr <= zones[i].max) {
        zoneMs[i] += a.duration;
        break;
      }
    }
  });

  const data = zones.map((z, i) => {
    let zoneLabel = z.zone;
    if (lang === 'id') {
      zoneLabel = z.zone
        .replace(/Recovery/gi, 'Pemulihan')
        .replace(/Aerobic/gi, 'Aerobik')
        .replace(/Threshold/gi, 'Ambang Batas');
    }
    
    const ms = zoneMs[i];
    const mins = Math.round(ms / 60000);
    const hrs = Math.floor(mins / 60);
    const m = mins % 60;
    const durStr = hrs > 0 ? `${hrs}j ${m}m` : `${m}m`;
    const pct = totalDurMs > 0 ? Math.round((ms / totalDurMs) * 100) : 0;

    return {
      zone: zoneLabel.split(' – ')[0],
      label: zoneLabel,
      min: z.min,
      max: z.max,
      color: z.color,
      value: totalDurMs > 0 ? Math.max(0.5, pct) : 10, // bar length
      pctStr: totalDurMs > 0 ? `${pct}%` : '',
      durStr: totalDurMs > 0 ? durStr : '',
      labelStr: ms > 0 ? `${durStr} (${pct}%)` : '',
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
          <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{d.min} – {d.max} bpm</div>
          {d.durStr && (
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
              {lang === 'id' ? 'Est. Waktu: ' : 'Est. Time: '}{d.durStr} ({d.pctStr})
            </div>
          )}
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
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 100, left: 0, bottom: 0 }} barCategoryGap="20%">
          <XAxis type="number" domain={[0, 'dataMax + 10']} tick={false} axisLine={false} tickLine={false} />
          <YAxis dataKey="zone" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={45} tickMargin={8} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--bg-card-hover)' }} />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} fillOpacity={0.9} />
            ))}
            <LabelList 
              dataKey="labelStr" 
              position="right" 
              fill="var(--text-secondary)" 
              fontSize={11}
              fontWeight={600}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

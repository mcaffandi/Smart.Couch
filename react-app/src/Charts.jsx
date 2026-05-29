import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { msToDate } from './utils';

// ─── Trend chart (monthly distance) ─────────────────────────────────────────
export function TrendChart({ activities, lang = 'id' }) {
  const monthly = {};
  for (const a of activities) {
    if (!a.startTimeLocal) continue;
    // distance in cm → km
    const distKm = (a.distance ?? 0) / 100000;
    if (distKm <= 0) continue;
    const d = new Date(a.startTimeLocal);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthly[key] = (monthly[key] ?? 0) + distKm;
  }

  const data = Object.entries(monthly)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, km]) => ({
      key,
      label: new Date(key + '-01').toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { month: 'short', year: '2-digit' }),
      km: parseFloat(km.toFixed(1)),
    }));

  const totalKm = data.reduce((s, d) => s + d.km, 0).toFixed(1);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '10px 14px', fontSize: 13, color: 'var(--text-primary)'
        }}>
          <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontWeight: 700 }}>{payload[0].value} km</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container" style={{ padding: '20px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 16 }}>
        <div className="chart-title" style={{ fontSize: 14, fontWeight: 600 }}>{lang === 'id' ? 'Total Jarak per Bulan (km)' : 'Total Monthly Distance (km)'}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {lang === 'id' ? 'Total keseluruhan:' : 'Overall total:'} <strong style={{ color: 'var(--text-primary)' }}>{totalKm} km</strong>
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
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 10, left: -20, bottom: 0 }} barCategoryGap="25%">
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

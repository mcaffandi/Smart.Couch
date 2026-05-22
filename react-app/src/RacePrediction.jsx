import { useState, useMemo } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────
const RACES = [
  { key: '5k',  label: '5 km',          dist: 5000,   color: '#818cf8', colorDim: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
  { key: '10k', label: '10 km',         dist: 10000,  color: '#34d399', colorDim: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)'  },
  { key: 'hm',  label: 'Half Marathon', dist: 21097,  color: '#fbbf24', colorDim: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)'  },
  { key: 'fm',  label: 'Marathon',      dist: 42195,  color: '#fb7185', colorDim: 'rgba(251,113,133,0.08)', border: 'rgba(251,113,133,0.2)' },
];

const RIEGEL = 1.06;

// ─── Utils ────────────────────────────────────────────────────────────────────
function secsToTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.round(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function formatPace(minKm) {
  const m = Math.floor(minKm);
  const s = Math.round((minKm - m) * 60);
  return `${m}:${String(s).padStart(2,'0')}`;
}

function timeToSecs(h, m, s) { return h * 3600 + m * 60 + s; }

function getBestRuns(activities, days = 9999) {
  const cutoff = days < 9999 ? Date.now() - days * 86400000 : 0;
  return activities
    .filter(a =>
      a.startTimeLocal &&
      a.startTimeLocal >= cutoff &&
      a.distance >= 300000 &&   // 3 km in cm
      a.duration > 0
    )
    .map(a => ({
      ...a,
      distM: a.distance / 100,          // cm → meters
      distKm: a.distance / 100000,      // cm → km
      durationSec: a.duration / 1000,   // ms → seconds
      paceMinKm: (a.duration / 60000) / (a.distance / 100000), // min/km
    }))
    // Sanity: only realistic human pace (3–20 min/km)
    .filter(a => a.paceMinKm >= 3 && a.paceMinKm <= 20)
    .sort((a, b) => a.paceMinKm - b.paceMinKm); // fastest first
}

// Compare avg pace: recent 4w vs 4–8w ago → detect stagnation
function detectStagnation(activities, lang = 'id') {
  const now = Date.now();
  const w4 = 28 * 86400000;
  const w8 = 56 * 86400000;

  const recent = activities.filter(a => a.startTimeLocal >= now - w4 && a.distance >= 300000 && a.duration > 0);
  const older  = activities.filter(a => a.startTimeLocal >= now - w8 && a.startTimeLocal < now - w4 && a.distance >= 300000 && a.duration > 0);

  if (recent.length < 2 || older.length < 2) return { stagnant: false, note: null };

  const avgPace = (arr) => arr.reduce((s, a) => s + (a.duration / 60000) / (a.distance / 100000), 0) / arr.length;
  const recentPace = avgPace(recent);
  const olderPace  = avgPace(older);
  const improvement = ((olderPace - recentPace) / olderPace) * 100; // positive = got faster

  if (improvement < 0.5) {
    return {
      stagnant: true,
      pct: improvement.toFixed(1),
      note: improvement < 0
        ? (lang === 'id' 
            ? `Pace lo turun ${Math.abs(improvement).toFixed(1)}% dalam 4 minggu terakhir — estimasi ditambah buffer.`
            : `Your pace decreased by ${Math.abs(improvement).toFixed(1)}% in the last 4 weeks — estimation buffer added.`)
        : (lang === 'id'
            ? `Hampir tidak ada progress pace (${improvement.toFixed(1)}%) — estimasi ditambah buffer recovery.`
            : `Almost no pace progress (${improvement.toFixed(1)}%) — recovery buffer added.`),
    };
  }
  return { stagnant: false, improvement: improvement.toFixed(1), note: null };
}

// Weeks to reach target pace, with stagnation buffer
// Base: ~1.5% improvement per 4 weeks (conservative)
function estimateWeeks(currentPaceMinKm, targetPaceMinKm, stagnant) {
  if (targetPaceMinKm >= currentPaceMinKm) return 0; // already there
  const improvementNeeded = ((currentPaceMinKm - targetPaceMinKm) / currentPaceMinKm) * 100;
  const ratePerMonth = stagnant ? 0.8 : 1.5; // % per 4-week block
  const months = improvementNeeded / ratePerMonth;
  const weeks = Math.ceil(months * 4.33);
  return stagnant ? Math.ceil(weeks * 1.35) : weeks; // +35% buffer if stagnant
}

function estimateVO2Max(paceMinKm) {
  if (paceMinKm < 3 || paceMinKm > 20) return null; // guard against bad input
  const vel = 1000 / paceMinKm;                      // m/min
  const o2 = -4.60 + 0.182258 * vel + 0.000104 * vel * vel;
  const result = Math.round(o2 / 0.85);
  return Math.min(90, Math.max(10, result));          // clamp to realistic human range
}

// ─── Goal Input sub-component ─────────────────────────────────────────────────
function GoalTimeInput({ value, onChange, lang = 'id' }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {[
        { key: 'h', label: lang === 'id' ? 'jam' : 'hr', max: 9 },
        { key: 'm', label: lang === 'id' ? 'menit' : 'min', max: 59 },
        { key: 's', label: lang === 'id' ? 'detik' : 'sec', max: 59 },
      ].map(({ key, label, max }) => (
        <div key={key} style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          <label style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</label>
          <input
            type="number" min={0} max={max}
            value={value[key]}
            onChange={e => onChange({ ...value, [key]: Math.min(max, Math.max(0, parseInt(e.target.value) || 0)) })}
            style={{
              background: 'var(--bg-base)', border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-primary)', fontFamily: 'Outfit, sans-serif',
              fontSize: 18, fontWeight: 700, padding: '8px 6px', textAlign: 'center', outline: 'none',
              width: '100%'
            }}
          />
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function RacePrediction({ activities, targetPace, lang = 'id' }) {
  const [selectedRace, setSelectedRace] = useState('10k');
  const [goalTime, setGoalTime] = useState({ h: 0, m: 50, s: 0 });

  const allRuns    = useMemo(() => getBestRuns(activities),     [activities]); // ALL data
  const recentRuns = useMemo(() => getBestRuns(activities, 90), [activities]); // last 90 days
  const realRefRun = allRuns[0]; // best run ever as reference

  const hasData = !!realRefRun;

  // If no data but targetPace is available, simulate a 5k run at targetPace
  const refRun = realRefRun || (targetPace ? {
    distM: 5000,
    durationSec: targetPace * 60 * 5,
    paceMinKm: targetPace,
    distKm: 5,
    startTimeLocal: Date.now()
  } : null);

  const stagnation = useMemo(() => detectStagnation(activities, lang), [activities, lang]);

  const dataLabel = realRefRun
    ? realRefRun.startTimeLocal >= Date.now() - 90 * 86400000
      ? (lang === 'id' ? '90 hari terakhir' : 'last 90 days')
      : (lang === 'id' ? `semua data (${allRuns.length} sesi)` : `all data (${allRuns.length} sessions)`)
    : (lang === 'id' ? 'Simulasi Target Pace' : 'Target Pace Simulation');

  const confidence  = hasData 
    ? (recentRuns.length >= 5 
        ? (lang === 'id' ? 'Tinggi' : 'High') 
        : recentRuns.length >= 2 
          ? (lang === 'id' ? 'Sedang' : 'Moderate') 
          : (lang === 'id' ? 'Rendah' : 'Low')) 
    : (lang === 'id' ? 'Teoretis' : 'Theoretical');
  const confColor   = hasData ? (recentRuns.length >= 5 ? '#34d399' : recentRuns.length >= 2 ? '#fbbf24' : '#fb7185') : '#818cf8';

  // Predictions for all distances
  const predictions = useMemo(() => {
    if (!refRun) return [];
    const refSec = refRun.durationSec;
    const refDistM = refRun.distM; // meters
    return RACES.map(r => {
      const predSec = refSec * Math.pow(r.dist / refDistM, RIEGEL); // both in meters
      const predPace = (predSec / 60) / (r.dist / 1000);
      return { ...r, predSec, predPace };
    });
  }, [refRun]);

  // Goal calculation
  const goalSecs = timeToSecs(goalTime.h, goalTime.m, goalTime.s);
  const targetRace = RACES.find(r => r.key === selectedRace);
  const currentPred = predictions.find(p => p.key === selectedRace);

  const goalValid = goalSecs > 0;
  const goalPaceMinKm = goalValid && targetRace ? (goalSecs / 60) / (targetRace.dist / 1000) : null;
  const alreadyAchieved = goalValid && currentPred && goalSecs >= currentPred.predSec;
  const weeksNeeded = goalPaceMinKm && refRun && !alreadyAchieved
    ? estimateWeeks(refRun.paceMinKm, goalPaceMinKm, stagnation.stagnant)
    : 0;

  const vo2max = refRun ? estimateVO2Max(refRun.paceMinKm) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!hasData && (
        <div className="alert alert-info" style={{ marginBottom: -4 }}>
          {lang === 'id' ? (
            <>
              <strong>Mode Simulasi AI:</strong> Belum ada data riwayat lari. Prediksi di bawah adalah estimasi teoretis jika lo konsisten berlatih di <strong>Target Pace ({formatPace(targetPace)}/km)</strong>.
            </>
          ) : (
            <>
              <strong>AI Simulation Mode:</strong> No running history data yet. The predictions below are theoretical estimates based on consistent training at your <strong>Target Pace ({formatPace(targetPace)}/km)</strong>.
            </>
          )}
        </div>
      )}

      {/* ── Reference banner ────────────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '16px 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 4 }}>
            {lang === 'id' ? `Data Terbaik — ${dataLabel}` : `Best Data — ${dataLabel}`}
          </div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
            {refRun.distKm.toFixed(1)} km &nbsp;·&nbsp; {formatPace(refRun.paceMinKm)} min/km
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            {lang === 'id' ? 'Sesi tercepat lo sebagai referensi kalkulasi' : 'Your fastest session as calculation reference'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {lang === 'id' ? 'Akurasi' : 'Accuracy'}
            </div>
            <div style={{ fontWeight: 800, fontSize: 18, color: confColor, marginTop: 2 }}>{confidence}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {lang === 'id' 
                ? `${(recentRuns.length || allRuns.length)} sesi valid` 
                : `${(recentRuns.length || allRuns.length)} valid sessions`}
            </div>
          </div>
          {vo2max > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Est. VO2Max</div>
              <div style={{ fontWeight: 900, fontSize: 22, color: '#818cf8', marginTop: 2 }}>{vo2max}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>ml/kg/min</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stagnation alert ─────────────────────────────────────────── */}
      {stagnation.stagnant && (
        <div className="alert alert-warning">
          {lang === 'id' ? (
            <>
              <strong>Progress Stagnan:</strong> {stagnation.note} Estimasi waktu tercapai sudah disesuaikan dengan buffer.
            </>
          ) : (
            <>
              <strong>Stagnant Progress:</strong> {stagnation.note} Estimated target times have been adjusted with recovery buffer.
            </>
          )}
        </div>
      )}
      {stagnation.improvement && !stagnation.stagnant && (
        <div className="alert alert-success">
          {lang === 'id' ? (
            <>
              <strong>Progress Baik:</strong> Pace lo membaik {stagnation.improvement}% dalam 4 minggu terakhir. Pertahankan konsistensi!
            </>
          ) : (
            <>
              <strong>Good Progress:</strong> Your pace improved by {stagnation.improvement}% over the last 4 weeks. Keep it up!
            </>
          )}
        </div>
      )}

      {/* ── Prediction cards ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
        {predictions.map(p => (
          <div key={p.key} style={{
            background: p.colorDim, border: `1px solid ${p.border}`,
            borderRadius: 14, padding: '18px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: p.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.5px', lineHeight: 1.1, marginTop: 6 }}>
              {secsToTime(p.predSec)}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {formatPace(p.predPace)} <span style={{ fontSize: 10 }}>min/km</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Goal / Weeks-to-achieve ──────────────────────────────────── */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
        borderRadius: 16, padding: '20px',
      }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
          {lang === 'id' ? 'Estimasi Waktu Mencapai Target' : 'Estimated Time to Achieve Goal'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
          {lang === 'id' 
            ? 'Masukkan target waktu lo — sistem kalkulasi berapa minggu lagi bisa tercapai.' 
            : 'Enter your goal time — the system calculates how many weeks are needed to reach it.'}
        </div>

        {/* Race selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {RACES.map(r => (
            <button
              key={r.key}
              onClick={() => setSelectedRace(r.key)}
              style={{
                padding: '6px 14px', borderRadius: 20, border: `1px solid ${selectedRace === r.key ? r.color : 'var(--border)'}`,
                background: selectedRace === r.key ? `${r.colorDim}` : 'transparent',
                color: selectedRace === r.key ? r.color : 'var(--text-muted)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.15s',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        {/* Time input — WAJIB diisi user */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
            {lang === 'id' ? `Target Waktu untuk ${targetRace?.label}` : `Target Time for ${targetRace?.label}`}
            <span style={{ color: '#fb7185', marginLeft: 4 }}>*</span>
          </div>
          <GoalTimeInput value={goalTime} onChange={setGoalTime} lang={lang} />
        </div>

        {/* Result */}
        {!goalValid ? (
          <div style={{
            padding: '16px', borderRadius: 12, background: 'var(--hover-overlay)',
            border: '1px dashed var(--border)', textAlign: 'center',
            fontSize: 13, color: 'var(--text-muted)'
          }}>
            {lang === 'id' ? 'Isi target waktu di atas untuk melihat estimasi' : 'Fill in target time above to see estimation'}
          </div>
        ) : alreadyAchieved ? (
          <div className="alert alert-success">
            {lang === 'id' ? (
              <>
                <strong>Target sudah tercapai!</strong> Prediksi saat ini ({secsToTime(currentPred.predSec)}) sudah lebih cepat dari target {secsToTime(goalSecs)}.
                Naikkan target lo atau pilih jarak lebih jauh!
              </>
            ) : (
              <>
                <strong>Target already achieved!</strong> Your current prediction ({secsToTime(currentPred.predSec)}) is already faster than the target {secsToTime(goalSecs)}.
                Increase your target or select a longer distance!
              </>
            )}
          </div>
        ) : (
          <div style={{
            background: 'linear-gradient(135deg, rgba(79,70,229,0.1), rgba(124,58,237,0.06))',
            border: '1px solid rgba(129,140,248,0.25)',
            borderRadius: 14, padding: '20px',
          }}>
            <div className="prediction-estimation-header" style={{ marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {lang === 'id' ? 'Estimasi Tercapai' : 'Estimated Time'}
                </div>
                <div style={{ fontSize: 42, fontWeight: 900, color: '#818cf8', letterSpacing: '-1px', lineHeight: 1 }}>
                  {weeksNeeded}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 600 }}>
                  {lang === 'id' ? 'minggu' : 'weeks'}
                </div>
              </div>
              <div className="prediction-grid-container" style={{ flex: 1, minWidth: 160 }}>
                <div className="prediction-details-grid">
                  <div style={{ background: 'var(--hover-overlay)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {lang === 'id' ? 'Prediksi Saat Ini' : 'Current Prediction'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{secsToTime(currentPred.predSec)}</div>
                  </div>
                  <div style={{ background: 'var(--hover-overlay)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {lang === 'id' ? 'Target Lo' : 'Your Goal'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#818cf8', marginTop: 2 }}>{secsToTime(goalSecs)}</div>
                  </div>
                  <div style={{ background: 'var(--hover-overlay)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {lang === 'id' ? 'Pace Target' : 'Target Pace'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginTop: 2 }}>{formatPace(goalPaceMinKm)} /km</div>
                  </div>
                  <div style={{ background: 'var(--hover-overlay)', borderRadius: 10, padding: '10px 12px' }}>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
                      {lang === 'id' ? 'Perlu Improve' : 'Improvement Needed'}
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#fbbf24', marginTop: 2 }}>
                      {(((refRun.paceMinKm - goalPaceMinKm) / refRun.paceMinKm) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                <span>{lang === 'id' ? `Pace sekarang: ${formatPace(refRun.paceMinKm)}` : `Current pace: ${formatPace(refRun.paceMinKm)}`}</span>
                <span>{lang === 'id' ? `Target: ${formatPace(goalPaceMinKm)}` : `Goal: ${formatPace(goalPaceMinKm)}`}</span>
              </div>
              <div style={{ height: 6, background: 'var(--hover-overlay)', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  width: `${Math.min(100, Math.max(5, (goalPaceMinKm / refRun.paceMinKm) * 100))}%`,
                  background: 'linear-gradient(90deg, #4f46e5, #818cf8)',
                  borderRadius: 99,
                }} />
              </div>
            </div>

            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {stagnation.stagnant
                ? (lang === 'id' 
                    ? 'Estimasi sudah ditambah buffer karena progress 4 minggu terakhir stagnan. Fokus variasi latihan (interval + long run) untuk break plateau.'
                    : 'Estimation includes buffer due to stagnation in the last 4 weeks. Focus on training variation (intervals + long runs) to break the plateau.')
                : (lang === 'id'
                    ? `Dengan latihan konsisten 3–4×/minggu dan peningkatan ~1.5% per bulan, target ${targetRace?.label} lo bisa tercapai dalam sekitar ${weeksNeeded} minggu.`
                    : `With consistent training 3–4×/week and ~1.5% monthly improvements, your ${targetRace?.label} goal can be reached in about ${weeksNeeded} weeks.`)}
            </div>
          </div>
        )}
      </div>

      {/* ── VO2Max interpretation ────────────────────────────────────── */}
      {vo2max > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10 }}>
            {lang === 'id' ? 'Estimasi VO2Max:' : 'Estimated VO2Max:'} <span style={{ color: '#818cf8' }}>{vo2max}</span> ml/kg/min
          </div>
          <div style={{ display: 'flex', gap: 3, height: 6, borderRadius: 99, overflow: 'hidden', marginBottom: 10 }}>
            {[
              { color: '#475569', active: vo2max < 30 || true },
              { color: '#fb7185', active: vo2max >= 30 },
              { color: '#f97316', active: vo2max >= 38 },
              { color: '#fbbf24', active: vo2max >= 46 },
              { color: '#34d399', active: vo2max >= 52 },
              { color: '#38bdf8', active: vo2max >= 57 },
              { color: '#818cf8', active: vo2max >= 62 },
            ].map((seg, i) => (
              <div key={i} style={{ flex: 1, background: seg.color, opacity: seg.active ? 1 : 0.15, transition: 'opacity 0.3s' }} />
            ))}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            {vo2max < 30 ? (lang === 'id' ? 'Pemula — baseline yang bagus. Lari konsisten 3×/minggu bisa naik 5–8 poin dalam 3 bulan pertama.' : 'Beginner — great baseline. Running consistently 3×/week can raise it by 5–8 points in the first 3 months.') :
             vo2max < 38 ? (lang === 'id' ? 'Di bawah rata-rata — potensi improve besar. Fokus easy run volume dulu sebelum interval.' : 'Below average — significant potential to improve. Focus on easy run volume first before starting intervals.') :
             vo2max < 46 ? (lang === 'id' ? 'Rata-rata — level yang solid. Tambahkan interval 1×/minggu untuk naik ke level berikutnya.' : 'Average — a solid level. Add interval training 1×/week to climb to the next level.') :
             vo2max < 52 ? (lang === 'id' ? 'Di atas rata-rata — atletis. Tempo run + progressive overload bisa push lebih jauh.' : 'Above average — athletic. Tempo runs + progressive overload can push it further.') :
             vo2max < 57 ? (lang === 'id' ? 'Baik sekali — setara pelari kompetitif amatir. Jaga volume dan hindari overtraining.' : 'Very good — on par with competitive amateur runners. Keep up volume and avoid overtraining.') :
             vo2max < 62 ? (lang === 'id' ? 'Sangat baik — top 10% populasi. Prioritaskan recovery dan peak week periodization.' : 'Excellent — top 10% of the population. Prioritize recovery and peak-week periodization.') :
             (lang === 'id' ? 'Level elite — di sini butuh coach spesialis dan program periodization ketat.' : 'Elite level — requires a specialist coach and strict periodization programming.')}
          </div>
        </div>
      )}

      {/* Method note */}
      <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, padding: '10px 14px', background: 'var(--hover-overlay)', borderRadius: 10, border: '1px solid var(--border)' }}>
        {lang === 'id' ? (
          <>
            <strong style={{ color: 'var(--text-secondary)' }}>Metode:</strong> Prediksi menggunakan{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Riegel's Formula</strong> (T₂ = T₁ × (D₂/D₁)^1.06) —
            algoritma yang sama digunakan Garmin &amp; Strava. Estimasi minggu dihitung berdasarkan rate improve ~1.5%/bulan
            {stagnation.stagnant ? ' dengan buffer stagnansi.' : '.'}
            &nbsp;Akurasi meningkat seiring bertambahnya data lari &gt; 3 km.
          </>
        ) : (
          <>
            <strong style={{ color: 'var(--text-secondary)' }}>Method:</strong> Predictions use{' '}
            <strong style={{ color: 'var(--text-secondary)' }}>Riegel's Formula</strong> (T₂ = T₁ × (D₂/D₁)^1.06) —
            the same algorithm used by Garmin &amp; Strava. Weekly estimation is calculated based on a ~1.5%/month improvement rate
            {stagnation.stagnant ? ' with a stagnation buffer.' : '.'}
            &nbsp;Accuracy improves as more run data &gt; 3 km is recorded.
          </>
        )}
      </div>
    </div>
  );
}

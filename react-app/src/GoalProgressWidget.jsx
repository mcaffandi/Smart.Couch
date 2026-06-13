import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Target, TrendingDown, Activity, CheckCircle, Flame, PlusCircle, ArrowRight, X, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, ReferenceLine, CartesianGrid } from 'recharts';

export default function GoalProgressWidget({ data, goal, lang = 'id', onLogWeight, onLogRaceDate }) {
  const [showModal, setShowModal] = useState(false);

  const runActs = data.running_activities || [];
  const weightRecs = data.weight_records || [];
  const profileWeight = data.profile?.weight || 70;
  const age = data.profile?.age || 30;
  const maxHR = data.max_hr || (220 - age);

  // ─────────────────────────────────────────
  // Helper Math
  // ─────────────────────────────────────────
  const now = Date.now();
  
  // 1. Weightloss
  const { weightProgress, weightTargetKcal, weightBurnedKcal, weightChartData, startWeight, currentWeight, weightDiff, targetWeight, weightLossETA, programStyle } = useMemo(() => {
    let burned = 0;
    runActs.forEach(a => {
      if (a.distance > 0) {
        burned += (a.distance / 100000) * profileWeight * 1.036; // running kcal
      } else if (a.isManual) {
        burned += (a.duration / 60000) * 8; // approx 8 kcal/min for gym/walking
      }
    });
    const targetKcal = 38500; // approx 5kg (fallback)

    // Chart Data
    let cData = [...weightRecs];
    if (cData.length === 0 && profileWeight) {
      cData.push({ date: new Date().toISOString(), weight: profileWeight });
    }
    const chartData = cData.sort((a,b) => new Date(a.date) - new Date(b.date)).map(r => {
      const d = new Date(r.date);
      return { 
        date: d.toLocaleDateString(lang==='id'?'id-ID':'en-US', { day: 'numeric', month: 'short' }), 
        weight: r.weight 
      };
    });

    const pStyle = data.profile?.programStyle || 'sedang';
    let targetWt = data.profile?.targetWeight;

    const startW = chartData.length > 0 ? chartData[0].weight : profileWeight;
    let loggedCurrentW = chartData.length > 0 ? chartData[chartData.length - 1].weight : profileWeight;
    
    // Estimate current weight if no manual logs exist
    let currentW = loggedCurrentW;
    if (chartData.length <= 1 && burned > 0) {
       currentW = startW - (burned / 7700);
    }

    let diff = startW - currentW;

    if (!targetWt) targetWt = startW > 5 ? startW - 5 : startW;

    let pct = 0;
    if (startW > targetWt) {
       pct = Math.min(100, Math.max(0, Math.round(((startW - currentW) / (startW - targetWt)) * 100)));
    } else {
       pct = 100;
    }

    let rate = 0.5; 
    if (pStyle === 'santai') rate = 0.25;
    else if (pStyle === 'ngepush') rate = 0.8;

    let remainingWt = currentW - targetWt;
    let etaWeeks = 0;
    if (remainingWt > 0) {
       etaWeeks = Math.max(1, Math.ceil(remainingWt / rate));
    }

    return { 
      weightProgress: pct, weightTargetKcal: targetKcal, weightBurnedKcal: Math.round(burned), weightChartData: chartData,
      startWeight: startW, currentWeight: parseFloat(currentW.toFixed(1)), weightDiff: parseFloat(diff.toFixed(1)), targetWeight: targetWt, weightLossETA: etaWeeks, programStyle: pStyle
    };
  }, [runActs, weightRecs, profileWeight, lang, data.profile?.targetWeight, data.profile?.programStyle]);

  // 2. Turun HR / Aerobic Base
  const { hrProgress, z2Hours, z2Target, z2ChartData } = useMemo(() => {
    let z2Ms = 0;
    const weeklyData = {};

    runActs.forEach(a => {
      // Check if it's Z1 or Z2
      const isEasy = (a.avgHr && a.avgHr < maxHR * 0.75) || (!a.avgHr && a.name && (a.name.toLowerCase().includes('santai') || a.name.toLowerCase().includes('easy')));
      if (isEasy) z2Ms += (a.duration || 0);

      // Group by week for chart
      if (a.startTimeLocal) {
        const d = new Date(a.startTimeLocal);
        const wKey = d.getFullYear() + '-W' + Math.ceil(d.getDate() / 7);
        if(!weeklyData[wKey]) weeklyData[wKey] = { week: wKey, z2Mins: 0, otherMins: 0 };
        if(isEasy) weeklyData[wKey].z2Mins += (a.duration || 0) / 60000;
        else weeklyData[wKey].otherMins += (a.duration || 0) / 60000;
      }
    });

    const hours = z2Ms / 3600000;
    const target = 40; // 40 hours target
    const pct = Math.min(100, Math.round((hours / target) * 100));

    const chartData = Object.values(weeklyData).slice(-6); // last 6 weeks

    return { hrProgress: pct, z2Hours: hours.toFixed(1), z2Target: target, z2ChartData: chartData };
  }, [runActs, maxHR]);

  // 3. 5K / 10K / Marathon
  const { raceProgress, currentPeak, targetPeak, raceChartData } = useMemo(() => {
    let target = 5;
    if (goal === '10k') target = 10;
    else if (goal === 'marathon') target = 32;

    let peak = 0;
    const history = [];
    runActs.sort((a,b) => a.startTimeLocal - b.startTimeLocal).forEach(a => {
      const dist = (a.distance || 0) / 100000;
      if (dist > peak) peak = dist;
      if (dist > 2) {
        history.push({
          date: new Date(a.startTimeLocal).toLocaleDateString(lang==='id'?'id-ID':'en-US', { month: 'short', day: 'numeric' }),
          dist: parseFloat(dist.toFixed(1))
        });
      }
    });

    const pct = Math.min(100, Math.round((peak / target) * 100));
    const chartData = history.slice(-10); // last 10 long runs

    return { raceProgress: pct, currentPeak: parseFloat(peak.toFixed(1)), targetPeak: target, raceChartData: chartData };
  }, [runActs, goal, lang]);

  // 4. Maintenance
  const { maintProgress, thisWeekMins, maintChartData } = useMemo(() => {
    const oneWeekAgo = now - 7 * 24 * 3600 * 1000;
    let mins = 0;
    const dailyMins = {};

    runActs.forEach(a => {
      if (a.startTimeLocal >= oneWeekAgo) {
        mins += (a.duration || 0) / 60000;
      }
      if (a.startTimeLocal) {
        const dateStr = new Date(a.startTimeLocal).toISOString().split('T')[0];
        dailyMins[dateStr] = (dailyMins[dateStr] || 0) + ((a.duration || 0) / 60000);
      }
    });

    const pct = Math.min(100, Math.round((mins / 150) * 100));

    // Chart Data (Last 14 days)
    const chartData = [];
    for(let i=13; i>=0; i--) {
      const d = new Date(now - i * 24 * 3600 * 1000);
      const str = d.toISOString().split('T')[0];
      chartData.push({
        date: d.toLocaleDateString(lang==='id'?'id-ID':'en-US', { day: 'numeric', month: 'short' }),
        mins: Math.round(dailyMins[str] || 0)
      });
    }

    return { maintProgress: pct, thisWeekMins: Math.round(mins), maintChartData: chartData };
  }, [runActs, now, lang]);

  // ─────────────────────────────────────────
  // UI Helpers
  // ─────────────────────────────────────────
  const getWidgetContent = () => {
    if (goal === 'weightloss') {
      let diffStr = '';
      if (weightDiff === 0) diffStr = lang === 'id' ? 'Belum ada penurunan' : 'No weight lost yet';
      else if (weightDiff > 0) diffStr = lang === 'id' ? `Turun ${weightDiff} kg dari awal` : `Down ${weightDiff} kg from start`;
      else diffStr = lang === 'id' ? `Naik ${Math.abs(weightDiff)} kg 😱` : `Up ${Math.abs(weightDiff)} kg 😱`;

      return {
        title: lang === 'id' ? 'Progres Turun Berat' : 'Weightloss Progress',
        icon: <TrendingDown size={20} color="#f43f5e" />,
        color: '#f43f5e',
        pct: weightProgress,
        desc: diffStr,
        eta: weightProgress >= 100 ? (lang === 'id' ? 'Target Tercapai! 🎉' : 'Goal Achieved! 🎉') : (lang === 'id' ? `Estimasi: ~${weightLossETA} mgg (${programStyle})` : `ETA: ~${weightLossETA} wks (${programStyle})`)
      };
    } else if (goal === 'turun-hr') {
      return {
        title: lang === 'id' ? 'Kapasitas Aerobik' : 'Aerobic Base',
        icon: <Heart size={20} color="#3b82f6" />,
        color: '#3b82f6',
        pct: hrProgress,
        desc: lang === 'id' ? `${z2Hours} / ${z2Target} jam di Zona 2` : `${z2Hours} / ${z2Target} hrs in Zone 2`,
        eta: lang === 'id' ? `Efisiensi meningkat bertahap` : `Efficiency improving`
      };
    } else if (goal === '5k' || goal === '10k' || goal === 'marathon') {
      return {
        title: lang === 'id' ? `Persiapan ${goal.toUpperCase()}` : `${goal.toUpperCase()} Prep`,
        icon: <Target size={20} color="#10b981" />,
        color: '#10b981',
        pct: raceProgress,
        desc: lang === 'id' ? `Peak Long Run: ${currentPeak} / ${targetPeak} km` : `Peak Long Run: ${currentPeak} / ${targetPeak} km`,
        eta: lang === 'id' ? `Siap dalam ~${Math.max(1, Math.round((targetPeak - currentPeak)/2))} minggu` : `Ready in ~${Math.max(1, Math.round((targetPeak - currentPeak)/2))} weeks`
      };
    } else {
      return {
        title: lang === 'id' ? 'Kesehatan & Kebugaran' : 'Health & Maintenance',
        icon: <Activity size={20} color="#8b5cf6" />,
        color: '#8b5cf6',
        pct: maintProgress,
        desc: lang === 'id' ? `${thisWeekMins} / 150 menit minggu ini` : `${thisWeekMins} / 150 mins this week`,
        eta: maintProgress >= 100 ? (lang === 'id' ? 'Target Terpenuhi! 🔥' : 'Target Achieved! 🔥') : (lang === 'id' ? 'Tetap Konsisten!' : 'Keep it up!')
      };
    }
  };

  const content = getWidgetContent();

  return (
    <>
      {/* Widget Card (Premium Glassmorphic) */}
      <div 
        onClick={() => setShowModal(true)}
        style={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          background: 'var(--bg-surface)', 
          backgroundImage: `linear-gradient(135deg, ${content.color}08 0%, transparent 100%)`,
          border: '1px solid var(--border)', 
          borderRadius: 20, 
          padding: 22, 
          cursor: 'pointer', 
          position: 'relative', 
          overflow: 'hidden', 
          boxShadow: '0 8px 32px rgba(0,0,0,0.04)',
          transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
        onMouseEnter={e => { 
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.01)'; 
          e.currentTarget.style.boxShadow = `0 16px 40px ${content.color}15, 0 0 0 1px ${content.color}40`;
          if (e.currentTarget.querySelector('.glow-orb')) {
            e.currentTarget.querySelector('.glow-orb').style.opacity = '1';
            e.currentTarget.querySelector('.glow-orb').style.transform = 'scale(1.3)';
          }
        }}
        onMouseLeave={e => { 
          e.currentTarget.style.transform = 'none'; 
          e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.04)';
          e.currentTarget.style.border = '1px solid var(--border)';
          if (e.currentTarget.querySelector('.glow-orb')) {
            e.currentTarget.querySelector('.glow-orb').style.opacity = '0.5';
            e.currentTarget.querySelector('.glow-orb').style.transform = 'scale(1)';
          }
        }}
      >
        {/* Glow Orb Background */}
        <div 
          className="glow-orb"
          style={{
            position: 'absolute', top: '-30px', right: '-30px', width: '120px', height: '120px',
            background: `radial-gradient(circle, ${content.color}40 0%, transparent 70%)`,
            borderRadius: '50%', filter: 'blur(20px)', opacity: '0.5',
            transition: 'all 0.6s ease', pointerEvents: 'none', zIndex: 0
          }} 
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ 
              width: 46, height: 46, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `linear-gradient(135deg, ${content.color}25, ${content.color}10)`, 
              borderRadius: 14, 
              border: `1px solid ${content.color}30`, 
              boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.1), 0 4px 12px ${content.color}20` 
            }}>
              {content.icon}
            </div>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, color: content.color, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
                Goal Progress
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {content.title}
              </div>
            </div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 900, color: content.color, lineHeight: 1, letterSpacing: '-0.04em', textShadow: `0 2px 12px ${content.color}40` }}>
            {content.pct}%
          </div>
        </div>

        {/* Progress Bar Premium */}
        <div style={{ position: 'relative', zIndex: 1, height: 10, background: 'var(--bg-base)', borderRadius: 8, overflow: 'hidden', marginBottom: 16, boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.1)', border: '1px solid var(--border)' }}>
          <div style={{ 
            height: '100%', 
            width: `${content.pct}%`, 
            background: `linear-gradient(90deg, ${content.color}90, ${content.color})`, 
            borderRadius: 8, 
            transition: 'width 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)', 
            boxShadow: `0 0 12px ${content.color}80`,
            position: 'relative'
          }}>
            {/* Shimmer effect inside progress bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
              transform: 'skewX(-20deg) translateX(-150%)',
              animation: 'shimmer 3s infinite'
            }} />
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {content.desc}
          </span>
          <span style={{ color: 'var(--text-muted)', background: 'var(--bg-base)', padding: '5px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: '1px solid var(--border)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
            {content.eta}
          </span>
        </div>
        
        <style>{`
          @keyframes shimmer {
            100% { transform: skewX(-20deg) translateX(200%); }
          }
        `}</style>
      </div>

      {/* Detail Modal */}
      {showModal && createPortal(
        <div className="profile-modal-backdrop" onClick={() => setShowModal(false)} style={{ zIndex: 99999 }}>
          <div 
            onClick={(e) => e.stopPropagation()}
            className="animate-fade-in"
            style={{ 
              maxWidth: 500, width: '100%', maxHeight: '90vh', background: 'var(--bg-surface)', 
              borderRadius: 20, display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '1px solid var(--border)'
            }}
          >
            <div style={{ padding: 20, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                {content.icon} {content.title}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'var(--bg-card)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 8, borderRadius: '50%' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: 24, overflowY: 'auto' }} className="hide-scrollbar">
              
              {/* GOAL: WEIGHTLOSS */}
              {goal === 'weightloss' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Progres BB Saat Ini</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#f43f5e' }}>{currentWeight} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kg</span></div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                        🎯 Target: {targetWeight} kg | Mode: <strong style={{ textTransform: 'capitalize' }}>{programStyle}</strong>
                      </div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <button 
                        onClick={() => {
                          const w = window.prompt(lang === 'id' ? 'Masukkan berat badan hari ini (kg) - Opsional:' : 'Enter weight today (kg) - Optional:', currentWeight);
                          if(w && !isNaN(parseFloat(w))) {
                            if(onLogWeight) onLogWeight(parseFloat(w));
                          }
                        }}
                        style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        <PlusCircle size={18} /> {lang === 'id' ? '+ Catat BB (Opsional)' : '+ Log Weight (Optional)'}
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Trend Penurunan Berat</h3>
                  <div style={{ height: 200, width: '100%', background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)', marginBottom: 24 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={weightChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} />
                        <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Line type="monotone" dataKey="weight" stroke="#f43f5e" strokeWidth={3} dot={{ r: 4, fill: '#f43f5e', strokeWidth: 2, stroke: 'var(--bg-surface)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Aktivitas Pendukung</h3>
                  <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Total Kalori Terbakar Ekstra</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#f59e0b' }}>{weightBurnedKcal.toLocaleString()} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>kkal</span></div>
                      <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>🔥 ~{(weightBurnedKcal/7700).toFixed(1)} kg lemak luntur via exercise</div>
                  </div>
                </>
              )}

              {/* GOAL: TURUN HR */}
              {goal === 'turun-hr' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Akumulasi Zona 2</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#3b82f6' }}>{z2Hours} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>jam</span></div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Target Kestabilan</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{z2Target} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>jam</span></div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Distribusi Latihan (6 Minggu Terakhir)</h3>
                  <div style={{ height: 200, width: '100%', background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={z2ChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Bar dataKey="z2Mins" stackId="a" fill="#3b82f6" radius={[0,0,4,4]} name="Zona 2 (Menit)" />
                        <Bar dataKey="otherMins" stackId="a" fill="var(--border)" radius={[4,4,0,0]} name="Zona Lain (Menit)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* GOAL: RACE */}
              {(goal === '5k' || goal === '10k' || goal === 'marathon') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Peak Long Run</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#10b981' }}>{currentPeak} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>km</span></div>
                    </div>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Target Jarak</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>{targetPeak} <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>km</span></div>
                    </div>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Ketahanan Jarak (Long Runs)</h3>
                  <div style={{ height: 200, width: '100%', background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={raceChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} domain={[0, 'auto']} />
                        <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Line type="stepAfter" dataKey="dist" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: 'var(--bg-surface)' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}

              {/* GOAL: MAINTENANCE */}
              {(goal === 'maintenance' || goal === 'health') && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12, marginBottom: 24 }}>
                    <div style={{ background: 'var(--bg-card)', padding: 16, borderRadius: 16, border: '1px solid var(--border)', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>Total Latihan 7 Hari Terakhir</div>
                      <div style={{ fontSize: 32, fontWeight: 800, color: '#8b5cf6' }}>{thisWeekMins} <span style={{ fontSize: 16, color: 'var(--text-muted)' }}>/ 150 mnt</span></div>
                      {thisWeekMins >= 150 ? (
                        <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>Target WHO Terpenuhi! 🎉</div>
                      ) : (
                        <div style={{ display: 'inline-block', marginTop: 8, padding: '4px 12px', background: 'rgba(244, 63, 94, 0.1)', color: '#f43f5e', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>Kurang {150 - thisWeekMins} menit lagi</div>
                      )}
                    </div>
                  </div>

                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>Aktivitas Harian (14 Hari Terakhir)</h3>
                  <div style={{ height: 200, width: '100%', background: 'var(--bg-card)', borderRadius: 16, padding: 16, border: '1px solid var(--border)' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={maintChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: 'var(--border)', opacity: 0.4 }} contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8 }} />
                        <Bar dataKey="mins" fill="#8b5cf6" radius={[4,4,0,0]} name="Menit" />
                        <ReferenceLine y={22} stroke="#10b981" strokeDasharray="3 3" /> {/* Approx daily avg needed for 150/wk */}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}

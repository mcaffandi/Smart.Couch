import { useState } from 'react';
import { translations } from './translations';
import Logo from './Logo';

export default function OnboardingWizard({ initialProfile, onComplete, onSkip, lang, currentUser }) {
  const t = translations[lang] || translations.id;
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState({
    displayName: initialProfile?.displayName || '',
    age: initialProfile?.age || null,
    gender: initialProfile?.gender || '',
    weight: initialProfile?.weight || null,
    height: initialProfile?.height || null,
    goal: initialProfile?.goal || 'maintenance',
    programStyle: initialProfile?.programStyle || 'sedang',
    targetPace: initialProfile?.targetPace || 5.5,
    selectedDays: initialProfile?.selectedDays || ['Selasa', 'Kamis', 'Sabtu']
  });

  const steps = [
    { id: 1, title: lang === 'id' ? 'Identitas' : 'Identity', desc: lang === 'id' ? 'Kenalan dulu yuk!' : 'Let\'s get to know you!' },
    { id: 2, title: lang === 'id' ? 'Data Fisik' : 'Physical Data', desc: lang === 'id' ? 'Biar kalkulasi akurat' : 'For accurate calculations' },
    { id: 3, title: lang === 'id' ? 'Target & Rutinitas' : 'Goal & Routine', desc: lang === 'id' ? 'Apa tujuan utamamu?' : 'What is your main goal?' },
  ];

  const allDays = [
    { key: 'Senin', label: t.daysShort?.[0] || 'Sen' },
    { key: 'Selasa', label: t.daysShort?.[1] || 'Sel' },
    { key: 'Rabu', label: t.daysShort?.[2] || 'Rab' },
    { key: 'Kamis', label: t.daysShort?.[3] || 'Kam' },
    { key: 'Jumat', label: t.daysShort?.[4] || 'Jum' },
    { key: 'Sabtu', label: t.daysShort?.[5] || 'Sab' },
    { key: 'Minggu', label: t.daysShort?.[6] || 'Min' }
  ];

  const inp = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: 14, fontWeight: 500, padding: '12px 14px', width: '100%', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s' };
  const lbl = { fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', display: 'block', marginBottom: 6 };
  const onF = e => (e.target.style.borderColor = 'var(--accent-purple)');
  const onB = e => (e.target.style.borderColor = 'var(--border)');

  const isStepValid = () => {
    if (step === 2) {
      if (draft.age !== null && draft.age < 10) return false;
      if (draft.height !== null && draft.height > 250) return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!isStepValid()) {
      alert(lang === 'id' ? 'Pastikan data yang dimasukkan valid.' : 'Please ensure entered data is valid.');
      return;
    }
    if (step < 3) setStep(step + 1);
    else onComplete(draft);
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--bg-base)', zIndex: 99999, display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>
      
      {/* Left Sidebar (Steps) */}
      <div style={{ width: window.innerWidth < 768 ? '100%' : 280, background: 'var(--bg-surface)', borderRight: window.innerWidth < 768 ? 'none' : '1px solid var(--border)', borderBottom: window.innerWidth < 768 ? '1px solid var(--border)' : 'none', padding: window.innerWidth < 768 ? '16px 20px' : '32px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: window.innerWidth < 768 ? 16 : 48 }}>
          <Logo size={window.innerWidth < 768 ? 24 : 32} />
          <div>
            <div style={{ fontSize: window.innerWidth < 768 ? 16 : 20, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>EnduraUP</div>
            <div style={{ fontSize: 10, color: 'var(--accent-purple)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Setup Profile</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: window.innerWidth < 768 ? 'row' : 'column', gap: window.innerWidth < 768 ? 12 : 24, flex: window.innerWidth < 768 ? 'none' : 1, overflowX: window.innerWidth < 768 ? 'auto' : 'visible' }}>
          {steps.map(s => {
            const active = step === s.id;
            const completed = step > s.id;
            return (
              <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: window.innerWidth < 768 ? 8 : 14, opacity: (active || completed) ? 1 : 0.4, transition: 'all 0.3s', minWidth: window.innerWidth < 768 ? 'max-content' : 'auto' }}>
                <div style={{ width: window.innerWidth < 768 ? 24 : 32, height: window.innerWidth < 768 ? 24 : 32, borderRadius: '50%', background: active ? 'var(--accent-purple)' : completed ? 'rgba(167, 139, 250, 0.15)' : 'var(--bg-card)', border: `1px solid ${active || completed ? 'var(--accent-purple)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: active ? '#fff' : completed ? 'var(--accent-purple)' : 'var(--text-muted)', fontSize: window.innerWidth < 768 ? 12 : 14, fontWeight: 700 }}>
                  {completed ? '✓' : s.id}
                </div>
                <div>
                  <div style={{ fontSize: window.innerWidth < 768 ? 12 : 14, fontWeight: 700, color: active ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{s.title}</div>
                  {window.innerWidth >= 768 && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.desc}</div>}
                </div>
              </div>
            );
          })}
        </div>
        
        {window.innerWidth >= 768 && (
          <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', textAlign: 'left', padding: '10px 0', textDecoration: 'underline' }}>
            {lang === 'id' ? 'Lewati Pengaturan Ini' : 'Skip this setup'}
          </button>
        )}
      </div>

      {/* Right Content Area */}
      <div style={{ flex: 1, padding: window.innerWidth < 768 ? '24px' : '48px 64px', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ maxWidth: 500, width: '100%', marginTop: '4vh' }}>
          
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>{steps[step - 1].title}</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, marginBottom: 32 }}>{steps[step - 1].desc}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minHeight: 300 }}>
            {step === 1 && (
              <>
                <div>
                  <label style={lbl}>{lang === 'id' ? 'Nama Panggilan' : 'Display Name'}</label>
                  <input autoFocus type="text" placeholder={lang === 'id' ? 'Nama kamu...' : 'Your name...'} style={inp}
                    value={draft.displayName} onChange={e => setDraft(p => ({ ...p, displayName: e.target.value }))} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label style={lbl}>Email / Akun</label>
                  <input type="text" style={{ ...inp, color: 'var(--text-muted)', cursor: 'not-allowed', opacity: 0.7 }} value={currentUser} readOnly />
                </div>
              </>
            )}

            {step === 2 && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={lbl}>{lang === 'id' ? 'Umur (Tahun)' : 'Age (Years)'}</label>
                  <input autoFocus type="number" min={10} max={100} placeholder="—" style={inp}
                    value={draft.age ?? ''} onChange={e => { const v = e.target.value; setDraft(p => ({ ...p, age: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label style={lbl}>{lang === 'id' ? 'Jenis Kelamin' : 'Gender'}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <button type="button" onClick={() => setDraft(p => ({ ...p, gender: 'pria' }))} style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: draft.gender === 'pria' ? '1.5px solid var(--accent-purple)' : '1px solid var(--border)', background: draft.gender === 'pria' ? 'rgba(167, 139, 250, 0.1)' : 'var(--bg-card)', color: draft.gender === 'pria' ? 'var(--accent-purple)' : 'var(--text-secondary)', padding: '11px 14px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="14" r="5"></circle><line x1="13.5" y1="10.5" x2="21" y2="3"></line><line x1="16" y1="3" x2="21" y2="3"></line><line x1="21" y1="3" x2="21" y2="8"></line></svg>
                      {lang === 'id' ? 'Pria' : 'Male'}
                    </button>
                    <button type="button" onClick={() => setDraft(p => ({ ...p, gender: 'wanita' }))} style={{ ...inp, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', border: draft.gender === 'wanita' ? '1.5px solid #ec4899' : '1px solid var(--border)', background: draft.gender === 'wanita' ? 'rgba(236, 72, 153, 0.1)' : 'var(--bg-card)', color: draft.gender === 'wanita' ? '#ec4899' : 'var(--text-secondary)', padding: '11px 14px' }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="5"></circle><line x1="12" y1="14" x2="12" y2="21"></line><line x1="9" y1="18" x2="15" y2="18"></line></svg>
                      {lang === 'id' ? 'Wanita' : 'Female'}
                    </button>
                  </div>
                </div>
                <div>
                  <label style={lbl}>{lang === 'id' ? 'Berat (kg)' : 'Weight (kg)'}</label>
                  <input type="number" min={30} max={200} step={0.5} placeholder="—" style={inp}
                    value={draft.weight ?? ''} onChange={e => { const v = e.target.value; setDraft(p => ({ ...p, weight: v === '' ? null : parseFloat(v) || null })); }} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label style={lbl}>{lang === 'id' ? 'Tinggi (cm)' : 'Height (cm)'}</label>
                  <input type="number" min={100} max={250} placeholder="—" style={inp}
                    value={draft.height ?? ''} onChange={e => { const v = e.target.value; setDraft(p => ({ ...p, height: v === '' ? null : parseInt(v) || null })); }} onFocus={onF} onBlur={onB} />
                </div>
              </div>
            )}

            {step === 3 && (
              <>
                <div>
                  <label style={lbl}>{t.mainGoal}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { val: 'maintenance', label: t.maintenance },
                      { val: 'weightloss', label: lang === 'id' ? 'Turun Berat' : 'Weight Loss' },
                      { val: '10k', label: '10K / 5K' },
                      { val: 'marathon', label: 'Marathon' },
                      { val: 'turun-hr', label: lang === 'id' ? 'Turun HR' : 'Lower HR' },
                      { val: 'health', label: lang === 'id' ? 'Kesehatan' : 'Health' }
                    ].map(g => (
                      <button key={g.val} type="button" onClick={() => setDraft(p => ({ ...p, goal: g.val }))}
                        style={{ ...inp, cursor: 'pointer', textAlign: 'center', padding: '10px 6px', fontSize: 12, border: (draft.goal ?? 'maintenance') === g.val ? '1.5px solid var(--accent-purple)' : '1px solid var(--border)', background: (draft.goal ?? 'maintenance') === g.val ? 'rgba(167, 139, 250, 0.1)' : 'var(--bg-card)', color: (draft.goal ?? 'maintenance') === g.val ? 'var(--accent-purple)' : 'var(--text-secondary)' }}>
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={lbl}>{t.programStyle}</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[
                      { val: 'ngepush', label: t.ngepush },
                      { val: 'sedang', label: t.sedang },
                      { val: 'santai', label: t.santai }
                    ].map(s => (
                      <button key={s.val} type="button" onClick={() => setDraft(p => ({ ...p, programStyle: s.val }))}
                        style={{ ...inp, cursor: 'pointer', textAlign: 'center', padding: '10px 4px', fontSize: 12, border: (draft.programStyle ?? 'sedang') === s.val ? '1.5px solid #f97316' : '1px solid var(--border)', background: (draft.programStyle ?? 'sedang') === s.val ? 'rgba(249, 115, 22, 0.1)' : 'var(--bg-card)', color: (draft.programStyle ?? 'sedang') === s.val ? '#f97316' : 'var(--text-secondary)' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <label style={{ ...lbl, marginBottom: 0 }}>{t.targetPace}</label>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--accent-purple)', background: 'rgba(167, 139, 250, 0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                      {(() => {
                        const p = draft.targetPace ?? 5.5;
                        const mins = Math.floor(p);
                        const secs = Math.round((p - mins) * 60);
                        const finalMins = secs >= 60 ? mins + 1 : mins;
                        const finalSecs = secs >= 60 ? 0 : secs;
                        return `${finalMins}:${String(finalSecs).padStart(2, '0')} /km`;
                      })()}
                    </span>
                  </div>
                  <input type="range" min="3.0" max="10.0" step="0.083333" value={draft.targetPace ?? 5.5} onChange={e => setDraft(p => ({ ...p, targetPace: parseFloat(e.target.value) }))} style={{ width: '100%', cursor: 'pointer' }} className="app-slider" />
                </div>

                <div>
                  <label style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
                    <span>{t.trainingDays}</span>
                    <span style={{ color: 'var(--accent-purple)', fontWeight: 700 }}>
                      {draft.selectedDays.length === 0 ? (lang === 'id' ? 'Auto (Disarankan)' : 'Auto (Recommended)') : `${draft.selectedDays.length}x ${lang === 'id' ? 'Seminggu' : 'Weekly'}`}
                    </span>
                  </label>
                  <div className="day-selector-container">
                    <div className="day-selector-grid">
                      {allDays.map(dayItem => {
                        const isActive = draft.selectedDays.includes(dayItem.key);
                        return (
                          <button key={dayItem.key} type="button" className={`day-btn ${isActive ? 'active' : ''}`}
                            onClick={() => {
                              setDraft(p => {
                                const current = p.selectedDays;
                                return { ...p, selectedDays: current.includes(dayItem.key) ? current.filter(x => x !== dayItem.key) : [...current, dayItem.key] };
                              });
                            }}
                          >
                            {dayItem.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <button onClick={() => setStep(step - 1)} disabled={step === 1} style={{ padding: '12px 24px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text-secondary)', cursor: step === 1 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, opacity: step === 1 ? 0 : 1 }}>
              {lang === 'id' ? 'Kembali' : 'Back'}
            </button>
            <button onClick={handleNext} style={{ padding: '12px 32px', borderRadius: 8, background: 'var(--accent-purple)', border: 'none', color: '#fff', cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(167, 139, 250, 0.3)' }}>
              {step === 3 ? (lang === 'id' ? 'Selesai & Mulai' : 'Finish & Start') : (lang === 'id' ? 'Selanjutnya' : 'Next')}
              {step < 3 && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>}
            </button>
          </div>

          {window.innerWidth < 768 && (
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <button onClick={onSkip} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '10px 0', textDecoration: 'underline' }}>
                {lang === 'id' ? 'Lewati Pengaturan Ini' : 'Skip this setup'}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

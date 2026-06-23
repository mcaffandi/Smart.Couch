import React, { useState, useEffect } from 'react';
import { doc, setDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db, auth, isConfigured as isFirebaseConfigured } from './firebase';

export default function FeedbackModal({ onClose, lang = 'id', addToast }) {
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [testimonials, setTestimonials] = useState([]);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [feedbackType, setFeedbackType] = useState('review'); // 'review' or 'support'

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        if (!isFirebaseConfigured) throw new Error("Firebase not configured");
        let constraints = [
          where('type', '!=', 'support'),
          orderBy('type'),
          orderBy('createdAt', 'desc')
        ];
        if (!showAllReviews) {
          constraints.push(limit(3));
        }
        
        const q = query(collection(db, 'feedback'), ...constraints);
        const snapshot = await getDocs(q);
        const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (fetched.length > 0) {
          setTestimonials(fetched);
        } else {
          setTestimonials([
            { id: 1, name: 'Bima Satriya', rating: 5, date: lang === 'id' ? '25 Mei 2026' : 'May 25, 2026', feedback: lang === 'id' ? 'Gila, fitur prediksi pacenya akurat parah! Sangat ngebantu buat susun strategi HM minggu depan. Selain itu UI-nya juga enteng banget dibuka dari HP.' : 'Insane, the pace prediction feature is incredibly accurate! Very helpful for my HM strategy next week. The UI is also very lightweight on mobile.' },
            { id: 2, name: 'Tirta Anugrah', rating: 5, date: lang === 'id' ? '22 Mei 2026' : 'May 22, 2026', feedback: lang === 'id' ? 'Awalnya skeptis, tapi pas nyoba sinkronisasi gpx-nya ternyata secepet itu tanpa lag. Fitur AI Coach-nya ngebantu banget buat gue yang sering bolos jadwal lari karena kerjaan padat.' : 'Skeptical at first, but GPX sync is incredibly fast with zero lag. The AI Coach helps a lot since I often miss my schedule due to work.' }
          ]);
        }
      } catch (err) {
        setTestimonials([
          { id: 1, name: 'Bima Satriya', rating: 5, date: lang === 'id' ? '25 Mei 2026' : 'May 25, 2026', feedback: lang === 'id' ? 'Gila, fitur prediksi pacenya akurat parah! Sangat ngebantu buat susun strategi HM minggu depan. Selain itu UI-nya juga enteng banget dibuka dari HP.' : 'Insane, the pace prediction feature is incredibly accurate! Very helpful for my HM strategy next week. The UI is also very lightweight on mobile.' },
          { id: 2, name: 'Tirta Anugrah', rating: 5, date: lang === 'id' ? '22 Mei 2026' : 'May 22, 2026', feedback: lang === 'id' ? 'Awalnya skeptis, tapi pas nyoba sinkronisasi gpx-nya ternyata secepet itu tanpa lag. Fitur AI Coach-nya ngebantu banget buat gue yang sering bolos jadwal lari karena kerjaan padat.' : 'Skeptical at first, but GPX sync is incredibly fast with zero lag. The AI Coach helps a lot since I often miss my schedule due to work.' }
        ]);
      }
    };
    fetchTestimonials();
  }, [lang, showAllReviews]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      addToast(lang === 'id' ? 'Masukan tidak boleh kosong.' : 'Feedback cannot be empty.', 'error');
      return;
    }
    if (!isFirebaseConfigured || !auth.currentUser) {
      addToast(lang === 'id' ? 'Anda harus login untuk mengirim testimoni.' : 'You must be logged in to send feedback.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      const feedbackRef = doc(collection(db, 'feedback'));
      await setDoc(feedbackRef, {
        uid: user.uid,
        name: user.displayName || user.email || 'Runner Anonim',
        email: user.email || '',
        rating: feedbackType === 'review' ? rating : null,
        feedback,
        type: feedbackType,
        featured: false,
        createdAt: serverTimestamp(),
        lang
      });
      addToast(
        lang === 'id' 
          ? (feedbackType === 'review' ? 'Terima kasih atas masukannya!' : 'Pesan terkirim. Admin akan segera menindaklanjuti.') 
          : (feedbackType === 'review' ? 'Thank you for your feedback!' : 'Message sent. Admin will review shortly.')
      );
      onClose();
    } catch (error) {
      console.error("Failed to submit feedback", error);
      addToast(lang === 'id' ? 'Gagal mengirim masukan. Coba lagi.' : 'Failed to send feedback. Try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="profile-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        width: '100%',
        maxWidth: 450,
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>
              {lang === 'id' ? 'Hubungi Kami' : 'Contact Us'}
            </h2>
            <p style={{ margin: 0, marginTop: 4, fontSize: 13, color: 'var(--text-muted)' }}>
              {lang === 'id' ? 'Kirim testimoni atau tanyakan kendala seputar aplikasi.' : 'Send a testimonial or ask questions about the app.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: 24, cursor: 'pointer', padding: 4 }}>
            ✕
          </button>
        </div>

        {/* Type Toggle */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: 8, padding: 4 }}>
          <button 
            type="button"
            onClick={() => setFeedbackType('review')}
            style={{ flex: 1, padding: '8px', background: feedbackType === 'review' ? 'var(--text-primary)' : 'transparent', color: feedbackType === 'review' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            ⭐ Testimoni / Review
          </button>
          <button 
            type="button"
            onClick={() => setFeedbackType('support')}
            style={{ flex: 1, padding: '8px', background: feedbackType === 'support' ? 'var(--text-primary)' : 'transparent', color: feedbackType === 'support' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
          >
            ❓ Bantuan / Kendala
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Star Rating - Only for Review */}
          {feedbackType === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 8 }}>
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 32,
                      color: star <= rating ? '#fbbf24' : 'var(--border)',
                      transition: 'all 0.2s',
                      transform: star <= rating ? 'scale(1.1)' : 'scale(1)'
                    }}
                  >
                    ★
                  </button>
                ))}
              </div>
              <div style={{ fontSize: 13, color: 'var(--accent-purple)', fontWeight: 600 }}>
                {rating === 5 ? (lang === 'id' ? 'Sempurna!' : 'Perfect!') :
                 rating === 4 ? (lang === 'id' ? 'Sangat Bagus' : 'Very Good') :
                 rating === 3 ? (lang === 'id' ? 'Bagus' : 'Good') :
                 rating === 2 ? (lang === 'id' ? 'Kurang Pas' : 'Could be better') :
                 (lang === 'id' ? 'Mengecewakan' : 'Disappointing')}
              </div>
            </div>
          )}

          {/* Feedback Textarea */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {feedbackType === 'review' 
                ? (lang === 'id' ? 'Pesan Testimoni' : 'Testimonial Message')
                : (lang === 'id' ? 'Jelaskan Kendala/Pertanyaan Anda' : 'Describe your issue/question')}
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={lang === 'id' ? 'Contoh: Fitur AI Coach-nya gokil, jadwalku jadi lebih terarah!' : 'e.g., The AI Coach feature is amazing, my schedule is much better now!'}
              rows={4}
              required
              style={{
                width: '100%',
                background: 'var(--bg-base)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '12px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                fontSize: 14,
                resize: 'vertical',
                outline: 'none',
                minHeight: 100
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--accent-purple)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          {/* Examples/Inspiration - Only for review */}
          {feedbackType === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 8 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {lang === 'id' ? 'Belum ada ide? Coba bahas tentang:' : 'No ideas? Try talking about:'}
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  lang === 'id' ? 'Akurasi Prediksi Race' : 'Race Prediction Accuracy',
                  lang === 'id' ? 'AI Coach (Groq)' : 'AI Coach (Groq)',
                  lang === 'id' ? 'Desain UI / Dark Mode' : 'UI Design / Dark Mode',
                  lang === 'id' ? 'Fitur Import GPX/Garmin' : 'GPX/Garmin Import'
                ].map(topic => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setFeedback(prev => prev ? prev + '\n' + topic + ': ' : topic + ': ')}
                    style={{
                      background: 'rgba(255,255,255,0.03)',
                      border: '1px solid var(--border)',
                      borderRadius: 99,
                      padding: '4px 10px',
                      fontSize: 11,
                      color: 'var(--text-secondary)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-purple)'; e.currentTarget.style.color = 'var(--accent-purple)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  >
                    + {topic}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: 8 }}
          >
            {submitting 
              ? (lang === 'id' ? 'Mengirim...' : 'Sending...') 
              : (feedbackType === 'review' 
                  ? (lang === 'id' ? 'Kirim Testimoni' : 'Submit Testimonial')
                  : (lang === 'id' ? 'Kirim Pesan Bantuan' : 'Submit Support Request'))}
          </button>
        </form>

        {/* Display Testimonials inside modal */}
        <div style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
              {lang === 'id' ? 'Ulasan Terbaru' : 'Recent Reviews'}
            </h3>
            {!showAllReviews && (
              <button 
                type="button"
                onClick={() => setShowAllReviews(true)} 
                style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', fontSize: 11, cursor: 'pointer', fontWeight: 600, padding: 0 }}
              >
                {lang === 'id' ? 'Lihat Semua' : 'View All'}
              </button>
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: showAllReviews ? 400 : 200, overflowY: 'auto', paddingRight: 8, transition: 'max-height 0.3s ease' }}>
            {testimonials.map((testi) => (
              <div key={testi.id} style={{ display: 'flex', flexDirection: 'column', gap: 8, background: 'rgba(255,255,255,0.01)', padding: 12, borderRadius: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg, #a78bfa, #f472b6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>
                    {testi.name?.substring(0, 1).toUpperCase()}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)' }}>{testi.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                      {testi.createdAt?.toDate 
                        ? testi.createdAt.toDate().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }) 
                        : (testi.date || '')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 2, marginLeft: 'auto' }}>
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24" fill={i < (testi.rating || 5) ? '#fbbf24' : '#3f3f46'} stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                    ))}
                  </div>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {testi.feedback}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

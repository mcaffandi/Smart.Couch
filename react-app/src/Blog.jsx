import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, increment, arrayUnion } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function BlogModule({ isAdmin, lang = 'id', onViewChange, currentUser }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'read', 'edit'
  const [currentBlog, setCurrentBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('Semua');
  const [savedBlogs, setSavedBlogs] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem('enduraup_saved_blogs');
    if (saved) setSavedBlogs(JSON.parse(saved));
  }, []);

  const handleSaveBlog = (blogId) => {
    setSavedBlogs(prev => {
      let next;
      if (prev.includes(blogId)) {
        next = prev.filter(id => id !== blogId);
      } else {
        next = [...prev, blogId];
      }
      localStorage.setItem('enduraup_saved_blogs', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (onViewChange) onViewChange(view);
  }, [view, onViewChange]);

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'blogs'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const fetched = [];
      snap.forEach(doc => {
        fetched.push({ id: doc.id, ...doc.data() });
      });
      setBlogs(fetched);
    } catch (e) {
      console.error("Error fetching blogs:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleSave = async (blogData) => {
    try {
      if (currentBlog && currentBlog.id) {
        await updateDoc(doc(db, 'blogs', currentBlog.id), {
          ...blogData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'blogs'), {
          ...blogData,
          createdAt: serverTimestamp()
        });
      }
      await fetchBlogs();
      setView('list');
      setCurrentBlog(null);
    } catch (e) {
      console.error("Error saving blog:", e);
      alert("Gagal menyimpan artikel.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
      await deleteDoc(doc(db, 'blogs', id));
      await fetchBlogs();
    } catch (e) {
      console.error("Error deleting blog:", e);
      alert("Gagal menghapus artikel.");
    }
  };

  const handleProps = async (blogId) => {
    // Determine user identifier: UID or local device ID
    const userId = currentUser?.uid || localStorage.getItem('smartcoach_device_id') || `anon_${Math.random().toString(36).substring(2, 10)}`;
    if (!localStorage.getItem('smartcoach_device_id') && !currentUser?.uid) {
      localStorage.setItem('smartcoach_device_id', userId);
    }
    
    // Check local storage if this device already liked it to prevent spamming
    const likedStr = localStorage.getItem('enduraup_blog_props') || '[]';
    const likedArr = JSON.parse(likedStr);
    
    // If they already liked it locally, don't allow again
    if (likedArr.includes(blogId)) return;
    
    // Save to local storage
    likedArr.push(blogId);
    localStorage.setItem('enduraup_blog_props', JSON.stringify(likedArr));

    // Optimistic UI update
    setBlogs(prev => prev.map(b => {
      if (b.id === blogId) {
        return {
          ...b,
          propsCount: (b.propsCount || 0) + 1,
          propsUsers: [...(b.propsUsers || []), userId]
        };
      }
      return b;
    }));
    
    if (currentBlog?.id === blogId) {
      setCurrentBlog(prev => ({
        ...prev,
        propsCount: (prev.propsCount || 0) + 1,
        propsUsers: [...(prev.propsUsers || []), userId]
      }));
    }

    // Update in Firestore
    try {
      await updateDoc(doc(db, 'blogs', blogId), {
        propsCount: increment(1),
        propsUsers: arrayUnion(userId)
      });
    } catch (e) {
      console.error("Error adding props:", e);
    }
  };

  // Extract unique tags
  const allTags = useMemo(() => {
    const tagsSet = new Set();
    blogs.forEach(b => {
      if (b.tags && Array.isArray(b.tags)) b.tags.forEach(t => tagsSet.add(t));
    });
    return ['Semua', ...Array.from(tagsSet)];
  }, [blogs]);

  if (view === 'edit' && isAdmin) {
    return <BlogEditor blog={currentBlog} onSave={handleSave} onCancel={() => { setView('list'); setCurrentBlog(null); }} lang={lang} />;
  }

  if (view === 'read' && currentBlog) {
    return (
      <BlogReader 
        blog={currentBlog} 
        onBack={() => { setView('list'); setCurrentBlog(null); }} 
        onTagClick={(tag) => {
          setSelectedTag(tag);
          setView('list');
          setCurrentBlog(null);
        }}
        lang={lang} 
        onProps={() => handleProps(currentBlog.id)}
        currentUser={currentUser}
        savedBlogs={savedBlogs}
        onSaveToggle={() => handleSaveBlog(currentBlog.id)}
      />
    );
  }

  const filteredBlogs = blogs.filter(b => {
    // Filter by tag
    if (selectedTag !== 'Semua' && (!b.tags || !b.tags.includes(selectedTag))) return false;
    // Filter by search
    if (!searchTerm) return true;
    const lower = searchTerm.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(lower)) ||
      (b.content && b.content.toLowerCase().includes(lower)) ||
      (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lower)))
    );
  });

  // LIST VIEW
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>Blog & Artikel</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: 15 }}>
            {lang === 'id' ? 'Kumpulan tips latihan, nutrisi, dan wawasan lari dari pelatih.' : 'Running tips, nutrition, and insights from coaches.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder={lang === 'id' ? 'Cari topik...' : 'Search topics...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '12px 16px',
                paddingLeft: 40,
                borderRadius: 24,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 14,
                width: 260,
                outline: 'none',
                transition: 'border-color 0.2s'
              }}
            />
            <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          {isAdmin && (
            <button 
              className="btn btn-primary"
              onClick={() => { setCurrentBlog(null); setView('edit'); }}
              style={{ borderRadius: 24, padding: '12px 20px', fontWeight: 600 }}
            >
              + {lang === 'id' ? 'Tulis Artikel' : 'Write Article'}
            </button>
          )}
        </div>
      </div>

      {/* Category Pills */}
      {!loading && allTags.length > 1 && (
        <div className="hide-scrollbar" style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              style={{
                background: selectedTag === tag ? 'var(--text-primary)' : 'transparent',
                color: selectedTag === tag ? 'var(--bg-base)' : 'var(--text-secondary)',
                border: selectedTag === tag ? '1px solid var(--text-primary)' : '1px solid var(--border)',
                padding: '6px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s'
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat artikel...</div>
      ) : filteredBlogs.length === 0 ? (
        <div className="glass-panel" style={{ padding: 60, textAlign: 'center', marginTop: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.8 }}>📚</div>
          <h3 style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Belum ada artikel</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {searchTerm ? 'Tidak ada artikel yang cocok dengan pencarian Anda.' : 'Nantikan konten edukasi menarik dari EnduraUP!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24, paddingTop: 10 }}>
          {filteredBlogs.map(b => (
            <div key={b.id} className="glass-panel hover-lift" onClick={() => { setCurrentBlog(b); setView('read'); }} style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', padding: 0, border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
              {b.coverImage ? (
                <div style={{ height: 180, background: `url(${b.coverImage}) center/cover`, borderBottom: '1px solid var(--border)' }}></div>
              ) : (
                <div style={{ height: 180, background: 'var(--bg-surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                </div>
              )}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                  {b.tags && b.tags.slice(0,2).map((tag, i) => (
                    <span key={i} onClick={(e) => { e.stopPropagation(); setSelectedTag(tag); }} style={{ fontSize: 11, background: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }}>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                  {b.tags && b.tags.length > 2 && <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 4px' }}>+{b.tags.length - 2}</span>}
                </div>
                <h3 style={{ fontSize: 19, fontWeight: 700, marginBottom: 8, lineHeight: 1.4, color: 'var(--text-primary)' }}>{b.title}</h3>
                
                {/* Extract pure text from HTML for excerpt */}
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 20, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                  {b.excerpt || (b.content || '').replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
                </p>
                
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: '1px dashed var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                        {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : ''}
                      </div>
                      {b.propsCount > 0 && (
                        <div style={{ fontSize: 13, color: '#f97316', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>
                          {b.propsCount}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                      <button 
                        onClick={() => handleSaveBlog(b.id)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: savedBlogs.includes(b.id) ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                        title={savedBlogs.includes(b.id) ? "Tersimpan" : "Simpan"}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={savedBlogs.includes(b.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => { setCurrentBlog(b); setView('edit'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} title="Edit">✏️</button>
                          <button onClick={() => handleDelete(b.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: 0 }} title="Hapus">🗑️</button>
                        </>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlogReader({ blog, onBack, onTagClick, lang, onProps, currentUser, savedBlogs, onSaveToggle }) {
  const dateStr = blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  
  const [showBurnAnim, setShowBurnAnim] = useState(false);

  const handleBurnClick = () => {
    setShowBurnAnim(true);
    setTimeout(() => setShowBurnAnim(false), 1500);
    onProps();
  };

  return (
    <div className="animate-fade-in medium-blog-container" style={{ position: 'relative' }}>
      <style>{`
        @keyframes burnPopup {
          0% { transform: scale(0.5); opacity: 0; filter: drop-shadow(0 0 10px #f97316); }
          15% { transform: scale(1.3); opacity: 1; filter: drop-shadow(0 0 60px #f97316); }
          30% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 40px #f97316); }
          80% { transform: scale(1); opacity: 1; filter: drop-shadow(0 0 40px #f97316); }
          100% { transform: scale(1.8); opacity: 0; filter: drop-shadow(0 0 120px #f97316); }
        }
      `}</style>

      {showBurnAnim && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          pointerEvents: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          background: 'rgba(0,0,0,0.6)',
          animation: 'burnPopup 1.5s ease-out forwards'
        }}>
          <svg width="240" height="240" viewBox="0 0 24 24" fill="#f97316" stroke="#f97316" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
          </svg>
          <div style={{ fontSize: 64, fontWeight: 900, color: '#f97316', marginTop: 32, textShadow: '0 0 30px rgba(249,115,22,0.8)', letterSpacing: 2 }}>
            BURN UP!
          </div>
        </div>
      )}

      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: 0, marginBottom: 32, fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        {lang === 'id' ? 'Kembali ke Artikel' : 'Back to Articles'}
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {blog.tags && blog.tags.map((tag, i) => (
          <button 
            key={i} 
            onClick={() => onTagClick && onTagClick(tag)}
            style={{ fontSize: 11, background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 12, fontWeight: 600, border: '1px solid var(--border)', fontFamily: 'Inter, sans-serif', cursor: 'pointer' }}
          >
            {tag.toUpperCase()}
          </button>
        ))}
      </div>

      <h1 className="medium-blog-title">{blog.title}</h1>
      
      <div className="medium-blog-meta">
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--accent-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 'bold' }}>
          {blog.author ? blog.author.charAt(0).toUpperCase() : 'E'}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{blog.author || 'Tim EnduraUP'}</div>
          <div>{dateStr} · {lang === 'id' ? 'Waktu baca 5 mnt' : '5 min read'}</div>
        </div>
      </div>

      {/* Top Action Bar */}
      <div style={{ marginTop: 24, marginBottom: 32, padding: '16px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          {/* Burn Button */}
          <button 
            onClick={handleBurnClick}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.2s, transform 0.1s'
            }}
            onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.9)'}
            onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
            onMouseOver={(e) => e.currentTarget.style.color = '#f97316'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title={lang === 'id' ? 'Bakar (Burn) UP!' : 'Burn UP!'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{blog.propsCount || 0}</span>
          </button>

          {/* Comment Button */}
          <button 
            onClick={() => document.getElementById('comments-section').scrollIntoView({ behavior: 'smooth' })}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8, 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title={lang === 'id' ? 'Komentar' : 'Comments'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <span style={{ fontSize: 14, fontWeight: 500 }}>{blog.comments?.length || 0}</span>
          </button>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {/* Bookmark Button */}
          <button 
            onClick={onSaveToggle}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              color: savedBlogs?.includes(blog.id) ? 'var(--text-primary)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = savedBlogs?.includes(blog.id) ? 'var(--text-primary)' : 'var(--text-secondary)'}
            title={savedBlogs?.includes(blog.id) ? (lang === 'id' ? 'Tersimpan' : 'Saved') : (lang === 'id' ? 'Simpan' : 'Save')}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={savedBlogs?.includes(blog.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
          </button>

          {/* Share Button */}
          <button 
            onClick={() => {
              const url = window.location.href;
              if (navigator.share) {
                navigator.share({ title: blog.title, url }).catch(console.error);
              } else {
                navigator.clipboard.writeText(url);
                alert(lang === 'id' ? 'Tautan disalin ke clipboard!' : 'Link copied to clipboard!');
              }
            }}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              padding: 0, 
              display: 'flex', 
              alignItems: 'center', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'color 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            title={lang === 'id' ? 'Bagikan' : 'Share'}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
          </button>
        </div>
      </div>

      {blog.coverImage && (
        <div style={{ width: '100%', height: 400, background: `url(${blog.coverImage}) center/cover`, borderRadius: 8, marginBottom: 40 }}></div>
      )}

      {/* Render rich text HTML content safely */}
      <div 
        className="medium-blog-content"
        dangerouslySetInnerHTML={{ __html: blog.content }} 
      />

      <hr style={{ borderTop: '1px solid var(--border)', margin: '60px 0 40px' }} />
      
      {/* Comments Section */}
      <div id="comments-section" style={{ paddingBottom: 60 }}>
        <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
          {lang === 'id' ? 'Komentar' : 'Comments'} ({blog.comments?.length || 0})
        </h3>
        
        <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 32 }}>
          <textarea 
            placeholder={lang === 'id' ? 'Tulis komentar Anda (segera hadir)...' : 'Write your comment (coming soon)...'} 
            style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', resize: 'none', height: 60, fontSize: 15 }}
            disabled
          ></textarea>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
            <button disabled style={{ background: 'var(--accent-purple)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 20, fontWeight: 600, fontSize: 13, opacity: 0.5, cursor: 'not-allowed' }}>
              {lang === 'id' ? 'Kirim' : 'Post'}
            </button>
          </div>
        </div>

        {blog.comments && blog.comments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {blog.comments.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {c.name ? c.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c.name || 'User'}</div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.text}</div>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, marginLeft: 4 }}>
                    {c.createdAt?.toDate ? c.createdAt.toDate().toLocaleDateString() : 'Baru saja'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
            {lang === 'id' ? 'Belum ada komentar. Jadilah yang pertama!' : 'No comments yet. Be the first to comment!'}
          </div>
        )}
      </div>
    </div>
  );
}

function BlogEditor({ blog, onSave, onCancel, lang }) {
  const [title, setTitle] = useState(blog?.title || '');
  const [content, setContent] = useState(blog?.content || '');
  const [tagsStr, setTagsStr] = useState(blog?.tags ? blog.tags.join(', ') : '');
  const [coverImage, setCoverImage] = useState(blog?.coverImage || '');
  const [author, setAuthor] = useState(blog?.author || 'Admin EnduraUP');

  const quillRef = useRef(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        try {
          const loadingId = Date.now();
          const fileRef = ref(storage, `blog_images/${loadingId}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);

          const quill = quillRef.current.getEditor();
          const range = quill.getSelection(true);
          quill.insertEmbed(range.index, 'image', url);
        } catch (err) {
          console.error("Gagal upload gambar:", err);
          alert("Gagal mengupload gambar.");
        }
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}],
        ['link', 'image'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return alert("Judul dan konten tidak boleh kosong.");
    
    onSave({
      title,
      content,
      tags: tagsStr.split(',').map(t => t.trim()).filter(Boolean),
      coverImage,
      author
    });
  };

  return (
    <div className="animate-fade-in glass-panel" style={{ maxWidth: 900, margin: '0 auto', width: '100%', padding: 40 }}>
      <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 32 }}>{blog ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        
        <div className="form-group">
          <label className="form-label">Judul Artikel *</label>
          <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Contoh: Manfaat Recovery Run untuk Pemula" style={{ fontSize: 18, padding: 16, fontWeight: 600 }} />
        </div>

        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1 1 200px' }}>
            <label className="form-label">Penulis</label>
            <input type="text" className="form-input" value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: '2 1 300px' }}>
            <label className="form-label">Tags / Kategori (Pisahkan dengan koma)</label>
            <input type="text" className="form-input" value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="Contoh: Nutrisi, Pemula, Tips" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">URL Cover Image (Opsional)</label>
          <input type="url" className="form-input" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." />
        </div>

        <div className="form-group" style={{ marginBottom: 40 }}>
          <label className="form-label" style={{ marginBottom: 8 }}>Isi Konten *</label>
          <ReactQuill 
            ref={quillRef}
            theme="snow" 
            value={content} 
            onChange={setContent} 
            modules={modules}
            placeholder="Tulis karya menarik Anda di sini..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ padding: '12px 24px' }}>Batal</button>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 32px', fontSize: 15 }}>Simpan Artikel</button>
        </div>
      </form>
    </div>
  );
}

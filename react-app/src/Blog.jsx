import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, getDocs, getDocsFromServer, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, increment, arrayUnion, onSnapshot, arrayRemove } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth, googleProvider, signInWithPopup } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { BookOpen, Edit3, Trash2 } from 'lucide-react';

// Helper to fix google drive links on the fly
const parseImageUrl = (url) => {
  if (!url) return '';
  if (url.includes('drive.google.com/file/d/')) {
    const match = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }
  }
  return url;
};

export default function BlogModule({ isAdmin, lang = 'id', onViewChange, currentUser, searchQuery = '' }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'read', 'edit'
  const [currentBlog, setCurrentBlog] = useState(null);
  // internal state removed for search
  const [selectedTag, setSelectedTag] = useState('Semua');
  const [savedBlogs, setSavedBlogs] = useState([]);
  const [showSavedOnly, setShowSavedOnly] = useState(false);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  const requireAuth = (actionCallback) => {
    if (currentUser) {
      actionCallback();
    } else {
      setPendingAction(() => actionCallback);
      setShowAuthModal(true);
    }
  };

  useEffect(() => {
    if (currentUser && pendingAction) {
      pendingAction();
      setPendingAction(null);
      setShowAuthModal(false);
    }
  }, [currentUser, pendingAction]);

  useEffect(() => {
    const saved = localStorage.getItem('enduraup_saved_blogs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSavedBlogs(parsed);
      } catch (e) {
        console.error("Invalid saved blogs format");
      }
    }
  }, []);

  const handleSaveBlog = (blogId) => {
    requireAuth(() => {
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
        const d = doc.data();
        fetched.push({ 
          id: doc.id, 
          ...d,
          tags: Array.isArray(d.tags) ? d.tags : (typeof d.tags === 'string' ? d.tags.split(',').map(s=>s.trim()).filter(Boolean) : [])
        });
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

  // Handle direct URL access
  useEffect(() => {
    if (blogs.length > 0 && view === 'list') {
      const path = window.location.pathname;
      if (path.startsWith('/blog/')) {
        const slug = path.split('/blog/')[1];
        if (slug) {
          const found = blogs.find(b => 
            b.slug === slug || 
            (b.title && b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') === slug)
          );
          if (found) {
            setCurrentBlog(found);
            setView('read');
          }
        }
      }
    }
  }, [blogs]);

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
    requireAuth(async () => {
      // Determine user identifier: UID
      const userId = currentUser.uid || currentUser.email || `user_${Date.now()}`;
      
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
    });
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
        onRequireAuth={requireAuth}
      />
    );
  }


  const filteredBlogs = blogs.filter(b => {
    // Hide drafts if not admin
    if (b.isDraft && !isAdmin) return false;
    // Filter by saved
    if (showSavedOnly && !savedBlogs.includes(b.id)) return false;
    // Filter by tag
    if (selectedTag !== 'Semua' && (!b.tags || !b.tags.includes(selectedTag))) return false;
    // Filter by search
    if (!searchQuery) return true;
    const lower = searchQuery.toLowerCase();
    return (
      (b.title && b.title.toLowerCase().includes(lower)) ||
      (b.content && b.content.toLowerCase().includes(lower)) ||
      (b.tags && b.tags.some(tag => tag.toLowerCase().includes(lower)))
    );
  });

  // LIST VIEW
  return (
    <div className="animate-fade-in" style={{ maxWidth: 1000, margin: '0 auto', width: '100%' }}>
      {showAuthModal && (
        <div className="profile-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setShowAuthModal(false); setPendingAction(null); } }} style={{ zIndex: 100000, background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 16, width: '100%', maxWidth: 400, padding: 24, textAlign: 'center' }}>
            <h3 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {lang === 'id' ? 'Login Diperlukan' : 'Login Required'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 24 }}>
              {lang === 'id' ? 'Anda harus masuk untuk berinteraksi dengan artikel.' : 'You must be logged in to interact with articles.'}
            </p>
            <button 
              onClick={async () => {
                try {
                  await signInWithPopup(auth, googleProvider);
                } catch (err) {
                  console.error(err);
                }
              }}
              style={{ width: '100%', background: 'var(--text-primary)', color: 'var(--bg-base)', border: 'none', padding: '12px 16px', borderRadius: 8, fontWeight: 600, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.48 15.02 1 12 1 7.28 1 3.22 3.72 1.25 7.68l3.86 3C6.02 7.74 8.78 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.29 1.48-1.14 2.73-2.42 3.57v2.97h3.89c2.28-2.1 3.56-5.19 3.56-8.69z" />
                <path fill="#FBBC05" d="M5.11 14.78A7.12 7.12 0 0 1 4.7 12c0-.98.17-1.92.47-2.78L1.3 6.22A11.94 11.94 0 0 0 0 12c0 2.08.4 4.06 1.11 5.89l4-3.11z" />
                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.89-2.97c-1.08.72-2.48 1.16-4.07 1.16-3.22 0-5.98-2.7-6.97-5.64l-3.86 3C3.22 20.28 7.28 23 12 23z" />
              </svg>
              {lang === 'id' ? 'Lanjutkan dengan Google' : 'Continue with Google'}
            </button>
            <button 
              onClick={() => { setShowAuthModal(false); setPendingAction(null); }}
              style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)', border: 'none', padding: '12px 16px', marginTop: 8, fontWeight: 500, fontSize: 14, cursor: 'pointer' }}
            >
              {lang === 'id' ? 'Batal' : 'Cancel'}
            </button>
          </div>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 32, fontWeight: 800, margin: 0, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Blog & Artikel</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '8px 0 0 0', fontSize: 15 }}>
            {lang === 'id' ? 'Kumpulan tips latihan, nutrisi, dan wawasan lari dari pelatih.' : 'Running tips, nutrition, and insights from coaches.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => setShowSavedOnly(!showSavedOnly)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '10px 16px', borderRadius: 24, border: '1px solid var(--border)',
              background: showSavedOnly ? 'var(--text-primary)' : 'var(--bg-surface)',
              color: showSavedOnly ? 'var(--bg-base)' : 'var(--text-primary)',
              fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={showSavedOnly ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            {lang === 'id' ? 'Tersimpan' : 'Saved'}
          </button>
          {/* Search bar removed, now in navbar */}
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
                background: selectedTag === tag ? 'var(--bg-card-hover)' : 'transparent',
                color: selectedTag === tag ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: 'none',
                padding: '6px 12px',
                borderRadius: 6,
                fontSize: 14,
                fontWeight: selectedTag === tag ? 600 : 500,
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
          <div style={{ marginBottom: 16, opacity: 0.8, color: 'var(--text-muted)', display: 'flex', justifyContent: 'center' }}>
            <BookOpen size={48} />
          </div>
          <h3 style={{ fontSize: 20, color: 'var(--text-primary)', marginBottom: 8 }}>Belum ada artikel</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {searchQuery ? 'Tidak ada artikel yang cocok dengan pencarian Anda.' : 'Nantikan konten edukasi menarik dari EnduraUP!'}
          </p>
        </div>
      ) : (
        <>
          {/* Featured Hero Article */}
          {filteredBlogs.length > 0 && selectedTag === 'Semua' && !searchQuery && !showSavedOnly && (
            <div 
              className="blog-list-item"
              onClick={() => { setCurrentBlog(filteredBlogs[0]); setView('read'); }}
              style={{ overflow: 'hidden', display: 'flex', flexDirection: window.innerWidth < 768 ? 'column' : 'row', cursor: 'pointer', padding: '16px', margin: '-16px -16px 40px -16px', borderBottom: '1px solid var(--border)', paddingBottom: 40, alignItems: 'center' }}
            >
              <div className="blog-img-container" style={{ flex: 1, width: '100%', minHeight: window.innerWidth < 768 ? 200 : 300 }}>
                <div className="blog-img-inner" style={{ background: (filteredBlogs[0].coverImage || filteredBlogs[0].thumbnail) ? `url('${parseImageUrl(filteredBlogs[0].coverImage || filteredBlogs[0].thumbnail)}') center/cover` : 'var(--bg-surface)' }}></div>
              </div>
              <div style={{ flex: 1.2, padding: window.innerWidth < 768 ? '24px 0 0 0' : '0 0 0 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                  {filteredBlogs[0].tags && filteredBlogs[0].tags.slice(0, 3).map((tag, i) => (
                    <span key={i} onClick={(e) => { e.stopPropagation(); setSelectedTag(tag); }} style={{ fontSize: 13, color: 'var(--text-secondary)', padding: '4px 12px', borderRadius: 20, fontWeight: 500, cursor: 'pointer', background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="blog-title-text" style={{ fontFamily: '"Inter", sans-serif', fontSize: window.innerWidth < 768 ? 28 : 38, fontWeight: 800, marginBottom: 16, lineHeight: 1.2, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{filteredBlogs[0].title}</h2>
                <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 24, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.6 }}>
                  {filteredBlogs[0].excerpt || (filteredBlogs[0].content || '').replace(/<[^>]+>/g, '').substring(0, 200) + '...'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 'bold' }}>E</div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>{filteredBlogs[0].author || 'EnduraUP Coach'}</span>
                       <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                         {filteredBlogs[0].createdAt?.toDate ? filteredBlogs[0].createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'}) : ''}
                       </span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
                    {filteredBlogs[0].propsCount > 0 && (
                      <div style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>
                        {filteredBlogs[0].propsCount}
                      </div>
                    )}
                    <button 
                      onClick={() => handleSaveBlog(filteredBlogs[0].id)}
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: savedBlogs.includes(filteredBlogs[0].id) ? 'var(--text-primary)' : 'var(--text-muted)' }} 
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill={savedBlogs.includes(filteredBlogs[0].id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                    </button>
                    {isAdmin && (
                      <>
                        <button onClick={() => { setCurrentBlog(filteredBlogs[0]); setView('edit'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} title="Edit"><Edit3 size={16} /></button>
                        <button onClick={() => handleDelete(filteredBlogs[0].id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: 0 }} title="Hapus"><Trash2 size={16} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Header */}
          {searchQuery && (
            <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', paddingTop: 20 }}>
              <h1 style={{ fontSize: window.innerWidth < 768 ? 32 : 46, fontWeight: 700, marginBottom: 40, color: 'var(--text-primary)', letterSpacing: '-0.02em', fontFamily: '"Inter", sans-serif' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>Results for</span> {searchQuery}
              </h1>
            </div>
          )}

          {/* List Layout (Medium Style) for All Articles */}
          <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', paddingBottom: 60, paddingTop: searchQuery ? 0 : 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredBlogs.slice(!searchQuery && selectedTag === 'Semua' && !showSavedOnly ? 1 : 0).map(b => (
                <div key={b.id} className="blog-list-item" onClick={() => { setCurrentBlog(b); setView('read'); }} style={{ display: 'flex', gap: window.innerWidth < 768 ? 16 : 32, paddingBottom: 24, paddingTop: 24, paddingLeft: 16, paddingRight: 16, margin: '0 -16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', alignItems: 'flex-start', flexDirection: window.innerWidth < 768 ? 'column-reverse' : 'row' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 10, fontWeight: 'bold' }}>E</div>
                      <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{b.author || 'EnduraUP Coach'}</span>
                      <span style={{ color: 'var(--text-muted)' }}>·</span>
                      <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>{b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : ''}</span>
                    </div>
                    <h3 className="blog-title-text" style={{ fontFamily: '"Inter", sans-serif', fontSize: window.innerWidth < 768 ? 20 : 22, fontWeight: 800, marginBottom: 8, lineHeight: 1.3, color: 'var(--text-primary)' }}>{b.title}</h3>
                    <p style={{ fontSize: window.innerWidth < 768 ? 15 : 16, color: 'var(--text-secondary)', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.5, marginBottom: 16 }}>
                      {b.excerpt || (b.content || '').replace(/<[^>]+>/g, '').substring(0, 150) + '...'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                        {b.tags && b.tags.slice(0,1).map(tag => (
                          <span key={tag} style={{ fontSize: 13, background: 'var(--bg-surface)', padding: '4px 12px', borderRadius: 20, color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{tag}</span>
                        ))}
                        {b.propsCount > 0 && (
                          <span style={{ fontSize: 13, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path></svg>
                            {b.propsCount}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 12 }}>
                        <button onClick={(e) => { e.stopPropagation(); handleSaveBlog(b.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, color: savedBlogs.includes(b.id) ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill={savedBlogs.includes(b.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        </button>
                        {isAdmin && (
                          <>
                            <button onClick={(e) => { e.stopPropagation(); setCurrentBlog(b); setView('edit'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: 0 }} title="Edit"><Edit3 size={16} /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(b.id); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)', padding: 0 }} title="Hapus"><Trash2 size={16} /></button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  {(b.coverImage || b.thumbnail) && (
                    <div className="blog-img-container" style={{ width: window.innerWidth < 768 ? '100%' : 144, height: window.innerWidth < 768 ? 160 : 90, flexShrink: 0 }}>
                      <div className="blog-img-inner" style={{ background: `url('${parseImageUrl(b.coverImage || b.thumbnail)}') center/cover` }}></div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Blog Footer */}
      {!loading && (
        <footer style={{ marginTop: 'auto', paddingTop: 60, paddingBottom: 40, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <h3 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>EnduraUP</h3>
          <p style={{ maxWidth: 400, marginTop: 12, marginBottom: 24, fontSize: 14 }}>
            Platform AI pelatih lari pintar yang membantu pelari mencapai personal best dengan program adaptif berbasis data.
          </p>
          <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
            <a href="/about" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/about'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }}>Tentang Kami</a>
            <a href="/privacy" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/privacy'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }}>Kebijakan Privasi</a>
            <a href="/contact" onClick={(e) => { e.preventDefault(); window.history.pushState(null, '', '/contact'); window.dispatchEvent(new Event('popstate')); }} style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: 13, fontWeight: 500, transition: 'color 0.2s' }}>Hubungi Pelatih</a>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: 20, width: '100%', maxWidth: 400 }}>
            &copy; {new Date().getFullYear()} EnduraUP. All rights reserved.
          </div>
        </footer>
      )}
    </div>
  );
}

function BlogReader({ blog, onBack, onTagClick, lang, onProps, currentUser, savedBlogs, onSaveToggle, onRequireAuth }) {
  const dateStr = blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  
  const [particles, setParticles] = useState([]);
  const [commentCount, setCommentCount] = useState(0);

  // Subscribe to live comment count
  useEffect(() => {
    if (!blog?.id) return;
    const q = query(collection(db, 'blogs', blog.id, 'comments'));
    const unsub = onSnapshot(q, (snap) => {
      setCommentCount(snap.size);
    }, () => setCommentCount(0));
    return () => unsub();
  }, [blog?.id]);

  const safeTitle = blog.title || 'Untitled';
  const finalSlug = blog.slug || safeTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
  const blogUrl = `https://www.enduraup.space/blog/${finalSlug}`;

  useEffect(() => {
    // Save original values
    const originalTitle = document.title;
    const metaDesc = document.querySelector('meta[name="description"]');
    const originalDesc = metaDesc ? metaDesc.getAttribute('content') : '';

    // Update for SEO
    document.title = blog.seoTitle || `${blog.title} | EnduraUP Blog`;
    if (metaDesc) {
      metaDesc.setAttribute('content', blog.seoDescription || `Baca artikel "${blog.title}" di EnduraUP.`);
    }

    // Update URL history for clean sharing
    window.history.replaceState({}, '', `/blog/${finalSlug}`);

    return () => {
      // Restore on unmount
      document.title = originalTitle;
      if (metaDesc) metaDesc.setAttribute('content', originalDesc);
      window.history.replaceState({}, '', '/'); // restore to root or appropriate path
    };
  }, [blog]);

  const handleBurnClick = (e) => {
    const numParticles = Math.floor(Math.random() * 6) + 8; // 8 to 13 particles
    const newParticles = Array.from({ length: numParticles }).map((_, i) => ({
      id: Date.now() + i,
      x: (Math.random() - 0.5) * 100, // -50px to 50px horizontal spread
      y: (Math.random() - 0.5) * 40, // slight vertical variation
      r: (Math.random() - 0.5) * 60, // rotation
      s: Math.random() * 0.6 + 0.6, // scale
      d: Math.random() * 0.3, // delay
      dur: Math.random() * 0.6 + 1.2 // duration 1.2s to 1.8s
    }));

    setParticles(prev => [...prev, ...newParticles]);

    setTimeout(() => {
      setParticles(prev => prev.filter(p => !newParticles.find(np => np.id === p.id)));
    }, 2500);

    onProps();
  };

  return (
    <div className="animate-fade-in medium-blog-container" style={{ position: 'relative' }}>
      <style>{`
        @keyframes floatUpFade {
          0% { transform: translate(var(--tx), var(--ty)) scale(var(--s)) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translate(calc(var(--tx) * 2), calc(-150px - var(--ty))) scale(calc(var(--s) * 0.8)) rotate(var(--r)); opacity: 0; }
        }
      `}</style>

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
          {typeof blog.author === 'string' && blog.author ? blog.author.charAt(0).toUpperCase() : 'E'}
        </div>
        <div>
          <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{typeof blog.author === 'string' && blog.author ? blog.author : 'Tim EnduraUP'}</div>
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
              position: 'relative',
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
            {particles.map(p => (
              <svg 
                key={p.id}
                width="20" height="20" viewBox="0 0 24 24" 
                fill="#f97316" stroke="#f97316" 
                style={{
                  position: 'absolute',
                  left: 0, top: 0,
                  pointerEvents: 'none',
                  '--tx': `${p.x}px`,
                  '--ty': `${p.y}px`,
                  '--r': `${p.r}deg`,
                  '--s': p.s,
                  animation: `floatUpFade ${p.dur}s ease-out forwards`,
                  animationDelay: `${p.d}s`
                }}
              >
                <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z"></path>
              </svg>
            ))}
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
            <span style={{ fontSize: 14, fontWeight: 500 }}>{commentCount}</span>
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
              if (navigator.share) {
                navigator.share({ title: blog.title, url: blogUrl }).catch(console.error);
              } else {
                navigator.clipboard.writeText(blogUrl);
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

      {(blog.coverImage || blog.thumbnail) && (
        <img 
          src={parseImageUrl(blog.coverImage || blog.thumbnail)} 
          alt={safeTitle}
          style={{ width: '100%', height: 400, objectFit: 'cover', borderRadius: 8, marginBottom: 40, display: 'block' }}
          onError={(e) => e.currentTarget.style.display = 'none'}
        />
      )}

      {/* Render rich text HTML content safely */}
      <div 
        className="medium-blog-content"
        dangerouslySetInnerHTML={{ __html: (() => {
          const html = blog?.content || '';
          if (html.includes('&lt;') && html.includes('&gt;')) {
            const txt = document.createElement('textarea');
            txt.innerHTML = html;
            return txt.value;
          }
          return html;
        })() }} 
      />

      <hr style={{ borderTop: '1px solid var(--border)', margin: '60px 0 40px' }} />
      
      {/* Comments Section */}
      <BlogComments blogId={blog.id} currentUser={currentUser} onRequireAuth={onRequireAuth} lang={lang} />
    </div>
  );
}

function BlogEditor({ blog, onSave, onCancel, lang }) {
  const [title, setTitle] = useState(blog?.title || '');
  const [slug, setSlug] = useState(blog?.slug || '');
  const [seoTitle, setSeoTitle] = useState(blog?.seoTitle || '');
  const [seoDescription, setSeoDescription] = useState(blog?.seoDescription || '');
  const [content, setContent] = useState(blog?.content || '');
  const [tagsStr, setTagsStr] = useState(blog?.tags ? blog.tags.join(', ') : '');
  const [coverImage, setCoverImage] = useState(blog?.coverImage || blog?.thumbnail || '');
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

          const editor = quillRef.current.getEditor();
          const range = editor.getSelection();
          editor.insertEmbed(range.index, 'image', url);
        } catch (e) {
          console.error("Image upload failed", e);
          alert("Gagal upload gambar.");
        }
      }
    };
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: {
        image: imageHandler
      }
    }
  }), []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Judul dan Konten wajib diisi!");
      return;
    }
    
    // Auto-generate slug if empty
    const finalSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    onSave({
      title,
      slug: finalSlug,
      seoTitle,
      seoDescription,
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
          <input type="text" className="form-input" value={title} onChange={e => {
            setTitle(e.target.value);
            if (!blog?.slug && !slug) {
              setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''));
            }
          }} required placeholder="Contoh: Manfaat Recovery Run untuk Pemula" style={{ fontSize: 18, padding: 16, fontWeight: 600 }} />
        </div>

        {/* SEO Space */}
        <div style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h3 style={{ fontSize: 16, margin: 0, color: 'var(--text-primary)' }}>SEO Settings</h3>
          <div className="form-group">
            <label className="form-label">URL Slug</label>
            <input type="text" className="form-input" value={slug} onChange={e => setSlug(e.target.value)} placeholder="manfaat-recovery-run" />
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>https://www.enduraup.space/blog/{slug || '...'}</div>
          </div>
          <div className="form-group">
            <label className="form-label">SEO Title (Meta Title)</label>
            <input type="text" className="form-input" value={seoTitle} onChange={e => setSeoTitle(e.target.value)} placeholder="Tampil di tab browser & hasil pencarian Google" />
          </div>
          <div className="form-group">
            <label className="form-label">SEO Description (Meta Description)</label>
            <textarea className="form-input" value={seoDescription} onChange={e => setSeoDescription(e.target.value)} placeholder="Deskripsi singkat untuk snippet Google (150-160 karakter)" style={{ height: 80, resize: 'vertical' }}></textarea>
          </div>
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

function BlogComments({ blogId, currentUser, onRequireAuth, lang }) {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    if (!blogId) return;
    const q = query(collection(db, 'blogs', blogId, 'comments'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (error) => {
      console.warn("Failed to fetch comments, likely insufficient permissions:", error);
      setComments([]);
    });
    return () => unsub();
  }, [blogId]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      const uid = auth.currentUser?.uid || currentUser;
      const name = auth.currentUser?.displayName || (typeof currentUser === 'string' ? currentUser.split('@')[0] : 'User');
      await addDoc(collection(db, 'blogs', blogId, 'comments'), {
        text: newComment,
        authorId: uid,
        name: name,
        createdAt: serverTimestamp(),
        burns: 0,
        burnUsers: [],
        replies: []
      });
      setNewComment('');
    } catch(e) {
      console.error(e);
      alert('Gagal mengirim komentar');
    }
  };

  const handleReply = async (commentId) => {
    if (!replyText.trim()) return;
    try {
      const uid = auth.currentUser?.uid || currentUser;
      const name = auth.currentUser?.displayName || (typeof currentUser === 'string' ? currentUser.split('@')[0] : 'User');
      
      await updateDoc(doc(db, 'blogs', blogId, 'comments', commentId), {
        replies: arrayUnion({
          id: Date.now().toString(),
          text: replyText,
          authorId: uid,
          name: name,
          createdAt: Date.now(),
          burns: 0,
          burnUsers: []
        })
      });
      setReplyingTo(null);
      setReplyText('');
    } catch(e) {
      console.error(e);
      alert('Gagal membalas');
    }
  };

  const handleBurn = async (commentId, isReply, replyId, currentBurnUsers) => {
    const uid = auth.currentUser?.uid || currentUser;
    if (currentBurnUsers?.includes(uid)) return; // Already burned

    try {
      const commentRef = doc(db, 'blogs', blogId, 'comments', commentId);
      if (!isReply) {
        await updateDoc(commentRef, {
          burns: increment(1),
          burnUsers: arrayUnion(uid)
        });
      } else {
        // Find the reply and update it (This requires reading, modifying, writing since arrayUnion doesn't support nested object updates easily)
        // But to keep it simple and robust, we can just fetch the comment first
        const comment = comments.find(c => c.id === commentId);
        if (comment) {
          const updatedReplies = comment.replies.map(r => {
            if (r.id === replyId) {
              return { ...r, burns: (r.burns || 0) + 1, burnUsers: [...(r.burnUsers || []), uid] };
            }
            return r;
          });
          await updateDoc(commentRef, { replies: updatedReplies });
        }
      }
    } catch(e) {
      console.error(e);
    }
  };

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : 'U';

  const formatTime = (ts) => {
    if (!ts) return 'Baru saja';
    const date = ts.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'short' });
  };

  return (
    <div id="comments-section" style={{ paddingBottom: 60 }}>
      <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24, color: 'var(--text-primary)' }}>
        {lang === 'id' ? 'Komentar' : 'Comments'} ({comments.length})
      </h3>
      
      <div style={{ background: 'var(--bg-surface)', padding: 16, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 32 }}>
        <textarea 
          placeholder={lang === 'id' ? 'Tulis komentar Anda...' : 'Write your comment...'} 
          style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', resize: 'none', height: 60, fontSize: 15, cursor: !currentUser ? 'pointer' : 'text' }}
          readOnly={!currentUser}
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onClick={() => {
            if (!currentUser && onRequireAuth) {
              onRequireAuth(() => {
                document.getElementById('comments-section')?.scrollIntoView();
              });
            }
          }}
        ></textarea>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button 
            className="btn btn-primary" 
            style={{ padding: '8px 16px', borderRadius: 20, fontSize: 14 }}
            onClick={() => {
              if (!currentUser && onRequireAuth) {
                onRequireAuth(handlePostComment);
              } else {
                handlePostComment();
              }
            }}
          >
            {lang === 'id' ? 'Kirim' : 'Post'}
          </button>
        </div>
      </div>

      {comments.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {comments.map((c) => {
            const isBurned = c.burnUsers?.includes(auth.currentUser?.uid || currentUser);
            return (
              <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>
                  {getInitials(c.name)}
                </div>
                <div style={{ flex: 1 }}>
                  {/* Parent comment bubble */}
                  <div style={{ background: 'var(--bg-surface)', padding: '12px 16px', borderRadius: '0 12px 12px 12px', border: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{c.name || 'User'}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatTime(c.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{c.text}</div>

                    {/* Replies nested inside parent bubble */}
                    {c.replies && c.replies.length > 0 && (
                      <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12, borderLeft: '2px solid var(--border)', paddingLeft: 14 }}>
                        {c.replies.map(r => {
                          const isReplyBurned = r.burnUsers?.includes(auth.currentUser?.uid || currentUser);
                          return (
                            <div key={r.id}>
                              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-card)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0, fontSize: 11 }}>
                                  {getInitials(r.name)}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                    <div style={{ fontWeight: 600, fontSize: 13 }}>{r.name || 'User'}</div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatTime(r.createdAt)}</div>
                                  </div>
                                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{r.text}</div>
                                  <button 
                                    onClick={() => {
                                      if (!currentUser && onRequireAuth) onRequireAuth(() => handleBurn(c.id, true, r.id, r.burnUsers));
                                      else handleBurn(c.id, true, r.id, r.burnUsers);
                                    }}
                                    style={{ background: 'none', border: 'none', padding: 0, marginTop: 4, fontSize: 11, fontWeight: 600, color: isReplyBurned ? '#f97316' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                                  >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                                    </svg>
                                    {r.burns || 0} Burn
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Actions below bubble */}
                  <div style={{ display: 'flex', gap: 16, marginTop: 6, marginLeft: 4, alignItems: 'center' }}>
                    <button 
                      onClick={() => {
                        if (!currentUser && onRequireAuth) onRequireAuth(() => handleBurn(c.id, false, null, c.burnUsers));
                        else handleBurn(c.id, false, null, c.burnUsers);
                      }}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: isBurned ? '#f97316' : 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path>
                      </svg>
                      {c.burns || 0} Burn
                    </button>
                    <button 
                      onClick={() => setReplyingTo(replyingTo === c.id ? null : c.id)}
                      style={{ background: 'none', border: 'none', padding: 0, fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', cursor: 'pointer' }}
                    >
                      {lang === 'id' ? 'Balas' : 'Reply'}
                    </button>
                  </div>

                  {/* Reply Input */}
                  {replyingTo === c.id && (
                    <div style={{ marginTop: 12, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '8px 12px' }}>
                      <textarea 
                        autoFocus
                        placeholder={lang === 'id' ? 'Tulis balasan...' : 'Write a reply...'} 
                        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', resize: 'none', height: 52, fontSize: 14, boxSizing: 'border-box' }}
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        readOnly={!currentUser}
                        onClick={() => {
                          if (!currentUser && onRequireAuth) {
                            onRequireAuth(() => {});
                          }
                        }}
                      ></textarea>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '6px 16px', borderRadius: 20, fontSize: 13 }}
                          onClick={() => {
                            if (!currentUser && onRequireAuth) onRequireAuth(() => handleReply(c.id));
                            else handleReply(c.id);
                          }}
                        >
                          {lang === 'id' ? 'Kirim' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: 14 }}>
          {lang === 'id' ? 'Belum ada komentar. Jadilah yang pertama!' : 'No comments yet. Be the first to comment!'}
        </div>
      )}
    </div>
  );
}

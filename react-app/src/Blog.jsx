import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function BlogModule({ isAdmin, lang = 'id' }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'read', 'edit'
  const [currentBlog, setCurrentBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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

  if (view === 'edit' && isAdmin) {
    return <BlogEditor blog={currentBlog} onSave={handleSave} onCancel={() => { setView('list'); setCurrentBlog(null); }} lang={lang} />;
  }

  if (view === 'read' && currentBlog) {
    return <BlogReader blog={currentBlog} onBack={() => { setView('list'); setCurrentBlog(null); }} lang={lang} />;
  }

  const filteredBlogs = blogs.filter(b => {
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
    <div className="animate-fade-in" style={{ maxWidth: 900, margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Blog</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: 14 }}>
            {lang === 'id' ? 'Kumpulan tips, panduan, dan artikel seputar lari.' : 'Running tips, guides, and articles.'}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder={lang === 'id' ? 'Cari artikel atau tag...' : 'Search articles or tags...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px 16px',
                paddingLeft: 36,
                borderRadius: 20,
                border: '1px solid var(--border)',
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                fontSize: 13,
                width: 240,
                outline: 'none'
              }}
            />
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          {isAdmin && (
            <button 
              className="btn btn-primary"
              onClick={() => { setCurrentBlog(null); setView('edit'); }}
              style={{ borderRadius: 20 }}
            >
              + {lang === 'id' ? 'Tulis Artikel Baru' : 'Write New Article'}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Memuat artikel...</div>
      ) : filteredBlogs.length === 0 ? (
        <div className="glass-panel" style={{ padding: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📚</div>
          <h3 style={{ fontSize: 18, color: 'var(--text-primary)', marginBottom: 8 }}>Belum ada artikel</h3>
          <p style={{ color: 'var(--text-secondary)' }}>
            {searchTerm ? 'Coba kata kunci lain.' : 'Nantikan konten blog menarik dari EnduraUP!'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
          {filteredBlogs.map(b => (
            <div key={b.id} className="glass-panel hover-lift" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {b.coverImage && (
                <div style={{ height: 160, background: `url(${b.coverImage}) center/cover` }}></div>
              )}
              <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {b.tags && b.tags.map((tag, i) => (
                    <span key={i} style={{ fontSize: 10, background: 'color-mix(in srgb, var(--accent-purple) 15%, transparent)', color: 'var(--accent-purple)', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>
                      {tag.toUpperCase()}
                    </span>
                  ))}
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8, lineHeight: 1.4, color: 'var(--text-primary)' }}>{b.title}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16, flex: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {b.excerpt || b.content.substring(0, 120) + '...'}
                </p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                  <button 
                    onClick={() => { setCurrentBlog(b); setView('read'); }}
                    style={{ background: 'transparent', border: 'none', color: 'var(--accent-purple)', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0 }}
                  >
                    {lang === 'id' ? 'Baca Selengkapnya →' : 'Read More →'}
                  </button>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button onClick={() => { setCurrentBlog(b); setView('edit'); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }} title="Edit">✏️</button>
                      <button onClick={() => handleDelete(b.id)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--accent-rose)' }} title="Hapus">🗑️</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlogReader({ blog, onBack, lang }) {
  const dateStr = blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  
  return (
    <div className="animate-fade-in glass-panel" style={{ maxWidth: 800, margin: '0 auto', width: '100%', padding: '32px 40px', position: 'relative' }}>
      <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 600, padding: 0, marginBottom: 24, fontSize: 14 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
        {lang === 'id' ? 'Kembali ke Artikel' : 'Back to Articles'}
      </button>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {blog.tags && blog.tags.map((tag, i) => (
          <span key={i} style={{ fontSize: 11, background: 'var(--bg-card-hover)', color: 'var(--text-secondary)', padding: '4px 10px', borderRadius: 12, fontWeight: 600, border: '1px solid var(--border)' }}>
            {tag.toUpperCase()}
          </span>
        ))}
      </div>

      <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12, lineHeight: 1.3, color: 'var(--text-primary)' }}>{blog.title}</h1>
      <div style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-purple)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 'bold' }}>
          {blog.author ? blog.author.charAt(0).toUpperCase() : 'E'}
        </div>
        <span>Oleh <strong>{blog.author || 'Tim EnduraUP'}</strong></span>
        {dateStr && <><span>•</span><span>{dateStr}</span></>}
      </div>

      {blog.coverImage && (
        <div style={{ width: '100%', height: 300, background: `url(${blog.coverImage}) center/cover`, borderRadius: 12, marginBottom: 32 }}></div>
      )}

      {/* Render simple HTML content safely, or map paragraphs. For simplicity, we just split by double newline. */}
      <div style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--text-primary)' }}>
        {blog.content.split('\n\n').map((p, i) => (
          <p key={i} style={{ marginBottom: 16 }}>{p}</p>
        ))}
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
    <div className="animate-fade-in glass-panel" style={{ maxWidth: 800, margin: '0 auto', width: '100%', padding: 32 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 24 }}>{blog ? 'Edit Artikel' : 'Tulis Artikel Baru'}</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        <div className="form-group">
          <label className="form-label">Judul Artikel *</label>
          <input type="text" className="form-input" value={title} onChange={e => setTitle(e.target.value)} required placeholder="Contoh: Manfaat Recovery Run untuk Pemula" style={{ fontSize: 16, padding: 12 }} />
        </div>

        <div style={{ display: 'flex', gap: 20 }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Penulis</label>
            <input type="text" className="form-input" value={author} onChange={e => setAuthor(e.target.value)} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Tags / Kategori (Pisahkan dengan koma)</label>
            <input type="text" className="form-input" value={tagsStr} onChange={e => setTagsStr(e.target.value)} placeholder="Contoh: Nutrisi, Pemula, Tips" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">URL Cover Image (Opsional)</label>
          <input type="url" className="form-input" value={coverImage} onChange={e => setCoverImage(e.target.value)} placeholder="https://..." />
        </div>

        <div className="form-group">
          <label className="form-label">Isi Konten * (Gunakan spasi ganda / enter dua kali untuk paragraf baru)</label>
          <textarea 
            className="form-input" 
            value={content} 
            onChange={e => setContent(e.target.value)} 
            required 
            style={{ minHeight: 400, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.6 }}
            placeholder="Tulis artikel menarik di sini..."
          />
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 12 }}>
          <button type="button" onClick={onCancel} className="btn btn-secondary" style={{ width: 'auto' }}>Batal</button>
          <button type="submit" className="btn btn-primary" style={{ width: 'auto', padding: '8px 24px' }}>Simpan Artikel</button>
        </div>
      </form>
    </div>
  );
}

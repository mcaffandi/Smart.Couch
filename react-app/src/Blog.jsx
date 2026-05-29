import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function BlogModule({ isAdmin, lang = 'id', onViewChange }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('list'); // 'list', 'read', 'edit'
  const [currentBlog, setCurrentBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState('Semua');

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
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>
                    {b.createdAt?.toDate ? b.createdAt.toDate().toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}) : ''}
                  </div>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: 12 }} onClick={e => e.stopPropagation()}>
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

function BlogReader({ blog, onBack, onTagClick, lang }) {
  const dateStr = blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
  
  return (
    <div className="animate-fade-in medium-blog-container">
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

      {blog.coverImage && (
        <div style={{ width: '100%', height: 400, background: `url(${blog.coverImage}) center/cover`, borderRadius: 8, marginBottom: 40 }}></div>
      )}

      {/* Render rich text HTML content safely */}
      <div 
        className="medium-blog-content"
        dangerouslySetInnerHTML={{ __html: blog.content }} 
      />
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

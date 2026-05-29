import { useState, useEffect, useMemo, useRef } from 'react';
import { Lock } from 'lucide-react';
import { collection, getDocs, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function AdminDashboard({ onBack }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogPosting, setBlogPosting] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', content: '', tags: '', thumbnail: '' });
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [showAllUsers, setShowAllUsers] = useState(false);

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

  const ADMIN_PIN = '210421'; // Simple hardcoded PIN

  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchData = async () => {
      try {
        if (!db) {
           console.log("Firebase not configured");
           setLoading(false);
           return;
        }
        // Fetch users
        const usersSnap = await getDocs(collection(db, "users"));
        const usersData = [];
        usersSnap.forEach((doc) => usersData.push({ id: doc.id, data: doc.data() }));
        setUsers(usersData);

        // Fetch blogs
        const blogsSnap = await getDocs(collection(db, "blogs"));
        const blogsData = [];
        blogsSnap.forEach((doc) => blogsData.push({ id: doc.id, ...doc.data() }));
        // Sort descending by date
        blogsData.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setBlogs(blogsData);

      } catch (err) {
        console.error("Gagal ambil data admin:", err);
      }
      setLoading(false);
    };
    fetchData();
  }, [isAuthenticated]);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setIsAuthenticated(true);
    } else {
      alert("PIN Salah!");
      setPin('');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Yakin ingin menghapus user ini? Datanya tidak bisa dikembalikan.")) return;
    try {
      await deleteDoc(doc(db, "users", userId));
      setUsers(users.filter(u => u.id !== userId));
      alert("User berhasil dihapus.");
    } catch (err) {
      console.error("Gagal menghapus user:", err);
      alert("Gagal menghapus user. Pastikan aturan keamanan Firebase (Security Rules) mengizinkan delete.");
    }
  };

  const handlePostBlog = async (e) => {
    e.preventDefault();
    if (!blogForm.title || !blogForm.content || !blogForm.tags) return;
    setBlogPosting(true);
    try {
      const tagsArray = typeof blogForm.tags === 'string' 
        ? blogForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : blogForm.tags;

      if (editingBlogId) {
        await updateDoc(doc(db, "blogs", editingBlogId), {
          title: blogForm.title,
          content: blogForm.content,
          thumbnail: blogForm.thumbnail,
          tags: tagsArray
        });
        alert("Artikel berhasil di-update!");
        setBlogs(blogs.map(b => b.id === editingBlogId ? { ...b, title: blogForm.title, content: blogForm.content, thumbnail: blogForm.thumbnail, tags: tagsArray } : b));
      } else {
        const newDocRef = await addDoc(collection(db, "blogs"), {
          title: blogForm.title,
          content: blogForm.content,
          thumbnail: blogForm.thumbnail,
          tags: tagsArray,
          createdAt: serverTimestamp(),
          author: "Admin EnduraUP"
        });
        alert("Artikel berhasil di-publish!");
        setBlogs([{ 
          id: newDocRef.id, 
          title: blogForm.title, 
          content: blogForm.content, 
          thumbnail: blogForm.thumbnail, 
          tags: tagsArray, 
          createdAt: new Date(), 
          author: "Admin EnduraUP" 
        }, ...blogs]);
      }
      
      setBlogForm({ title: '', content: '', tags: '', thumbnail: '' });
      setEditingBlogId(null);
      setShowBlogForm(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan artikel.");
    }
    setBlogPosting(false);
  };

  const handleEditBlog = (blog) => {
    setBlogForm({
      title: blog.title || '',
      content: blog.content || '',
      thumbnail: blog.thumbnail || '',
      tags: blog.tags ? blog.tags.join(', ') : ''
    });
    setEditingBlogId(blog.id);
    setShowBlogForm(true);
  };

  const handleDeleteBlog = async (blogId) => {
    if (!window.confirm("Yakin ingin menghapus artikel ini?")) return;
    try {
      await deleteDoc(doc(db, "blogs", blogId));
      setBlogs(blogs.filter(b => b.id !== blogId));
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus artikel.");
    }
  };

  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-primary)' }}>
        <div style={{ background: 'var(--bg-card)', padding: 40, borderRadius: 16, border: '1px solid var(--border)', width: 320, textAlign: 'center' }}>
          <h2 style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <Lock size={24} style={{ color: 'var(--accent-purple)' }} /> Admin Area
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 20, fontSize: 14 }}>Masukkan PIN untuk mengakses data.</p>
          <form onSubmit={handlePinSubmit}>
            <input 
              type="password" 
              value={pin} 
              onChange={e => setPin(e.target.value)}
              placeholder="••••"
              style={{ width: '100%', padding: '12px', textAlign: 'center', letterSpacing: '4px', fontSize: 24, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', marginBottom: 20 }}
              autoFocus
            />
            <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>Buka Dashboard</button>
          </form>
          <button onClick={onBack} className="btn btn-secondary" style={{ width: '100%', padding: '12px', marginTop: 10 }}>Kembali</button>
        </div>
      </div>
    );
  }

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#fff' }}>Loading Data Admin...</div>;

  const totalUsers = users.length;
  const totalRuns = users.reduce((acc, user) => acc + (user.data?.running_activities?.length || 0), 0);
  const totalSleepLogs = users.reduce((acc, user) => acc + Object.keys(user.data?.sleep_records || {}).length, 0);

  return (
    <div style={{ padding: '40px 20px', maxWidth: 900, margin: '0 auto', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 4 }}>EnduraUP - Admin Dashboard</h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: 14 }}>Analisis Performa Web & Kebutuhan Bisnis</p>
        </div>
        <button className="btn btn-secondary" onClick={onBack}>Kembali ke Web</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Pelari Aktif</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--accent-purple)' }}>{totalUsers}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Sesi Lari Dicatat</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#10b981' }}>{totalRuns}</div>
        </div>
        <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Log Tidur</div>
          <div style={{ fontSize: 36, fontWeight: '800', color: '#38bdf8' }}>{totalSleepLogs}</div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0 }}>Daftar Pengguna Terbaru</h3>
          {users.length > 10 && (
            <button 
              onClick={() => setShowAllUsers(!showAllUsers)}
              style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer' }}
            >
              {showAllUsers ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua Pengguna'}
            </button>
          )}
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Email / ID</th>
                <th style={{ padding: '12px 16px' }}>Nama</th>
                <th style={{ padding: '12px 16px' }}>Tujuan Latihan</th>
                <th style={{ padding: '12px 16px' }}>Target Pace</th>
                <th style={{ padding: '12px 16px' }}>Aktivitas Lari</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {(showAllUsers ? users : users.slice(0, 10)).map(u => (
                <tr key={u.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontSize: 14, wordBreak: 'break-all' }}>
                    {u.data?.email || (u.id.substring(0, 10) + '...')}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>
                    {u.data?.displayName || u.data?.profile?.displayName || 'Anonim'}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 8px', borderRadius: 4 }}>
                      {u.data?.profile?.goal || '-'}
                    </span>
                  </td>
                  <td style={{ padding: '16px', fontSize: 14 }}>
                    {u.data?.profile?.targetPace ? `${parseFloat(u.data.profile.targetPace).toFixed(2)} /km` : '-'}
                  </td>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: 'var(--accent-purple)' }}>{u.data?.running_activities?.length || 0} sesi</td>
                  <td style={{ padding: '16px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleDeleteUser(u.id)}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                    >
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="6" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data atau tidak ada akses Firebase.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', marginTop: 20 }}>
        <h3 style={{ margin: 0, marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Kelola Artikel Blog
          <button className="btn btn-primary" onClick={() => {
            if (showBlogForm) {
              setEditingBlogId(null);
              setBlogForm({ title: '', content: '', tags: '', thumbnail: '' });
            }
            setShowBlogForm(!showBlogForm);
          }} style={{ padding: '6px 12px', fontSize: 13 }}>
            {showBlogForm ? 'Tutup Form' : '+ Tulis Artikel'}
          </button>
        </h3>
        
        {showBlogForm && (
          <form onSubmit={handlePostBlog} style={{ background: 'var(--bg-surface)', padding: 20, borderRadius: 10, border: '1px solid var(--border)', marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
              {editingBlogId ? 'Edit Artikel' : 'Tulis Artikel Baru'}
            </div>
            <input className="form-input" placeholder="Judul Artikel" required value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
            <input className="form-input" placeholder="URL Gambar Thumbnail (Opsional)" value={blogForm.thumbnail} onChange={e => setBlogForm({...blogForm, thumbnail: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
            <input className="form-input" placeholder="Tags (pisahkan dengan koma, misal: Tips, Recovery, Nutrisi)" required value={blogForm.tags} onChange={e => setBlogForm({...blogForm, tags: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-primary)' }} />
            
            <div style={{ marginBottom: 12 }}>
              <ReactQuill 
                ref={quillRef}
                theme="snow" 
                value={blogForm.content} 
                onChange={val => setBlogForm({...blogForm, content: val})} 
                modules={modules}
                placeholder="Tulis artikel menarik di sini... (Gambar bisa disisipkan lewat ikon gambar di toolbar)"
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary" disabled={blogPosting} style={{ padding: '12px', flex: 1 }}>
                {blogPosting ? 'Menyimpan...' : (editingBlogId ? 'Update Artikel' : 'Publish Artikel')}
              </button>
              {editingBlogId && (
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditingBlogId(null);
                  setBlogForm({ title: '', content: '', tags: '', thumbnail: '' });
                  setShowBlogForm(false);
                }} style={{ padding: '12px' }}>
                  Batal
                </button>
              )}
            </div>
          </form>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                <th style={{ padding: '12px 16px' }}>Judul</th>
                <th style={{ padding: '12px 16px' }}>Tanggal</th>
                <th style={{ padding: '12px 16px' }}>Tags</th>
                <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {blogs.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '16px', fontSize: 14, fontWeight: 600 }}>{b.title}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).toLocaleDateString('id-ID')}</td>
                  <td style={{ padding: '16px', fontSize: 13, color: 'var(--accent-purple)' }}>{b.tags?.join(', ')}</td>
                  <td style={{ padding: '16px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 8 }}>
                    <button onClick={() => handleEditBlog(b)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Edit</button>
                    <button onClick={() => handleDeleteBlog(b.id)} style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Hapus</button>
                  </td>
                </tr>
              ))}
              {blogs.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada artikel blog.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState, useEffect, useMemo, useRef } from 'react';
import { Lock } from 'lucide-react';
import { collection, getDocs, getDocsFromServer, getDoc, setDoc, deleteDoc, doc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
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
  
  const [adminTab, setAdminTab] = useState('overview');
  
  const [globalSettings, setGlobalSettings] = useState({ stravaSyncMode: 'fast' });
  const [savingSettings, setSavingSettings] = useState(false);

  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogPosting, setBlogPosting] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', content: '', tags: '', thumbnail: '' });
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (!db) {
         console.log("Firebase not configured");
         setLoading(false);
         return;
      }
      
      // Fetch users
      try {
        const usersSnap = await getDocsFromServer(collection(db, "users"));
        const usersData = [];
        usersSnap.forEach((doc) => usersData.push({ id: doc.id, data: doc.data() }));
        setUsers(usersData);
      } catch (err) {
        console.error("Gagal ambil data users:", err);
        if (err.code === 'permission-denied') {
          alert("Akses Ditolak: Anda login dengan email yang bukan Admin. Anda bisa mengakses dashboard, tapi data pengguna disembunyikan oleh Firebase Security Rules.");
        }
      }

      // Fetch blogs
      try {
        const blogsSnap = await getDocsFromServer(collection(db, "blogs"));
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
        console.error("Gagal ambil data blogs:", err);
      }

      // Fetch settings
      try {
        const settingsSnap = await getDoc(doc(db, "settings", "global"));
        if (settingsSnap.exists()) {
          setGlobalSettings(settingsSnap.data());
        }
      } catch (err) {
        console.error("Gagal ambil data settings:", err);
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

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, "settings", "global"), globalSettings, { merge: true });
      alert("Pengaturan berhasil disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan pengaturan.");
    }
    setSavingSettings(false);
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

  const handleTogglePremium = async (userId, userProfile) => {
    const isCurrentlyPro = userProfile?.isPremium || (userProfile?.premiumUntil && userProfile.premiumUntil > Date.now());
    
    try {
      let updates = {};
      let updatedProfile = { ...(userProfile || {}) };

      if (isCurrentlyPro) {
        if (!window.confirm("Yakin ingin mencabut status PRO user ini?")) return;
        updates = { "profile.isPremium": false, "profile.premiumUntil": null };
        updatedProfile.isPremium = false;
        updatedProfile.premiumUntil = null;
      } else {
        const monthsStr = window.prompt("Berapa bulan status PRO ingin diaktifkan?", "1");
        if (!monthsStr) return;
        const months = parseInt(monthsStr);
        if (isNaN(months) || months <= 0) {
          alert("Jumlah bulan tidak valid!");
          return;
        }
        
        const premiumUntil = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);
        updates = { "profile.isPremium": true, "profile.premiumUntil": premiumUntil };
        updatedProfile.isPremium = true;
        updatedProfile.premiumUntil = premiumUntil;
      }

      await updateDoc(doc(db, "users", userId), updates);
      
      setUsers(users.map(u => {
        if (u.id === userId) {
          return {
            ...u,
            data: {
              ...u.data,
              profile: updatedProfile
            }
          };
        }
        return u;
      }));
      alert(`Status PRO berhasil ${!isCurrentlyPro ? 'diaktifkan' : 'dicabut'}.`);
    } catch (err) {
      console.error(err);
      alert("Gagal mengubah status PRO.");
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

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const lowerQ = searchQuery.toLowerCase();
    return users.filter(u => {
      const email = (u.data?.email || u.id).toLowerCase();
      const name = (u.data?.displayName || u.data?.profile?.displayName || '').toLowerCase();
      return email.includes(lowerQ) || name.includes(lowerQ);
    });
  }, [users, searchQuery]);

  const displayedUsers = showAllUsers || searchQuery ? filteredUsers : filteredUsers.slice(0, 10);

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
  const totalBlogs = blogs.length;

  return (
    <div style={{ padding: '40px 20px', maxWidth: adminTab === 'blogs' && showBlogForm ? 1200 : 900, margin: '0 auto', color: 'var(--text-primary)', transition: 'max-width 0.3s ease' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: 0, marginBottom: 8 }}>EnduraUP - Admin</h2>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg-surface)', padding: 4, borderRadius: 24, border: '1px solid var(--border)' }}>
            <button 
              onClick={() => { setAdminTab('overview'); setShowBlogForm(false); }} 
              style={{ background: adminTab === 'overview' ? 'var(--text-primary)' : 'transparent', color: adminTab === 'overview' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setAdminTab('blogs')} 
              style={{ background: adminTab === 'blogs' ? 'var(--text-primary)' : 'transparent', color: adminTab === 'blogs' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
            >
              Kelola Artikel
            </button>
            <button 
              onClick={() => { setAdminTab('settings'); setShowBlogForm(false); }} 
              style={{ background: adminTab === 'settings' ? 'var(--text-primary)' : 'transparent', color: adminTab === 'settings' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
            >
              Pengaturan
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: 10 }}>
          {adminTab === 'blogs' && (
            <button className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px' }} onClick={async () => {
              const { addDoc, collection, serverTimestamp } = await import('firebase/firestore');
              const { db } = await import('./firebase');
              const dummyData = [
                {
                  title: 'Panduan Lari 5K Pertama untuk Pemula',
                  content: '<h2>Mengapa 5K?</h2><p>Lari 5K adalah jarak yang sangat pas untuk pemula...</p>',
                  tags: ['Pemula', 'Tips'],
                  author: 'Coach EnduraUP',
                  coverImage: 'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=1200&auto=format&fit=crop',
                }
              ];
              try {
                for (const b of dummyData) {
                  await addDoc(collection(db, 'blogs'), { ...b, createdAt: serverTimestamp() });
                }
                alert("Dummy articles ditambahkan!");
              } catch(e){ alert("Error: " + e.message); }
            }}>Generate Dummy</button>
          )}
          <button className="btn btn-secondary" style={{ width: 'auto', padding: '8px 16px' }} onClick={onBack}>Kembali ke Web</button>
        </div>
      </div>

      {adminTab === 'overview' && (
        <div className="animate-fade-in">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
            <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Pelari Aktif</div>
              <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--text-primary)' }}>{totalUsers}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>User PRO</div>
              <div style={{ fontSize: 36, fontWeight: '800', color: '#f59e0b' }}>{users.filter(u => u.data?.profile?.isPremium).length}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Estimasi Revenue / Bln</div>
              <div style={{ fontSize: 36, fontWeight: '800', color: '#10b981' }}>Rp {(users.filter(u => u.data?.profile?.isPremium).length * 29000).toLocaleString('id-ID')}</div>
            </div>
            <div className="stat-card" style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setAdminTab('blogs')}>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 600 }}>Total Artikel Blog</div>
              <div style={{ fontSize: 36, fontWeight: '800', color: 'var(--accent-purple)' }}>{totalBlogs}</div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Daftar Pengguna Terbaru</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Cari email / nama..." 
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 20, fontSize: 13, outline: 'none', minWidth: 200 }}
                />
                {(users.length > 10 || searchQuery) && (
                  <button 
                    onClick={() => setShowAllUsers(!showAllUsers)}
                    style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-primary)', padding: '6px 12px', borderRadius: 20, fontSize: 13, cursor: 'pointer' }}
                  >
                    {showAllUsers ? 'Tampilkan Lebih Sedikit' : 'Lihat Semua Pengguna'}
                  </button>
                )}
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <th style={{ padding: '12px 16px' }}>Email / ID</th>
                    <th style={{ padding: '12px 16px' }}>Nama</th>
                    <th style={{ padding: '12px 16px' }}>Login Terakhir</th>
                    <th style={{ padding: '12px 16px' }}>Tujuan</th>
                    <th style={{ padding: '12px 16px' }}>Target Pace</th>
                    <th style={{ padding: '12px 16px' }}>Status PRO</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px dashed rgba(128,128,128,0.1)' }}>
                      <td style={{ padding: '16px', fontSize: 14, wordBreak: 'break-all' }}>
                        {u.data?.email || (u.id.substring(0, 10) + '...')}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {u.data?.displayName || u.data?.profile?.displayName || 'Anonim'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 13, color: 'var(--text-muted)' }}>
                        {u.data?.lastLogin ? new Date(u.data.lastLogin.seconds ? u.data.lastLogin.seconds * 1000 : u.data.lastLogin).toLocaleDateString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        <span style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '4px 8px', borderRadius: 4 }}>
                          {u.data?.profile?.goal || '-'}
                        </span>
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {u.data?.profile?.targetPace ? `${Math.floor(u.data.profile.targetPace)}:${String(Math.round((u.data.profile.targetPace % 1) * 60)).padStart(2, '0')}/km` : '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 13 }}>
                        {(() => {
                          const isPro = u.data?.profile?.isPremium || (u.data?.profile?.premiumUntil && u.data.profile.premiumUntil > Date.now());
                          if (!isPro) return '-';
                          if (u.data?.profile?.premiumUntil) {
                            return <span style={{ color: '#10b981', fontWeight: 600 }}>s/d {new Date(u.data.profile.premiumUntil).toLocaleDateString('id-ID')}</span>;
                          }
                          return <span style={{ color: '#10b981', fontWeight: 600 }}>Aktif (Permanen)</span>;
                        })()}
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button 
                          onClick={() => handleTogglePremium(u.id, u.data?.profile)}
                          style={{ background: (u.data?.profile?.isPremium || (u.data?.profile?.premiumUntil && u.data.profile.premiumUntil > Date.now())) ? '#f59e0b' : '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', whiteSpace: 'nowrap' }}
                        >
                          {(u.data?.profile?.isPremium || (u.data?.profile?.premiumUntil && u.data.profile.premiumUntil > Date.now())) ? 'Cabut PRO' : '+ Jadikan PRO'}
                        </button>
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
                      <td colSpan="5" style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada data pelari.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="animate-fade-in" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 24, marginBottom: 24 }}>Pengaturan Sistem</h3>
          
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Strava Sync Mode</label>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>Pilih berapa banyak aktivitas yang ditarik setiap kali pengguna login atau memicu sync.</p>
            <select 
              className="form-input" 
              value={globalSettings.stravaSyncMode || 'fast'} 
              onChange={e => setGlobalSettings({...globalSettings, stravaSyncMode: e.target.value})}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
            >
              <option value="fast">Fast Sync (5 Aktivitas Terbaru) - Rekomendasi</option>
              <option value="full">Full Sync (200 Aktivitas)</option>
            </select>
          </div>

          <button 
            className="btn btn-primary" 
            onClick={handleSaveSettings}
            disabled={savingSettings}
            style={{ padding: '12px 24px', fontSize: 15 }}
          >
            {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan'}
          </button>
        </div>
      )}

      {adminTab === 'blogs' && (
        <div className="animate-fade-in" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 24 }}>Content Management System</h3>
            <button className="btn btn-primary" onClick={() => {
              if (showBlogForm) {
                setEditingBlogId(null);
                setBlogForm({ title: '', content: '', tags: '', thumbnail: '' });
              }
              setShowBlogForm(!showBlogForm);
            }} style={{ padding: '8px 20px', fontSize: 14, width: 'auto', borderRadius: 24 }}>
              {showBlogForm ? 'Kembali ke Daftar Artikel' : '+ Tulis Artikel Baru'}
            </button>
          </div>
          
          {showBlogForm ? (
            <form onSubmit={handlePostBlog} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8 }}>
                {editingBlogId ? '✍️ Edit Artikel' : '📝 Tulis Artikel Baru'}
              </div>
              <input className="form-input" placeholder="Judul Artikel" required value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }} />
              <input className="form-input" placeholder="URL Gambar Cover (Opsional)" value={blogForm.thumbnail} onChange={e => setBlogForm({...blogForm, thumbnail: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
              <input className="form-input" placeholder="Tags (pisahkan dengan koma, misal: Tips, Recovery, Nutrisi)" required value={blogForm.tags} onChange={e => setBlogForm({...blogForm, tags: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
              
              <div style={{ marginTop: 8, background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                <ReactQuill 
                  ref={quillRef}
                  theme="snow" 
                  value={blogForm.content} 
                  onChange={val => setBlogForm({...blogForm, content: val})} 
                  modules={modules}
                  placeholder="Tulis artikel menarik di sini... (Gambar bisa disisipkan lewat ikon gambar di toolbar)"
                  style={{ minHeight: 400 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="submit" className="btn btn-primary" disabled={blogPosting} style={{ padding: '14px', flex: 1, fontSize: 16 }}>
                  {blogPosting ? 'Menyimpan...' : (editingBlogId ? 'Update Artikel' : 'Publish Artikel')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <th style={{ padding: '16px' }}>Judul Artikel</th>
                    <th style={{ padding: '16px' }}>Tanggal</th>
                    <th style={{ padding: '16px' }}>Tags</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-lift">
                      <td style={{ padding: '20px 16px', fontSize: 15, fontWeight: 700 }}>{b.title}</td>
                      <td style={{ padding: '20px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>{new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                      <td style={{ padding: '20px 16px', fontSize: 13 }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {b.tags?.map(t => <span key={t} style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 12 }}>{t}</span>)}
                        </div>
                      </td>
                      <td style={{ padding: '20px 16px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: 10 }}>
                        <button onClick={() => handleEditBlog(b)} style={{ background: 'var(--bg-surface)', color: 'var(--accent-blue)', border: '1px solid var(--accent-blue)', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => handleDeleteBlog(b.id)} style={{ background: 'var(--bg-surface)', color: 'var(--accent-rose)', border: '1px solid var(--accent-rose)', padding: '6px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>Hapus</button>
                      </td>
                    </tr>
                  ))}
                  {blogs.length === 0 && (
                    <tr>
                      <td colSpan="4" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada artikel blog. Mulai menulis sekarang!</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

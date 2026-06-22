import { useState, useEffect, useMemo, useRef } from 'react';
import { Lock, PenTool, Edit3, Search, Zap, Database, AlertTriangle, Users, Activity, TrendingUp, DollarSign, FileText, Crown } from 'lucide-react';
import { collection, getDocs, getDocsFromServer, getDoc, setDoc, deleteDoc, doc, addDoc, updateDoc, serverTimestamp, increment } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from './firebase';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

export default function AdminDashboard({ onBack }) {
  const [pin, setPin] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [users, setUsers] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [requests, setRequests] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [adminTab, setAdminTab] = useState('overview');
  
  const [globalSettings, setGlobalSettings] = useState({ stravaSyncMode: 'fast' });
  const [savingSettings, setSavingSettings] = useState(false);

  const [showBlogForm, setShowBlogForm] = useState(false);
  const [blogPosting, setBlogPosting] = useState(false);
  const [blogForm, setBlogForm] = useState({ title: '', content: '', tags: '', thumbnail: '', seoTitle: '', seoDescription: '', author: 'EnduraUP Coach' });
  const [editingBlogId, setEditingBlogId] = useState(null);
  const [uploadingThumbnail, setUploadingThumbnail] = useState(false);
  const [blogFilter, setBlogFilter] = useState('all');

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingThumbnail(true);
    try {
      const storageRef = ref(storage, `blog_thumbnails/${Date.now()}_${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      setBlogForm(prev => ({ ...prev, thumbnail: downloadURL }));
    } catch (error) {
      console.error("Gagal upload thumbnail:", error);
      alert("Gagal mengupload gambar. Pastikan Firebase Storage sudah diatur dengan benar.");
    } finally {
      setUploadingThumbnail(false);
    }
  };
  const [showAllUsers, setShowAllUsers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const quillRef = useRef(null);

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (!file) return;

      // Compress image using Canvas
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to Base64 (compress to ~70% quality JPEG)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);

          const quill = quillRef.current.getEditor();
          let range = quill.getSelection(true);
          const index = range ? range.index : quill.getLength();
          quill.insertEmbed(index, 'image', dataUrl);
        };
      };
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

      // Fetch upgrade requests
      try {
        const reqSnap = await getDocsFromServer(collection(db, "upgrade_requests"));
        const reqData = [];
        reqSnap.forEach((doc) => reqData.push({ id: doc.id, ...doc.data() }));
        reqData.sort((a, b) => {
          const tA = a.requestedAt?.toMillis ? a.requestedAt.toMillis() : 0;
          const tB = b.requestedAt?.toMillis ? b.requestedAt.toMillis() : 0;
          return tB - tA;
        });
        setRequests(reqData);
      } catch (err) {
        console.error("Gagal ambil data requests:", err);
      }

      // Fetch feedbacks
      try {
        const fbSnap = await getDocsFromServer(collection(db, "feedback"));
        const fbData = [];
        fbSnap.forEach((doc) => fbData.push({ id: doc.id, ...doc.data() }));
        fbData.sort((a, b) => {
          const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return tB - tA;
        });
        setFeedbacks(fbData);
      } catch (err) {
        console.error("Gagal ambil data feedbacks:", err);
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
      const hasLocalSession = !!localStorage.getItem('smartcoach_last_email') || !!sessionStorage.getItem('smartcoach_session');
      if (!auth.currentUser && !hasLocalSession) {
        alert("Akses Firebase ditolak: Anda belum Login ke sistem menggunakan Google Account! Silakan kembali ke web utama dan Login terlebih dahulu.");
        return;
      }
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

  const handleApproveRequest = async (requestDoc) => {
    const monthsStr = window.prompt(`Berapa bulan PRO untuk ${requestDoc.email}?`, "1");
    if (!monthsStr) return;
    const months = parseInt(monthsStr);
    if (isNaN(months) || months <= 0) {
      alert("Jumlah bulan tidak valid!");
      return;
    }

    try {
      const premiumUntil = Date.now() + (months * 30 * 24 * 60 * 60 * 1000);
      
      // Update user doc
      await updateDoc(doc(db, "users", requestDoc.userId), {
        "profile.isPremium": true,
        "profile.premiumUntil": premiumUntil
      });

      // Mark request as approved
      await updateDoc(doc(db, "upgrade_requests", requestDoc.id), {
        status: 'approved',
        approvedAt: serverTimestamp()
      });

      // Update local state
      setRequests(requests.map(r => r.id === requestDoc.id ? { ...r, status: 'approved' } : r));
      setUsers(users.map(u => {
        if (u.id === requestDoc.userId) {
          return {
            ...u,
            data: {
              ...u.data,
              profile: {
                ...(u.data.profile || {}),
                isPremium: true,
                premiumUntil: premiumUntil
              }
            }
          };
        }
        return u;
      }));

      alert(`Sukses mengaktifkan PRO untuk ${requestDoc.email}.`);
    } catch (err) {
      console.error(err);
      alert("Gagal memproses request.");
    }
  };

  const handleRejectRequest = async (requestId) => {
    if (!window.confirm("Tolak permintaan ini?")) return;
    try {
      await updateDoc(doc(db, "upgrade_requests", requestId), {
        status: 'rejected'
      });
      await setDoc(doc(db, "settings", "global"), {
        proQuotaRemaining: increment(1)
      }, { merge: true });
      setRequests(requests.map(r => r.id === requestId ? { ...r, status: 'rejected' } : r));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePostBlog = async (e, isDraft = false) => {
    if (e) e.preventDefault();
    if (!blogForm.title || !blogForm.content || !blogForm.tags) return;
    setBlogPosting(true);
    try {
      const tagsArray = typeof blogForm.tags === 'string' 
        ? blogForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : blogForm.tags;

      let finalThumbnail = blogForm.thumbnail;
      if (finalThumbnail && finalThumbnail.includes('drive.google.com/file/d/')) {
        const match = finalThumbnail.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          finalThumbnail = `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
      } else if (finalThumbnail && finalThumbnail.includes('drive.google.com/uc')) {
        const match = finalThumbnail.match(/id=([a-zA-Z0-9_-]+)/);
        if (match && match[1]) {
          finalThumbnail = `https://lh3.googleusercontent.com/d/${match[1]}`;
        }
      }

      let finalContent = blogForm.content;
      if (finalContent) {
        finalContent = finalContent
          .replace(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)(?:\/[^"'\s<]*)?/g, 'https://lh3.googleusercontent.com/d/$1')
          .replace(/https:\/\/drive\.google\.com\/uc\?export=view&amp;id=([a-zA-Z0-9_-]+)/g, 'https://lh3.googleusercontent.com/d/$1')
          .replace(/https:\/\/drive\.google\.com\/uc\?export=view&id=([a-zA-Z0-9_-]+)/g, 'https://lh3.googleusercontent.com/d/$1');
      }

      if (editingBlogId) {
        await updateDoc(doc(db, "blogs", editingBlogId), {
          title: blogForm.title,
          content: finalContent,
          thumbnail: finalThumbnail,
          tags: tagsArray,
          author: blogForm.author || 'EnduraUP Coach',
          seoTitle: blogForm.seoTitle || '',
          seoDescription: blogForm.seoDescription || '',
          isDraft: isDraft
        });
        alert(isDraft ? "Draft berhasil disimpan!" : "Artikel berhasil di-update!");
        setBlogs(blogs.map(b => b.id === editingBlogId ? { ...b, title: blogForm.title, content: finalContent, thumbnail: finalThumbnail, tags: tagsArray, seoTitle: blogForm.seoTitle, seoDescription: blogForm.seoDescription, isDraft, author: blogForm.author || 'EnduraUP Coach' } : b));
      } else {
        const newDocRef = await addDoc(collection(db, "blogs"), {
          title: blogForm.title,
          content: finalContent,
          thumbnail: finalThumbnail,
          tags: tagsArray,
          author: blogForm.author || 'EnduraUP Coach',
          seoTitle: blogForm.seoTitle || '',
          seoDescription: blogForm.seoDescription || '',
          isDraft: isDraft,
          createdAt: serverTimestamp()
        });
        alert(isDraft ? "Draft berhasil disimpan!" : "Artikel berhasil di-publish!");
        setBlogs([{ 
          id: newDocRef.id, 
          title: blogForm.title, 
          content: finalContent, 
          thumbnail: finalThumbnail, 
          tags: tagsArray,
          seoTitle: blogForm.seoTitle,
          seoDescription: blogForm.seoDescription,
          isDraft: isDraft,
          createdAt: new Date(), 
          author: blogForm.author || 'EnduraUP Coach'
        }, ...blogs]);
      }
      
      setBlogForm({ title: '', content: '', tags: '', thumbnail: '', metaTitle: '', metaDescription: '' });
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
      thumbnail: blog.thumbnail || blog.coverImage || '',
      seoTitle: blog.seoTitle || '',
      seoDescription: blog.seoDescription || '',
      tags: blog.tags ? blog.tags.join(', ') : '',
      author: blog.author || 'EnduraUP Coach'
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
      const name = (u.data?.displayName || u.data?.profile?.displayName || '').toLowerCase();
      return name.includes(lowerQ);
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

  const ADMIN_EMAILS = ['m.c.affandi@gmail.com', 'affanbelajar@gmail.com'];
  const paidProUsers = users.filter(u => {
    if (!u.data?.profile?.isPremium) return false;
    const email = (u.data?.email || u.id || '').toLowerCase();
    return !ADMIN_EMAILS.includes(email);
  });

  const now = Date.now();
  const dau = users.filter(u => {
    if (!u.data?.lastLogin) return false;
    const lastLoginTime = u.data.lastLogin.seconds ? u.data.lastLogin.seconds * 1000 : u.data.lastLogin;
    return (now - lastLoginTime) < 24 * 60 * 60 * 1000;
  }).length;

  const mau = users.filter(u => {
    if (!u.data?.lastLogin) return false;
    const lastLoginTime = u.data.lastLogin.seconds ? u.data.lastLogin.seconds * 1000 : u.data.lastLogin;
    return (now - lastLoginTime) < 30 * 24 * 60 * 60 * 1000;
  }).length;

  return (
    <div style={{ padding: '40px 20px', maxWidth: '100%', margin: '0 auto', color: 'var(--text-primary)', transition: 'max-width 0.3s ease' }}>
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
              onClick={() => { setAdminTab('upgrades'); setShowBlogForm(false); }} 
              style={{ background: adminTab === 'upgrades' ? 'var(--text-primary)' : 'transparent', color: adminTab === 'upgrades' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              Requests
              {requests.filter(r => r.status === 'pending').length > 0 && (
                <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                  {requests.filter(r => r.status === 'pending').length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { setAdminTab('feedbacks'); setShowBlogForm(false); }} 
              style={{ background: adminTab === 'feedbacks' ? 'var(--text-primary)' : 'transparent', color: adminTab === 'feedbacks' ? 'var(--bg-base)' : 'var(--text-secondary)', border: 'none', padding: '6px 16px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s' }}
            >
              Reviews
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 4, fontWeight: 600 }}>Total Pengguna</div>
                  <div style={{ fontSize: 24, fontWeight: '800', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{totalUsers}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4 }}>Terdaftar di sistem</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <Users size={16} color="var(--text-secondary)" />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, rgba(59, 130, 246, 0.02) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(59, 130, 246, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: '#3b82f6', opacity: 0.1, filter: 'blur(20px)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-sky)', marginBottom: 4, fontWeight: 600 }}>Aktif Harian (DAU)</div>
                  <div style={{ fontSize: 24, fontWeight: '800', color: 'var(--accent-sky)', letterSpacing: '-0.5px' }}>{dau}</div>
                  <div style={{ fontSize: 10, color: 'rgba(147, 197, 253, 0.6)', marginTop: 4 }}>Login dlm 24 jam</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <Activity size={16} color="var(--accent-sky)" />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(139, 92, 246, 0.08) 0%, rgba(139, 92, 246, 0.02) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(139, 92, 246, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: '#8b5cf6', opacity: 0.1, filter: 'blur(20px)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-purple)', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>Aktif Bulanan (MAU)</div>
                  <div style={{ fontSize: 24, fontWeight: '800', color: 'var(--accent-purple)', letterSpacing: '-0.5px' }}>{mau}</div>
                  <div style={{ fontSize: 10, color: 'rgba(196, 181, 253, 0.6)', marginTop: 4 }}>Login dlm 30 hari</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <TrendingUp size={16} color="var(--accent-purple)" />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(245, 158, 11, 0.08) 0%, rgba(245, 158, 11, 0.02) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(245, 158, 11, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: '#f59e0b', opacity: 0.1, filter: 'blur(20px)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-amber)', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>User PRO</div>
                  <div style={{ fontSize: 24, fontWeight: '800', color: 'var(--accent-amber)', letterSpacing: '-0.5px' }}>{paidProUsers.length}</div>
                  <div style={{ fontSize: 10, color: 'rgba(252, 211, 77, 0.6)', marginTop: 4 }}>Berlangganan aktif</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(245, 158, 11, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <Crown size={16} color="var(--accent-amber)" />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(16, 185, 129, 0.2)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: '#10b981', opacity: 0.1, filter: 'blur(20px)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-emerald)', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>Estimasi Revenue / Bln</div>
                  <div style={{ fontSize: 22, fontWeight: '800', color: 'var(--accent-emerald)', letterSpacing: '-0.5px' }}>
                    Rp {(paidProUsers.length * 29000).toLocaleString('id-ID')}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(110, 231, 183, 0.6)', marginTop: 4 }}>Gross Estimate</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <DollarSign size={16} color="var(--accent-emerald)" />
                </div>
              </div>
            </div>

            <div className="stat-card" style={{ background: 'linear-gradient(145deg, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0.02) 100%)', padding: 16, borderRadius: 12, border: '1px solid rgba(236, 72, 153, 0.2)', position: 'relative', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setAdminTab('blogs')}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 60, height: 60, background: '#ec4899', opacity: 0.1, filter: 'blur(20px)', borderRadius: '50%' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ zIndex: 1 }}>
                  <div style={{ fontSize: 11, color: 'var(--accent-rose)', opacity: 0.8, marginBottom: 4, fontWeight: 600 }}>Total Artikel Blog</div>
                  <div style={{ fontSize: 24, fontWeight: '800', color: 'var(--accent-rose)', letterSpacing: '-0.5px' }}>{totalBlogs}</div>
                  <div style={{ fontSize: 10, color: 'rgba(249, 168, 212, 0.6)', marginTop: 4 }}>Klik untuk mengelola</div>
                </div>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(236, 72, 153, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1 }}>
                  <FileText size={16} color="var(--accent-rose)" />
                </div>
              </div>
            </div>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <h3 style={{ margin: 0 }}>Daftar Pengguna Terbaru</h3>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="Cari nama pengguna..." 
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
              {displayedUsers.map(u => {
                const isPro = u.data?.profile?.isPremium || (u.data?.profile?.premiumUntil && u.data.profile.premiumUntil > Date.now());
                const name = u.data?.displayName || u.data?.profile?.displayName || 'Anonim';
                const initial = name.charAt(0).toUpperCase();
                const lastLoginStr = u.data?.lastLogin ? new Date(u.data.lastLogin.seconds ? u.data.lastLogin.seconds * 1000 : u.data.lastLogin).toLocaleDateString('id-ID') : 'Belum pernah login';
                return (
                  <div 
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      gap: '12px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent-sky)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                      <div style={{
                        width: '40px', height: '40px', borderRadius: '50%',
                        background: isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-card)',
                        border: isPro ? 'none' : '1px solid var(--border)',
                        color: isPro ? '#fff' : 'var(--text-primary)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '16px',
                        flexShrink: 0
                      }}>
                        {initial}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: '600', fontSize: '15px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</span>
                          {isPro && <Crown size={14} color="#f59e0b" style={{ flexShrink: 0 }} />}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {u.data?.email || (u.id.substring(0, 10) + '...')}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>Login Terakhir</div>
                      <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>{lastLoginStr}</div>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)', background: 'var(--bg-surface)', borderRadius: 12 }}>
                  Belum ada data pelari.
                </div>
              )}
            </div>

            {/* Modal Detail User */}
            {selectedUser && (
              <div style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999, padding: '20px'
              }} onClick={() => setSelectedUser(null)}>
                <div style={{
                  background: 'var(--bg-card)', padding: '32px', borderRadius: '20px',
                  width: '100%', maxWidth: '500px', border: '1px solid var(--border)',
                  position: 'relative',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.4)'
                }} onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setSelectedUser(null)}
                    style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 24 }}
                  >&times;</button>
                  
                  {(() => {
                    const u = selectedUser;
                    const isPro = u.data?.profile?.isPremium || (u.data?.profile?.premiumUntil && u.data.profile.premiumUntil > Date.now());
                    const name = u.data?.displayName || u.data?.profile?.displayName || 'Anonim';
                    const email = u.data?.email || u.id;
                    const lastLoginStr = u.data?.lastLogin ? new Date(u.data.lastLogin.seconds ? u.data.lastLogin.seconds * 1000 : u.data.lastLogin).toLocaleDateString('id-ID') : '-';
                    const targetPace = u.data?.profile?.targetPace ? `${Math.floor(u.data.profile.targetPace)}:${String(Math.round((u.data.profile.targetPace % 1) * 60)).padStart(2, '0')}/km` : '-';

                    return (
                      <>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                          <div style={{
                            width: '64px', height: '64px', borderRadius: '50%',
                            background: isPro ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'var(--bg-surface)',
                            border: isPro ? 'none' : '1px solid var(--border)',
                            color: isPro ? '#fff' : 'var(--text-primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '28px'
                          }}>
                            {name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {name} {isPro && <Crown size={18} color="#f59e0b" />}
                            </h2>
                            <div style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>{email}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                          <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Tujuan Latihan</div>
                            <div style={{ fontWeight: '600', fontSize: '14px', textTransform: 'capitalize' }}>{u.data?.profile?.goal || '-'}</div>
                          </div>
                          <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Target Pace</div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{targetPace}</div>
                          </div>
                          <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Login Terakhir</div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{lastLoginStr}</div>
                          </div>
                          <div style={{ background: 'var(--bg-surface)', padding: '12px', borderRadius: '12px', border: '1px solid var(--border)' }}>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>Status PRO</div>
                            <div style={{ fontWeight: '600', fontSize: '14px', color: isPro ? 'var(--accent-emerald)' : 'var(--text-primary)' }}>
                              {isPro ? (u.data?.profile?.premiumUntil ? `s/d ${new Date(u.data.profile.premiumUntil).toLocaleDateString('id-ID')}` : 'Permanen') : 'Non-PRO'}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                          <button 
                            onClick={() => {
                              handleTogglePremium(u.id, u.data?.profile);
                              setSelectedUser(null);
                            }}
                            className="btn"
                            style={{ flex: 1, background: isPro ? 'var(--accent-amber)' : 'var(--accent-emerald)', color: '#fff', border: 'none' }}
                          >
                            {isPro ? 'Cabut Status PRO' : '+ Jadikan PRO'}
                          </button>
                          <button 
                            onClick={() => {
                              handleDeleteUser(u.id);
                              setSelectedUser(null);
                            }}
                            className="btn btn-secondary"
                            style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--accent-rose)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                          >
                            Hapus User
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {adminTab === 'settings' && (
        <div className="animate-fade-in" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
          <h3 style={{ margin: 0, fontSize: 24, marginBottom: 24 }}>Pengaturan Sistem</h3>
          
          <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Master Toggle: Strava Sync (PRO Users)</label>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Aktifkan atau matikan sinkronisasi Strava untuk semua user PRO. Berguna jika terjadi error pada API Strava.</p>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', position: 'relative' }}>
                <input 
                  type="checkbox" 
                  checked={globalSettings.stravaSyncEnabled !== false} 
                  onChange={e => setGlobalSettings({...globalSettings, stravaSyncEnabled: e.target.checked})}
                  style={{ opacity: 0, position: 'absolute', width: 0, height: 0 }}
                />
                <div style={{ width: 44, height: 24, background: globalSettings.stravaSyncEnabled !== false ? 'var(--accent-emerald)' : 'var(--accent-rose)', borderRadius: 24, position: 'relative', transition: 'background 0.3s' }}>
                  <div style={{ position: 'absolute', top: 2, left: globalSettings.stravaSyncEnabled !== false ? 22 : 2, width: 20, height: 20, background: '#fff', borderRadius: '50%', transition: 'left 0.3s' }}></div>
                </div>
              </label>
            </div>
          </div>

          <div style={{ marginBottom: 24, padding: 16, border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600, fontSize: 15 }}>Mode Penarikan Data (Strava Sync Mode)</label>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>Pilih seberapa banyak aktivitas yang ditarik saat profil di-refresh.</p>
            </div>
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-base)', padding: 6, borderRadius: 12, border: '1px solid var(--border)', width: 'fit-content' }}>
              <button 
                type="button"
                onClick={() => setGlobalSettings({...globalSettings, stravaSyncMode: 'fast'})}
                style={{ background: globalSettings.stravaSyncMode !== 'full' ? 'var(--accent-purple)' : 'transparent', color: globalSettings.stravaSyncMode !== 'full' ? '#fff' : 'var(--text-secondary)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Zap size={16} /> Fast Sync (Top 5)
              </button>
              <button 
                type="button"
                onClick={() => setGlobalSettings({...globalSettings, stravaSyncMode: 'full'})}
                style={{ background: globalSettings.stravaSyncMode === 'full' ? 'var(--accent-rose)' : 'transparent', color: globalSettings.stravaSyncMode === 'full' ? '#fff' : 'var(--text-secondary)', border: 'none', padding: '10px 20px', borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Database size={16} /> Full Sync (Semua Data)
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Sisa Kuota PRO (Ditampilkan di Popup)</label>
            <input 
              type="number"
              className="form-input" 
              value={globalSettings.proQuotaRemaining ?? 9} 
              onChange={e => setGlobalSettings({...globalSettings, proQuotaRemaining: parseInt(e.target.value) || 0})}
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
            />
          </div>

          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Harga PRO 1 Bulan (Rp)</label>
              <input 
                type="number"
                className="form-input" 
                value={globalSettings.proPrice1Month ?? 29000} 
                onChange={e => setGlobalSettings({...globalSettings, proPrice1Month: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Harga PRO 3 Bulan (Rp)</label>
              <input 
                type="number"
                className="form-input" 
                value={globalSettings.proPrice3Months ?? 79000} 
                onChange={e => setGlobalSettings({...globalSettings, proPrice3Months: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Harga PRO 6 Bulan (Rp)</label>
              <input 
                type="number"
                className="form-input" 
                value={globalSettings.proPrice6Months ?? 149000} 
                onChange={e => setGlobalSettings({...globalSettings, proPrice6Months: parseInt(e.target.value) || 0})}
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
          </div>

          <h4 style={{ marginTop: 32, marginBottom: 16, fontSize: 18, color: 'var(--accent-purple)' }}>Pembayaran Manual (PRO)</h4>
          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Nama Bank (mis. BCA, Mandiri)</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.bankName ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, bankName: e.target.value})}
                placeholder="BCA"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Nomor Rekening</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.bankAccount ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, bankAccount: e.target.value})}
                placeholder="1234 5678 90"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Atas Nama (A.N)</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.bankAccountName ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, bankAccountName: e.target.value})}
                placeholder="EnduraUP App"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>URL Gambar QRIS (Opsional)</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.qrisImageUrl ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, qrisImageUrl: e.target.value})}
                placeholder="https://..."
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
          </div>

          <h4 style={{ marginTop: 32, marginBottom: 16, fontSize: 18, color: 'var(--accent-purple)' }}>Kontak (Hubungi Kami)</h4>
          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>No HP / WhatsApp</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.contactPhone ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, contactPhone: e.target.value})}
                placeholder="+62 812-3456-7890"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Email Support</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.contactEmail ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, contactEmail: e.target.value})}
                placeholder="hello@enduraup.space"
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Instagram URL</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.contactInstagram ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, contactInstagram: e.target.value})}
                placeholder="https://instagram.com/..."
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Twitter / X URL</label>
              <input 
                type="text"
                className="form-input" 
                value={globalSettings.contactTwitter ?? ''} 
                onChange={e => setGlobalSettings({...globalSettings, contactTwitter: e.target.value})}
                placeholder="https://x.com/..."
                style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15 }}
              />
            </div>
          </div>

          <h4 style={{ marginTop: 32, marginBottom: 16, fontSize: 18, color: 'var(--accent-purple)' }}>Analisis Blog & Iklan</h4>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>ID / Script Google Analytics (Opsional)</label>
            <textarea 
              className="form-input" 
              value={globalSettings.googleAnalyticsCode ?? ''} 
              onChange={e => setGlobalSettings({...globalSettings, googleAnalyticsCode: e.target.value})}
              placeholder="G-XXXXXXXXXX atau <script>...</script>"
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15, minHeight: 80, resize: 'vertical' }}
            />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, fontSize: 14 }}>Kode Script Iklan (AdSense dll)</label>
            <textarea 
              className="form-input" 
              value={globalSettings.adsenseCode ?? ''} 
              onChange={e => setGlobalSettings({...globalSettings, adsenseCode: e.target.value})}
              placeholder="<script async src='...'></script>"
              style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 15, minHeight: 80, resize: 'vertical' }}
            />
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

      {adminTab === 'feedbacks' && (
        <div className="animate-fade-in">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Kelola Review (Landing Page)</h3>
          </div>
          {feedbacks.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada review dari pengguna.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
              {feedbacks.map(fb => (
                <div key={fb.id} className="stat-card" style={{ background: 'var(--bg-card)', padding: 20, borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{fb.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{fb.createdAt?.toDate ? fb.createdAt.toDate().toLocaleDateString('id-ID') : fb.date}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 2 }}>
                      {[...Array(fb.rating || 5)].map((_, i) => (
                        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                      ))}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, flex: 1, fontStyle: 'italic', marginBottom: 16 }}>"{fb.feedback}"</p>
                  <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button 
                      onClick={async () => {
                        try {
                          await updateDoc(doc(db, 'feedback', fb.id), { isFeatured: !fb.isFeatured });
                          setFeedbacks(prev => prev.map(f => f.id === fb.id ? { ...f, isFeatured: !f.isFeatured } : f));
                        } catch (err) {
                          alert('Gagal mengupdate status: ' + err.message);
                        }
                      }}
                      style={{ padding: '8px 12px', background: fb.isFeatured ? '#10b98120' : 'var(--bg-surface)', color: fb.isFeatured ? '#10b981' : 'var(--text-secondary)', border: '1px solid ' + (fb.isFeatured ? '#10b98150' : 'var(--border)'), borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all 0.2s' }}
                    >
                      {fb.isFeatured ? '★ Ditampilkan' : 'Tampilkan di Web'}
                    </button>
                    <button 
                      onClick={async () => {
                        if (window.confirm('Yakin ingin menghapus review ini?')) {
                          try {
                            await deleteDoc(doc(db, 'feedback', fb.id));
                            setFeedbacks(prev => prev.filter(f => f.id !== fb.id));
                          } catch (err) {
                            alert('Gagal menghapus review: ' + err.message);
                          }
                        }
                      }}
                      style={{ padding: '8px 12px', background: '#ef444420', color: '#ef4444', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'background 0.2s' }}
                      onMouseOver={e => e.currentTarget.style.background = '#ef444430'}
                      onMouseOut={e => e.currentTarget.style.background = '#ef444420'}
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {adminTab === 'blogs' && (
        <div className="animate-fade-in" style={{ background: 'var(--bg-card)', padding: 32, borderRadius: 16, border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h3 style={{ margin: 0, fontSize: 24 }}>Content Management System</h3>
            <button className="btn btn-primary" onClick={() => {
              if (showBlogForm) {
                setEditingBlogId(null);
                setBlogForm({ title: '', content: '', tags: '', thumbnail: '', seoTitle: '', seoDescription: '', author: 'EnduraUP Coach' });
              }
              setShowBlogForm(!showBlogForm);
            }} style={{ padding: '8px 20px', fontSize: 14, width: 'auto', borderRadius: 24 }}>
              {showBlogForm ? 'Kembali ke Daftar Artikel' : '+ Tulis Artikel Baru'}
            </button>
          </div>
          
          {showBlogForm ? (
            <form onSubmit={handlePostBlog} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                {editingBlogId ? <><Edit3 size={18} /> Edit Artikel</> : <><PenTool size={18} /> Tulis Artikel Baru</>}
              </div>
              <input className="form-input" placeholder="Judul Artikel" required value={blogForm.title} onChange={e => setBlogForm({...blogForm, title: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 16 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
                <label style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Thumbnail / Cover Artikel</label>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  {blogForm.thumbnail && (
                    <img 
                      src={blogForm.thumbnail.includes('drive.google.com') 
                        ? `https://lh3.googleusercontent.com/d/${blogForm.thumbnail.match(/id=([^&]+)/)?.[1] || blogForm.thumbnail.match(/d\/([a-zA-Z0-9_-]+)/)?.[1]}` 
                        : blogForm.thumbnail} 
                      alt="Preview" 
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} 
                      onError={(e) => e.target.style.display='none'} 
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <input type="file" accept="image/*" id="thumbnail-upload" style={{ display: 'none' }} onChange={handleThumbnailUpload} />
                    <button 
                      type="button" 
                      onClick={() => document.getElementById('thumbnail-upload').click()}
                      className="btn btn-secondary"
                      style={{ padding: '8px 16px', fontSize: 14 }}
                      disabled={uploadingThumbnail}
                    >
                      {uploadingThumbnail ? 'Mengupload...' : 'Upload Gambar Thumbnail'}
                    </button>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>URL Gambar (Opsional jika sudah upload):</div>
                    <input className="form-input" placeholder="https://..." value={blogForm.thumbnail} onChange={e => setBlogForm({...blogForm, thumbnail: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-base)', color: 'var(--text-primary)', marginTop: 4, fontSize: 13 }} />
                  </div>
                </div>
              </div>
              <input className="form-input" placeholder="Penulis Artikel (Misal: EnduraUP Coach, dr. Tirta, dll)" required value={blogForm.author} onChange={e => setBlogForm({...blogForm, author: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
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

              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-purple)', marginBottom: 8, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Search size={18} /> SEO Pengaturan (Opsional)
              </div>
              <input className="form-input" placeholder="Meta Title (Maks 60 Karakter, default: Judul Artikel)" value={blogForm.seoTitle} onChange={e => setBlogForm({...blogForm, seoTitle: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14 }} />
              <textarea className="form-input" placeholder="Meta Description (Maks 160 Karakter)" value={blogForm.seoDescription} onChange={e => setBlogForm({...blogForm, seoDescription: e.target.value})} style={{ width: '100%', padding: '14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 14, minHeight: 80, resize: 'vertical' }} />

              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button type="button" onClick={(e) => handlePostBlog(e, true)} className="btn btn-secondary" disabled={blogPosting} style={{ padding: '14px', flex: 1, fontSize: 16 }}>
                  {blogPosting ? 'Menyimpan...' : 'Simpan Draft'}
                </button>
                <button type="button" onClick={(e) => handlePostBlog(e, false)} className="btn btn-primary" disabled={blogPosting} style={{ padding: '14px', flex: 1, fontSize: 16 }}>
                  {blogPosting ? 'Menyimpan...' : (editingBlogId ? 'Update & Publish' : 'Publish Artikel')}
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setBlogFilter('all')} style={{ padding: '6px 16px', background: blogFilter === 'all' ? 'var(--text-primary)' : 'var(--bg-surface)', color: blogFilter === 'all' ? 'var(--bg-base)' : 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>Semua ({blogs.length})</button>
                <button onClick={() => setBlogFilter('published')} style={{ padding: '6px 16px', background: blogFilter === 'published' ? 'var(--text-primary)' : 'var(--bg-surface)', color: blogFilter === 'published' ? 'var(--bg-base)' : 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>Published ({blogs.filter(b => !b.isDraft).length})</button>
                <button onClick={() => setBlogFilter('draft')} style={{ padding: '6px 16px', background: blogFilter === 'draft' ? 'var(--text-primary)' : 'var(--bg-surface)', color: blogFilter === 'draft' ? 'var(--bg-base)' : 'var(--text-secondary)', border: '1px solid var(--border)', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all 0.2s' }}>Drafts ({blogs.filter(b => b.isDraft).length})</button>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <th style={{ padding: '16px' }}>Judul Artikel</th>
                    <th style={{ padding: '16px' }}>Tanggal</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Views</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Reacts</th>
                    <th style={{ padding: '16px' }}>Tags</th>
                    <th style={{ padding: '16px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {blogs.filter(b => {
                    if (blogFilter === 'published') return !b.isDraft;
                    if (blogFilter === 'draft') return b.isDraft;
                    return true;
                  }).map(b => (
                    <tr key={b.id} style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.2s' }} className="hover-lift">
                      <td style={{ padding: '20px 16px', fontSize: 15, fontWeight: 700 }}>
                        {b.title}
                        {b.isDraft && <span style={{ marginLeft: 8, background: '#f59e0b', color: '#fff', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>DRAFT</span>}
                      </td>
                      <td style={{ padding: '20px 16px', fontSize: 14, color: 'var(--text-secondary)' }}>{new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</td>
                      <td style={{ padding: '20px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: 'var(--accent-purple)' }}>{b.views || 0}</td>
                      <td style={{ padding: '20px 16px', textAlign: 'center', fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>{b.propsCount || 0}</td>
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
                      <td colSpan="6" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada artikel blog. Mulai menulis sekarang!</td>
                    </tr>
                  )}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>
      )}

      {adminTab === 'upgrades' && (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'var(--bg-card)', padding: 24, borderRadius: 12, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Permintaan Upgrade PRO</h3>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 13 }}>
                    <th style={{ padding: '12px 16px' }}>Tanggal Request</th>
                    <th style={{ padding: '12px 16px' }}>Email / ID</th>
                    <th style={{ padding: '12px 16px' }}>Nama</th>
                    <th style={{ padding: '12px 16px' }}>Nominal</th>
                    <th style={{ padding: '12px 16px' }}>Bukti Trf</th>
                    <th style={{ padding: '12px 16px' }}>Status</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px dashed rgba(128,128,128,0.1)' }}>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {r.requestedAt ? new Date(r.requestedAt.seconds ? r.requestedAt.seconds * 1000 : r.requestedAt).toLocaleString('id-ID') : '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14, wordBreak: 'break-all' }}>
                        {r.email || r.userId}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {r.displayName || 'Anonim'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#10b981' }}>
                        {r.amount ? `Rp ${r.amount.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        {r.receiptUrl ? (
                          <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6', textDecoration: 'underline' }}>Lihat Bukti</a>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '16px', fontSize: 14 }}>
                        <span style={{ 
                          background: r.status === 'approved' ? 'rgba(16, 185, 129, 0.1)' : r.status === 'rejected' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                          color: r.status === 'approved' ? '#10b981' : r.status === 'rejected' ? '#ef4444' : '#f59e0b', 
                          border: `1px solid ${r.status === 'approved' ? 'rgba(16, 185, 129, 0.2)' : r.status === 'rejected' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)'}`, 
                          padding: '4px 8px', borderRadius: 4, textTransform: 'capitalize' 
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: '16px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {r.status === 'pending' ? (
                          <>
                            <button 
                              onClick={() => handleApproveRequest(r)}
                              style={{ background: '#10b981', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleRejectRequest(r.id)}
                              style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                            >
                              Tolak
                            </button>
                          </>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {requests.length === 0 && (
                    <tr>
                      <td colSpan="5" style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Belum ada permintaan upgrade.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

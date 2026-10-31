import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, getDocs, increment, writeBatch 
} from "firebase/firestore";
import { 
  Users, User, LogIn, Settings, BarChart2, PlusCircle, Trash2, LogOut, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw, Upload
} from "lucide-react";

// === FIREBASE CONFIGURATION ===
// Pastikan config ini sesuai dengan milik Anda
const firebaseConfig = {
  apiKey: "AIzaSyBJ4hJwAarGKPhnooZa4Jxw9JDVOsuZRFI",
  authDomain: "evoting-smpnualfattah.firebaseapp.com",
  projectId: "evoting-smpnualfattah",
  storageBucket: "evoting-smpnualfattah.firebasestorage.app",
  messagingSenderId: "488695687383",
  appId: "1:488695687383:web:8fad2ab21da5dc192ea892",
  measurementId: "G-F80LDNETDP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === COMPONENTS ===
const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
          <div className="text-gray-600 mb-6">{children}</div>
          <div className="flex justify-end gap-3">{actions}</div>
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-6 py-3 rounded-full text-white shadow-lg animate-in slide-in-from-top-10 fade-in ${bgColor}`}>
      <Icon size={20} />
      <span className="font-medium">{message}</span>
    </div>
  );
};

const LogoHeader = ({ size = 'large' }) => {
  const containerClass = size === 'large' ? 'mb-8' : 'mb-6';
  const mainLogoClass = size === 'large' ? 'h-32 mb-4' : 'h-20 mb-3';
  const orgLogoClass = size === 'large' ? 'h-16' : 'h-10';

  return (
    <div className={`flex flex-col items-center justify-center ${containerClass}`}>
      <img src="https://lh3.googleusercontent.com/d/1VcoKqHq9JtcX2HQ30yhBgku8Zn5VRZFL=w1000" alt="SMP NU Al Fattah" className={mainLogoClass} referrerPolicy="no-referrer" />
      <div className="flex justify-center items-center gap-6">
        <img src="https://lh3.googleusercontent.com/d/1iAZFiX1Os0dY9lPzMbEztcEFSDvXCpsd=w500" alt="OSIS" className={orgLogoClass} referrerPolicy="no-referrer" />
        <img src="https://lh3.googleusercontent.com/d/1vjZQlTHqwrnadx-1CJ4lbGzO3CdR0U2E=w500" alt="IPNU" className={orgLogoClass} referrerPolicy="no-referrer" />
        <img src="https://lh3.googleusercontent.com/d/1HeuwQDNo6G2xwrwzRoP6pHnf1m_j5pne=w500" alt="IPPNU" className={orgLogoClass} referrerPolicy="no-referrer" />
      </div>
    </div>
  );
};

export default function EVotingApp() {
  const [session, setSession] = useState(null); 
  const [voterData, setVoterData] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [settings, setSettings] = useState({ period: "..... - ....." });
  const [toast, setToast] = useState(null);
  
  const showToast = (message, type = 'success') => setToast({ message, type });

  const seedInitialData = async () => {
    try {
      const snap = await getDoc(doc(db, "settings", "global"));
      if (!snap.exists()) {
        await setDoc(doc(db, "settings", "global"), { period: "2024 - 2025" });
      }
    } catch (e) {
      console.log("Auto-seed error:", e);
    }
  };

  useEffect(() => {
    seedInitialData();

    const unsubSettings = onSnapshot(doc(db, "settings", "global"), (doc) => {
      if (doc.exists()) setSettings(doc.data());
    });

    const unsubCandidates = onSnapshot(collection(db, "candidates"), (snapshot) => {
      const cands = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setCandidates(cands);
    });

    return () => {
      unsubSettings();
      unsubCandidates();
    };
  }, []);

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      {!session && (
        <LoginView onLogin={(v) => { setVoterData(v); setSession('voter'); }} onGoAdmin={() => setSession('admin')} settings={settings} showToast={showToast} />
      )}

      {session === 'voter' && (
        <VotingView voter={voterData} candidates={candidates} onVoteComplete={() => { setSession(null); setVoterData(null); }} onCancel={() => { setSession(null); setVoterData(null); }} showToast={showToast} />
      )}

      {session === 'admin' && (
        <AdminView settings={settings} candidates={candidates} onLogout={() => setSession(null)} showToast={showToast} />
      )}
    </>
  );
}

// === LOGIN VIEW ===
function LoginView({ onLogin, onGoAdmin, settings, showToast }) {
  const [voterId, setVoterId] = useState("");
  const [role, setRole] = useState("siswa");
  const [gender, setGender] = useState("L");
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [adminPass, setAdminPass] = useState("");

  const handleVoterLogin = async (e) => {
    e.preventDefault();
    if (!voterId.trim()) return showToast("ID Pemilih wajib diisi!", "error");
    
    try {
      const voterDoc = await getDoc(doc(db, "voters", voterId.trim()));
      if (voterDoc.exists()) {
        showToast("ID ini sudah digunakan untuk memilih!", "error");
        return;
      }
      
      onLogin({
        id: voterId.trim(),
        role: role,
        gender: gender,
        weight: role === 'siswa' ? 1 : 3
      });
    } catch (err) {
      showToast("Gagal memeriksa ID", "error");
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === "alfattahvote") {
      onGoAdmin();
    } else {
      showToast("Password admin salah!", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <LogoHeader size="large" />
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">APLIKASI E-VOTING</h1>
          <h2 className="text-xl font-bold text-green-700 mt-1">SMP NU AL FATTAH</h2>
          <div className="inline-block bg-green-100 text-green-800 px-4 py-1 rounded-full text-sm font-semibold mt-3 border border-green-200">
            PERIODE TAHUN {settings.period}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {!isAdminLogin ? (
            <div className="p-8">
              <form onSubmit={handleVoterLogin} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">ID Pemilih</label>
                  <input type="text" value={voterId} onChange={(e) => setVoterId(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none text-center font-mono text-lg bg-gray-50" placeholder="Masukkan ID unik Anda" required />
                  <p className="text-xs text-center text-gray-500 mt-2">*Pastikan ID benar. Satu ID hanya berlaku satu kali.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">Role / Jenis Pemilih</label>
                    <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none text-center font-medium">
                      <option value="siswa">Siswa</option>
                      <option value="nonsiswa">Non-Siswa</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1 text-center">Jenis Kelamin</label>
                    <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 bg-gray-50 outline-none text-center font-medium">
                      <option value="L">Laki-laki</option>
                      <option value="P">Perempuan</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3.5 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors mt-4 shadow-md">
                  <LogIn size={20} />
                  MASUK PEMILIHAN
                </button>
              </form>
              
              <button onClick={() => setIsAdminLogin(true)} className="w-full mt-6 text-sm text-gray-500 hover:text-green-700 font-medium transition-colors">
                Login sebagai Admin
              </button>
            </div>
          ) : (
            <div className="p-8 bg-gray-900 text-white">
              <div className="flex items-center justify-center gap-2 mb-6">
                <ShieldAlert className="text-yellow-500" size={28} />
                <h3 className="text-xl font-bold">Akses Admin</h3>
              </div>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div>
                  <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-gray-700 bg-gray-800 text-white focus:ring-2 focus:ring-yellow-500 outline-none text-center" placeholder="Masukkan Password" autoFocus />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setIsAdminLogin(false)} className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-bold transition-colors">Batal</button>
                  <button type="submit" className="flex-1 px-4 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-bold text-gray-900 transition-colors">Login Admin</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// === VOTING VIEW ===
function VotingView({ voter, candidates, onVoteComplete, onCancel, showToast }) {
  const [selectedOsis, setSelectedOsis] = useState(null);
  const [selectedIpnu, setSelectedIpnu] = useState(null);
  const [selectedIppnu, setSelectedIppnu] = useState(null);
  
  const [confirmModal, setConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const osisCands = candidates.filter(c => c.role === 'OSIS');
  const ipnuCands = candidates.filter(c => c.role === 'IPNU');
  const ippnuCands = candidates.filter(c => c.role === 'IPPNU');

  const canSubmit = selectedOsis && (voter.gender === 'L' ? selectedIpnu : selectedIppnu);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db);
      
      batch.set(doc(db, "voters", voter.id), {
        votedAt: new Date().toISOString(),
        role: voter.role,
        gender: voter.gender
      });

      const osisRef = doc(db, "candidates", selectedOsis.id);
      batch.update(osisRef, { votes: increment(voter.weight) });

      if (voter.gender === 'L' && selectedIpnu) {
        const ipnuRef = doc(db, "candidates", selectedIpnu.id);
        batch.update(ipnuRef, { votes: increment(voter.weight) });
      } else if (voter.gender === 'P' && selectedIppnu) {
        const ippnuRef = doc(db, "candidates", selectedIppnu.id);
        batch.update(ippnuRef, { votes: increment(voter.weight) });
      }

      await batch.commit();
      
      showToast("Suara Anda berhasil dikirim! Terima kasih.", "success");
      onVoteComplete();
    } catch (err) {
      showToast("Gagal mengirim suara. Periksa koneksi internet.", "error");
      setIsSubmitting(false);
      setConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      <div className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <User size={20} className="text-green-600" />
            {voter.id} <span className="text-sm font-normal text-gray-500 bg-gray-100 px-2 py-1 rounded">Bobot: {voter.weight}</span>
          </div>
          <button onClick={onCancel} className="text-red-500 hover:bg-red-50 p-2 rounded-lg flex items-center gap-1 text-sm font-medium transition-colors">
            <LogOut size={16} /> Batal & Keluar
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pt-8">
        <LogoHeader size="small" />
        <div className="text-center mb-8">
          <h2 className="text-2xl font-black text-gray-900">SURAT SUARA DIGITAL</h2>
          <p className="text-gray-600">Pilih kandidat terbaik menurut Anda</p>
        </div>

        <CandidateSection title="KANDIDAT KETUA & WAKIL KETUA OSIS" cands={osisCands} selected={selectedOsis} onSelect={setSelectedOsis} />
        
        {voter.gender === 'L' ? (
          <CandidateSection title="KANDIDAT KETUA IPNU" cands={ipnuCands} selected={selectedIpnu} onSelect={setSelectedIpnu} />
        ) : (
          <CandidateSection title="KANDIDAT KETUA IPPNU" cands={ippnuCands} selected={selectedIppnu} onSelect={setSelectedIppnu} />
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.1)] z-40">
        <div className="max-w-4xl mx-auto flex justify-between items-center gap-4">
          <p className="text-sm text-gray-500 hidden sm:block">
            {canSubmit ? "Pilihan sudah lengkap. Silakan kirim suara Anda." : "Harap pilih semua kandidat yang diwajibkan."}
          </p>
          <button 
            disabled={!canSubmit} 
            onClick={() => setConfirmModal(true)} 
            className={`flex-1 sm:flex-none py-3 px-8 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${canSubmit ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:-translate-y-1' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            <CheckCircle2 size={24} />
            KIRIM SUARA
          </button>
        </div>
      </div>

      <Modal isOpen={confirmModal} onClose={() => !isSubmitting && setConfirmModal(false)} title="Konfirmasi Pilihan" actions={
        <>
          <button onClick={() => setConfirmModal(false)} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200">Batal</button>
          <button onClick={handleSubmit} disabled={isSubmitting} className="px-5 py-2.5 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700 flex items-center gap-2">
            {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
            {isSubmitting ? "Mengirim..." : "Ya, Kirim Sekarang"}
          </button>
        </>
      }>
        <p className="mb-4">Apakah Anda yakin dengan pilihan Anda? Suara yang telah dikirim tidak dapat diubah kembali.</p>
        <div className="bg-gray-50 p-4 rounded-xl space-y-3 text-sm">
          <div><span className="font-bold text-gray-700 block text-xs uppercase mb-1">Pilihan OSIS:</span> {selectedOsis?.name}</div>
          {voter.gender === 'L' && <div><span className="font-bold text-gray-700 block text-xs uppercase mb-1">Pilihan IPNU:</span> {selectedIpnu?.name}</div>}
          {voter.gender === 'P' && <div><span className="font-bold text-gray-700 block text-xs uppercase mb-1">Pilihan IPPNU:</span> {selectedIppnu?.name}</div>}
        </div>
      </Modal>
    </div>
  );
}

function CandidateSection({ title, cands, selected, onSelect }) {
  if (!cands.length) return null;
  return (
    <div className="mb-10">
      <div className="flex items-center gap-4 mb-6">
        <h3 className="text-lg font-bold bg-green-800 text-white py-2 px-4 rounded-r-xl border-l-4 border-yellow-400 shadow-sm inline-block -ml-4">{title}</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {cands.map((c) => (
          <div key={c.id} onClick={() => onSelect(c)} className={`relative bg-white rounded-2xl p-5 cursor-pointer transition-all border-2 overflow-hidden group ${selected?.id === c.id ? 'border-green-600 shadow-xl bg-green-50/30' : 'border-gray-200 hover:border-green-300'}`}>
            {selected?.id === c.id && (
              <div className="absolute top-3 right-3 bg-green-600 text-white p-1 rounded-full shadow-md z-10">
                <CheckCircle2 size={24} />
              </div>
            )}
            
            <div className="aspect-[3/4] w-full mb-4 rounded-xl overflow-hidden bg-gray-100 relative shadow-inner">
              <img src={c.photo || "https://via.placeholder.com/300"} alt={c.name} className={`w-full h-full object-cover transition-transform duration-500 ${selected?.id === c.id ? 'scale-105' : 'group-hover:scale-105'}`} />
            </div>
            
            <div className="text-center">
              <h4 className="text-lg font-black text-gray-900 mb-2 leading-tight">{c.name}</h4>
              <div className="bg-gray-100 p-3 rounded-lg text-sm text-gray-600 italic h-24 overflow-y-auto text-left border shadow-inner">
                "{c.vision}"
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === ADMIN VIEW ===
function AdminView({ settings, candidates, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [periodInput, setPeriodInput] = useState(settings.period);
  const [isResetting, setIsResetting] = useState(false);
  const [resetModal, setResetModal] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: "", role: "OSIS", photo: "", vision: "", votes: 0 });

  const totalOsis = candidates.filter(c => c.role === 'OSIS').reduce((sum, c) => sum + c.votes, 0);

  const savePeriod = async () => {
    try {
      await updateDoc(doc(db, "settings", "global"), { period: periodInput });
      showToast("Periode diperbarui", "success");
    } catch (e) {
      showToast("Gagal menyimpan", "error");
    }
  };

  // LOGIK KOMPRESI GAMBAR & BASE64
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        
        const MAX_WIDTH = 400; // Kompres ukuran max lebar
        const MAX_HEIGHT = 400;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert ke base64 (75% quality JPEG)
        const base64String = canvas.toDataURL('image/jpeg', 0.75);
        setFormData(prev => ({ ...prev, photo: base64String }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCandidate = async () => {
    if (!formData.name.trim()) return showToast("Nama wajib diisi", "error");
    try {
      if (editId) {
        await updateDoc(doc(db, "candidates", editId), formData);
        showToast("Kandidat diperbarui", "success");
      } else {
        await setDoc(doc(collection(db, "candidates")), formData);
        showToast("Kandidat ditambah", "success");
      }
      setIsModalOpen(false);
    } catch (e) {
      showToast("Gagal menyimpan. Pastikan gambar tidak terlalu besar.", "error");
    }
  };

  const handleDeleteCandidate = async (id) => {
    if(window.confirm("Hapus kandidat ini?")) {
      await deleteDoc(doc(db, "candidates", id));
      showToast("Kandidat dihapus", "success");
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      const votersSnap = await getDocs(collection(db, "voters"));
      let batch = writeBatch(db);
      let count = 0;
      votersSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
        count++;
        if (count === 400) { batch.commit(); batch = writeBatch(db); count = 0; }
      });
      await batch.commit();

      const candsSnap = await getDocs(collection(db, "candidates"));
      const batchCands = writeBatch(db);
      candsSnap.forEach((docSnap) => {
        batchCands.update(docSnap.ref, { votes: 0 });
      });
      await batchCands.commit();

      showToast("Sistem direset!", "success");
      setResetModal(false);
    } catch (e) {
      showToast("Gagal mereset", "error");
    }
    setIsResetting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      <div className="w-full md:w-64 bg-gray-900 text-gray-300 md:min-h-screen shrink-0 border-r border-gray-800">
        <div className="p-6">
          <div className="flex items-center gap-3 text-white font-bold text-xl mb-1">
            <ShieldAlert className="text-yellow-500" /> ADMIN PANEL
          </div>
          <p className="text-xs text-gray-500">E-Voting Al Fattah</p>
        </div>
        <nav className="px-4 pb-4 space-y-1">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-green-600 text-white' : 'hover:bg-gray-800'}`}>
            <BarChart2 size={18} /> Dashboard Hasil
          </button>
          <button onClick={() => setActiveTab('candidates')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'candidates' ? 'bg-green-600 text-white' : 'hover:bg-gray-800'}`}>
            <Users size={18} /> Kelola Kandidat
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-green-600 text-white' : 'hover:bg-gray-800'}`}>
            <Settings size={18} /> Pengaturan Sistem
          </button>
        </nav>
        <div className="px-4 pt-8 md:mt-auto md:pb-8">
          <button onClick={onLogout} className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-gray-800 rounded-xl">
            <LogOut size={18} /> Keluar Admin
          </button>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-10 max-h-screen overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Rekapitulasi Suara</h2>
                <p className="text-gray-500">Hasil real-time</p>
              </div>
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">Total Suara Masuk: {totalOsis}</div>
            </div>

            {['OSIS', 'IPNU', 'IPPNU'].map(role => {
              const roleCands = candidates.filter(c => c.role === role).sort((a,b) => b.votes - a.votes);
              if(!roleCands.length) return null;
              const roleTotal = roleCands.reduce((sum, c) => sum + c.votes, 0);

              return (
                <div key={role} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
                  <h3 className="text-lg font-bold text-gray-900 mb-6 border-b pb-4">{role}</h3>
                  <div className="space-y-6">
                    {roleCands.map(c => {
                      const percentage = roleTotal > 0 ? ((c.votes / roleTotal) * 100).toFixed(1) : 0;
                      return (
                        <div key={c.id}>
                          <div className="flex justify-between items-end mb-2">
                            <div className="flex items-center gap-3">
                              <img src={c.photo || "https://via.placeholder.com/40"} alt="" className="w-10 h-10 rounded-full object-cover border" />
                              <span className="font-bold text-gray-800">{c.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-2xl font-black text-green-600">{c.votes}</span>
                              <span className="text-sm text-gray-500 ml-1">suara ({percentage}%)</span>
                            </div>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden shadow-inner">
                            <div className="bg-green-500 h-4 rounded-full" style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {activeTab === 'candidates' && (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-3xl font-black text-gray-900">Kelola Kandidat</h2>
              </div>
              <button onClick={() => { setEditId(null); setFormData({ name: "", role: "OSIS", photo: "", vision: "", votes: 0 }); setIsModalOpen(true); }} className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2">
                <PlusCircle size={18} /> Tambah Kandidat
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b text-gray-500 text-sm">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Kandidat</th>
                    <th className="px-6 py-4 font-semibold">Organisasi</th>
                    <th className="px-6 py-4 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {candidates.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50/50">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <img src={c.photo || "https://via.placeholder.com/50"} className="w-14 h-14 rounded-xl object-cover border" alt="" />
                        <div className="font-bold text-gray-900">{c.name}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${c.role==='OSIS'?'bg-blue-100 text-blue-700': c.role==='IPNU'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700'}`}>
                          {c.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setEditId(c.id); setFormData(c); setIsModalOpen(true); }} className="text-gray-400 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 p-2 rounded-lg font-medium text-sm">Edit</button>
                          <button onClick={() => handleDeleteCandidate(c.id)} className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!candidates.length && <tr><td colSpan="3" className="px-6 py-12 text-center text-gray-500">Belum ada kandidat terdaftar.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 max-w-2xl">
            <h2 className="text-3xl font-black text-gray-900 mb-2">Pengaturan Sistem</h2>
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2"><Settings size={20} className="text-gray-400"/> Periode Pemilihan</h3>
              <div className="flex gap-3">
                <input type="text" value={periodInput} onChange={e => setPeriodInput(e.target.value)} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                <button onClick={savePeriod} className="bg-gray-900 hover:bg-gray-800 text-white px-6 py-3 rounded-xl font-bold">Simpan</button>
              </div>
            </div>

            <div className="bg-red-50 p-6 md:p-8 rounded-2xl border border-red-100">
              <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2"><AlertCircle size={20}/> Zona Bahaya (Reset Sistem)</h3>
              <p className="text-red-600/80 mb-6 text-sm">Mengosongkan seluruh ID pemilih yang terekam dan mereset suara kandidat menjadi 0.</p>
              <button onClick={() => setResetModal(true)} className="bg-red-600 hover:bg-red-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2">
                <Trash2 size={18} /> Reset Seluruh Data Pemilihan
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL KANDIDAT */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Kandidat" : "Tambah Kandidat"} actions={
        <>
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Batal</button>
          <button onClick={handleSaveCandidate} className="px-4 py-2 rounded-lg font-bold text-white bg-green-600 hover:bg-green-700">Simpan</button>
        </>
      }>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Nama Pasangan / Calon</label>
            <input type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Organisasi</label>
            <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none">
              <option value="OSIS">OSIS</option>
              <option value="IPNU">IPNU</option>
              <option value="IPPNU">IPPNU</option>
            </select>
          </div>
          
          {/* UPLOAD FOTO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Foto Kandidat</label>
            <div className="flex flex-col gap-3">
              {formData.photo ? (
                <div className="relative w-32 h-40 bg-gray-100 rounded-lg overflow-hidden border">
                  <img src={formData.photo} alt="Preview" className="w-full h-full object-cover" />
                  <button onClick={() => setFormData({...formData, photo: ""})} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600">
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500 font-semibold">Klik untuk Upload Foto</p>
                  </div>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">Foto akan dikompres otomatis agar aman di database.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Visi & Misi</label>
            <textarea value={formData.vision} onChange={e => setFormData({...formData, vision: e.target.value})} className="w-full px-3 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none min-h-[100px]"></textarea>
          </div>
        </div>
      </Modal>

      {/* MODAL RESET */}
      <Modal isOpen={resetModal} onClose={() => !isResetting && setResetModal(false)} title="Konfirmasi Reset" actions={
        <>
          <button onClick={() => setResetModal(false)} disabled={isResetting} className="px-4 py-2 rounded-lg font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">Batal</button>
          <button onClick={handleResetData} disabled={isResetting} className="px-4 py-2 rounded-lg font-bold text-white bg-red-600 hover:bg-red-700 flex items-center gap-2">
            {isResetting ? <RefreshCw className="animate-spin" size={16} /> : <AlertCircle size={16} />}
            {isResetting ? "Mereset..." : "Ya, Reset"}
          </button>
        </>
      }>
        <p className="text-gray-700 mb-4">Tindakan ini akan menghapus permanen ID pemilih dan mengembalikan suara menjadi 0.</p>
        <p className="font-semibold text-red-600">Yakin ingin melanjutkan?</p>
      </Modal>
    </div>
  );
}

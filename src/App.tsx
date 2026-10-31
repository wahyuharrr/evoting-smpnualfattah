import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { 
  getFirestore, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, getDocs, increment, writeBatch 
} from "firebase/firestore";
import { 
  Users, User, LogIn, Settings, BarChart2, PlusCircle, Trash2, LogOut, CheckCircle2, ShieldAlert, AlertCircle, RefreshCw, Upload
} from "lucide-react";

// === FIREBASE CONFIGURATION ===
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
        <div className="text-gray-600 mb-4">{children}</div>
        <div className="flex justify-end gap-2">{actions}</div>
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

  return (
    <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg text-white shadow-lg ${bgColor}`}>
      <span>{message}</span>
    </div>
  );
};

const LogoHeader = () => (
  <div className="flex flex-col items-center justify-center mb-6">
    <img src="https://lh3.googleusercontent.com/d/1VcoKqHq9JtcX2HQ30yhBgku8Zn5VRZFL=w1000" alt="SMP NU Al Fattah" className="h-28 mb-3" referrerPolicy="no-referrer" />
    <div className="flex justify-center items-center gap-4">
      <img src="https://lh3.googleusercontent.com/d/1iAZFiX1Os0dY9lPzMbEztcEFSDvXCpsd=w500" alt="OSIS" className="h-12" referrerPolicy="no-referrer" />
      <img src="https://lh3.googleusercontent.com/d/1vjZQlTHqwrnadx-1CJ4lbGzO3CdR0U2E=w500" alt="IPNU" className="h-12" referrerPolicy="no-referrer" />
      <img src="https://lh3.googleusercontent.com/d/1HeuwQDNo6G2xwrwzRoP6pHnf1m_j5pne=w500" alt="IPPNU" className="h-12" referrerPolicy="no-referrer" />
    </div>
  </div>
);

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
      {!session && <LoginView onLogin={(v) => { setVoterData(v); setSession('voter'); }} onGoAdmin={() => setSession('admin')} settings={settings} showToast={showToast} />}
      {session === 'voter' && <VotingView voter={voterData} candidates={candidates} onVoteComplete={() => { setSession(null); setVoterData(null); }} onCancel={() => { setSession(null); setVoterData(null); }} showToast={showToast} />}
      {session === 'admin' && <AdminView settings={settings} candidates={candidates} onLogout={() => setSession(null)} showToast={showToast} />}
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
      onLogin({ id: voterId.trim(), role: role, gender: gender, weight: role === 'siswa' ? 1 : 3 });
    } catch (err) {
      showToast("Gagal memeriksa ID", "error");
    }
  };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (adminPass === "alfattahvote") onGoAdmin();
    else showToast("Password admin salah!", "error");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <LogoHeader />
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">APLIKASI E-VOTING</h1>
          <h2 className="text-lg font-bold text-green-700">SMP NU AL FATTAH</h2>
          <p className="text-sm text-gray-600 mt-1">PERIODE TAHUN {settings.period}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          {!isAdminLogin ? (
            <form onSubmit={handleVoterLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Pemilih</label>
                <input type="text" value={voterId} onChange={(e) => setVoterId(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Masukkan ID" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={role} onChange={(e) => setRole(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="siswa">Siswa</option>
                    <option value="nonsiswa">Non-Siswa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Jenis Kelamin</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-lg">MASUK</button>
              <button type="button" onClick={() => setIsAdminLogin(true)} className="w-full text-sm text-gray-500 hover:underline mt-2">Login Admin</button>
            </form>
          ) : (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <h3 className="font-bold text-center">Login Admin</h3>
              <input type="password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} className="w-full px-3 py-2 border rounded-lg" placeholder="Password" autoFocus />
              <div className="flex gap-2">
                <button type="button" onClick={() => setIsAdminLogin(false)} className="w-1/2 bg-gray-200 py-2 rounded-lg">Batal</button>
                <button type="submit" className="w-1/2 bg-yellow-500 py-2 rounded-lg font-bold">Login</button>
              </div>
            </form>
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
      batch.set(doc(db, "voters", voter.id), { votedAt: new Date().toISOString() });
      batch.update(doc(db, "candidates", selectedOsis.id), { votes: increment(voter.weight) });
      if (voter.gender === 'L' && selectedIpnu) {
        batch.update(doc(db, "candidates", selectedIpnu.id), { votes: increment(voter.weight) });
      } else if (voter.gender === 'P' && selectedIppnu) {
        batch.update(doc(db, "candidates", selectedIppnu.id), { votes: increment(voter.weight) });
      }
      await batch.commit();
      showToast("Suara berhasil dikirim!", "success");
      onVoteComplete();
    } catch (err) {
      showToast("Gagal mengirim suara", "error");
      setIsSubmitting(false);
      setConfirmModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white border-b sticky top-0 z-40 px-4 py-3 flex justify-between items-center">
        <span className="font-bold">ID: {voter.id} (Bobot: {voter.weight})</span>
        <button onClick={onCancel} className="text-red-600 text-sm font-semibold">Keluar</button>
      </div>
      <div className="max-w-3xl mx-auto p-4">
        <h2 className="text-xl font-bold text-center mb-6">PILIHAN KANDIDAT</h2>
        <CandidateSection title="OSIS" cands={osisCands} selected={selectedOsis} onSelect={setSelectedOsis} />
        {voter.gender === 'L' ? (
          <CandidateSection title="IPNU" cands={ipnuCands} selected={selectedIpnu} onSelect={setSelectedIpnu} />
        ) : (
          <CandidateSection title="IPPNU" cands={ippnuCands} selected={selectedIppnu} onSelect={setSelectedIppnu} />
        )}
        <button disabled={!canSubmit} onClick={() => setConfirmModal(true)} className={`w-full py-3 rounded-lg font-bold text-white mt-6 ${canSubmit ? 'bg-green-600' : 'bg-gray-300'}`}>VOTE</button>
      </div>

      <Modal isOpen={confirmModal} onClose={() => !isSubmitting && setConfirmModal(false)} title="Konfirmasi" actions={
        <>
          <button onClick={() => setConfirmModal(false)} className="px-4 py-2 bg-gray-200 rounded">Batal</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Kirim</button>
        </>
      }>
        <p>Yakin ingin mengirimkan suara Anda?</p>
      </Modal>
    </div>
  );
}

function CandidateSection({ title, cands, selected, onSelect }) {
  if (!cands.length) return null;
  return (
    <div className="mb-6">
      <h3 className="font-bold text-green-800 mb-3">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cands.map(c => (
          <div key={c.id} onClick={() => onSelect(c)} className={`border rounded-xl p-4 cursor-pointer bg-white ${selected?.id === c.id ? 'border-green-600 ring-2 ring-green-600' : 'border-gray-200'}`}>
            <img src={c.photo || "https://via.placeholder.com/150"} alt="" className="w-full h-48 object-cover rounded-lg mb-2" />
            <h4 className="font-bold text-center">{c.name}</h4>
            <p className="text-xs text-gray-600 mt-1 italic text-center">"{c.vision}"</p>
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({ name: "", role: "OSIS", photo: "", vision: "", votes: 0 });

  const savePeriod = async () => {
    await updateDoc(doc(db, "settings", "global"), { period: periodInput });
    showToast("Periode diperbarui", "success");
  };

  // FUNGSI KOMPRESI & UPLOAD FOTO
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 400;
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
        setFormData(prev => ({ ...prev, photo: canvas.toDataURL('image/jpeg', 0.75) }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCandidate = async () => {
    if (!formData.name) return showToast("Nama wajib diisi", "error");
    if (editId) {
      await updateDoc(doc(db, "candidates", editId), formData);
      showToast("Kandidat diperbarui", "success");
    } else {
      await setDoc(doc(collection(db, "candidates")), formData);
      showToast("Kandidat ditambah", "success");
    }
    setIsModalOpen(false);
  };

  const handleDeleteCandidate = async (id) => {
    if (window.confirm("Hapus kandidat?")) {
      await deleteDoc(doc(db, "candidates", id));
      showToast("Dihapus", "success");
    }
  };

  const handleReset = async () => {
    if (!window.confirm("Yakin ingin mereset seluruh data pemilih dan suara?")) return;
    const votersSnap = await getDocs(collection(db, "voters"));
    let batch = writeBatch(db);
    votersSnap.forEach(d => batch.delete(d.ref));
    await batch.commit();

    const candsSnap = await getDocs(collection(db, "candidates"));
    const batchCands = writeBatch(db);
    candsSnap.forEach(d => batchCands.update(d.ref, { votes: 0 }));
    await batchCands.commit();
    showToast("Sistem direset!", "success");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row">
      <div className="w-full md:w-64 bg-gray-900 text-white p-4">
        <h2 className="font-bold text-lg mb-6">ADMIN PANEL</h2>
        <div className="space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='dashboard'?'bg-green-600':''}`}>Dashboard</button>
          <button onClick={() => setActiveTab('candidates')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='candidates'?'bg-green-600':''}`}>Kandidat</button>
          <button onClick={() => setActiveTab('settings')} className={`w-full text-left px-3 py-2 rounded ${activeTab==='settings'?'bg-green-600':''}`}>Pengaturan</button>
          <button onClick={onLogout} className="w-full text-left px-3 py-2 rounded text-red-400">Keluar</button>
        </div>
      </div>
      <div className="flex-1 p-6">
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-xl font-bold mb-4">Rekapitulasi Suara</h2>
            {['OSIS', 'IPNU', 'IPPNU'].map(role => {
              const roleCands = candidates.filter(c => c.role === role);
              if (!roleCands.length) return null;
              return (
                <div key={role} className="bg-white p-4 rounded-xl mb-4 shadow-sm">
                  <h3 className="font-bold mb-2">{role}</h3>
                  {roleCands.map(c => (
                    <div key={c.id} className="flex justify-between items-center py-2 border-b">
                      <span>{c.name}</span>
                      <span className="font-bold text-green-600">{c.votes} suara</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
        {activeTab === 'candidates' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Kelola Kandidat</h2>
              <button onClick={() => { setEditId(null); setFormData({ name: "", role: "OSIS", photo: "", vision: "", votes: 0 }); setIsModalOpen(true); }} className="bg-green-600 text-white px-4 py-2 rounded font-bold">Tambah</button>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              {candidates.map(c => (
                <div key={c.id} className="flex items-center justify-between py-3 border-b">
                  <div className="flex items-center gap-3">
                    <img src={c.photo || "https://via.placeholder.com/40"} className="w-12 h-12 object-cover rounded" alt="" />
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">{c.role}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditId(c.id); setFormData(c); setIsModalOpen(true); }} className="text-blue-600 text-sm">Edit</button>
                    <button onClick={() => handleDeleteCandidate(c.id)} className="text-red-600 text-sm">Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="max-w-lg bg-white p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-4">Pengaturan</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Periode</label>
              <div className="flex gap-2">
                <input type="text" value={periodInput} onChange={e => setPeriodInput(e.target.value)} className="border px-3 py-2 rounded flex-1" />
                <button onClick={savePeriod} className="bg-gray-900 text-white px-4 py-2 rounded">Simpan</button>
              </div>
            </div>
            <hr className="my-6" />
            <button onClick={handleReset} className="bg-red-600 text-white px-4 py-2 rounded font-bold">Reset Sistem / Suara</button>
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Edit Kandidat" : "Tambah Kandidat"} actions={
        <>
          <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Batal</button>
          <button onClick={handleSaveCandidate} className="px-4 py-2 bg-green-600 text-white rounded font-bold">Simpan</button>
        </>
      }>
        <div className="space-y-3">
          <input type="text" placeholder="Nama Kandidat" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border px-3 py-2 rounded" />
          <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full border px-3 py-2 rounded">
            <option value="OSIS">OSIS</option>
            <option value="IPNU">IPNU</option>
            <option value="IPPNU">IPPNU</option>
          </select>
          <div>
            <label className="block text-sm font-medium mb-1">Foto Kandidat</label>
            {formData.photo ? (
              <div className="relative w-24 h-32 mb-2">
                <img src={formData.photo} alt="" className="w-full h-full object-cover rounded border" />
                <button onClick={() => setFormData({...formData, photo: ""})} className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded-full text-xs">X</button>
              </div>
            ) : (
              <label className="flex items-center justify-center border-2 border-dashed h-24 rounded cursor-pointer bg-gray-50 hover:bg-gray-100">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Upload size={18} /> Pilih Foto
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
              </label>
            )}
          </div>
          <textarea placeholder="Visi & Misi" value={formData.vision} onChange={e => setFormData({...formData, vision: e.target.value})} className="w-full border px-3 py-2 rounded"></textarea>
        </div>
      </Modal>
    </div>
  );
}

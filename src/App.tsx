import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDoc,
  getDocs,
  increment,
  writeBatch,
} from 'firebase/firestore';
import {
  Users,
  User,
  LogIn,
  Settings,
  BarChart2,
  PlusCircle,
  Trash2,
  LogOut,
  CheckCircle2,
  ShieldAlert,
  Home,
  AlertCircle,
  X,
  Upload, // Untuk upload foto
} from 'lucide-react';

// --- 1. Firebase Initialization ---
// Menggunakan konfigurasi Firebase milik pengguna
const firebaseConfig = {
  apiKey: 'AIzaSyBJ4hJwAarGKPhnooZa4Jxw9JDVOsuZRFI',
  authDomain: 'evoting-smpnualfattah.firebaseapp.com',
  projectId: 'evoting-smpnualfattah',
  storageBucket: 'evoting-smpnualfattah.firebasestorage.app',
  messagingSenderId: '488695687383',
  appId: '1:488695687383:web:8fad2ab21da5dc192ea892',
  measurementId: 'G-F80LDNETDP',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- Reusable UI Components ---

const Modal = ({ isOpen, onClose, title, children, actions }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-4 border-b flex justify-between items-center bg-emerald-50">
          <h3 className="font-bold text-emerald-800 flex items-center gap-2">
            {title}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">{children}</div>
        {actions && (
          <div className="p-4 border-t bg-gray-50 flex justify-end gap-3">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor =
    type === 'error'
      ? 'bg-red-500'
      : type === 'success'
      ? 'bg-emerald-500'
      : 'bg-blue-500';

  return (
    <div
      className={`fixed top-4 left-1/2 -translate-x-1/2 px-6 py-3 rounded-full text-white shadow-lg flex items-center gap-2 z-50 animate-in slide-in-from-top-4 ${bgColor}`}
    >
      {type === 'error' ? (
        <AlertCircle size={20} />
      ) : (
        <CheckCircle2 size={20} />
      )}
      <span className="font-medium text-sm sm:text-base whitespace-nowrap">
        {message}
      </span>
    </div>
  );
};

const Card = ({ children, className = '' }) => (
  <div
    className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden ${className}`}
  >
    {children}
  </div>
);

// --- Main Application Component ---

export default function EVotingApp() {
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'info') => setToast({ message, type });

  // Navigation State
  const [currentView, setCurrentView] = useState('home'); // home, voting, admin-login, admin-dashboard

  // Data State
  const [voterSession, setVoterSession] = useState(null); // { id, role, gender }
  const [settings, setSettings] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Seed Initial Data if Database is Empty ---
  const seedDatabaseIfEmpty = async () => {
    try {
      const settingsDoc = await getDoc(doc(db, 'settings', 'main'));
      if (!settingsDoc.exists()) {
        console.log('Database kosong. Melakukan inisialisasi awal...');

        // 1. Set Settings
        await setDoc(doc(db, 'settings', 'main'), {
          startYear: '2024',
          endYear: '2025',
        });

        // 2. Set Default Candidates
        const defaultCandidates = [
          {
            category: 'OSIS',
            name: 'Paslon 1 OSIS',
            vision: 'Visi Paslon 1',
            mission: 'Misi Paslon 1',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'OSIS',
            name: 'Paslon 2 OSIS',
            vision: 'Visi Paslon 2',
            mission: 'Misi Paslon 2',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'IPNU',
            name: 'Kandidat IPNU 1',
            vision: 'Visi IPNU',
            mission: 'Misi IPNU',
            votes: 0,
            photoUrl: '',
          },
          {
            category: 'IPPNU',
            name: 'Kandidat IPPNU 1',
            vision: 'Visi IPPNU',
            mission: 'Misi IPPNU',
            votes: 0,
            photoUrl: '',
          },
        ];

        for (const cand of defaultCandidates) {
          await setDoc(doc(collection(db, 'candidates')), {
            ...cand,
            createdAt: new Date().toISOString(),
          });
        }
        console.log('Inisialisasi selesai!');
      }
    } catch (err) {
      console.error('Gagal melakukan seed data:', err);
    }
  };

  // --- Firebase Listeners ---
  useEffect(() => {
    let unsubSettings, unsubCandidates;
    let isMounted = true;

    const initialize = async () => {
      await seedDatabaseIfEmpty();

      // Listen to Settings
      unsubSettings = onSnapshot(
        doc(db, 'settings', 'main'),
        (docSnap) => {
          if (docSnap.exists() && isMounted) {
            setSettings(docSnap.data());
          }
        },
        (error) => console.error('Settings listen error:', error)
      );

      // Listen to Candidates
      unsubCandidates = onSnapshot(
        collection(db, 'candidates'),
        (snapshot) => {
          if (!isMounted) return;
          const cands = [];
          snapshot.forEach((doc) => {
            cands.push({ id: doc.id, ...doc.data() });
          });
          setCandidates(cands);
          setIsLoading(false); // Only remove loading screen after candidates are loaded
        },
        (error) => console.error('Candidates listen error:', error)
      );
    };

    initialize();

    return () => {
      isMounted = false;
      if (unsubSettings) unsubSettings();
      if (unsubCandidates) unsubCandidates();
    };
  }, []);

  if (isLoading || !settings) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-emerald-600 bg-gray-50 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
        <div className="flex items-center gap-2 font-medium">
          <span>Menghubungkan ke Database...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 font-sans selection:bg-emerald-200">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {currentView === 'home' && (
        <HomeView
          onLogin={(session) => {
            setVoterSession(session);
            setCurrentView('voting');
          }}
          onGoAdmin={() => setCurrentView('admin-login')}
          settings={settings}
          showToast={showToast}
        />
      )}

      {currentView === 'voting' && voterSession && (
        <VotingView
          voter={voterSession}
          candidates={candidates}
          onVoteComplete={() => {
            setVoterSession(null);
            setCurrentView('home');
          }}
          onCancel={() => {
            setVoterSession(null);
            setCurrentView('home');
          }}
          showToast={showToast}
        />
      )}

      {currentView === 'admin-login' && (
        <AdminLoginView
          onSuccess={() => setCurrentView('admin-dashboard')}
          onCancel={() => setCurrentView('home')}
          showToast={showToast}
        />
      )}

      {currentView === 'admin-dashboard' && (
        <AdminDashboard
          settings={settings}
          candidates={candidates}
          onLogout={() => setCurrentView('home')}
          showToast={showToast}
        />
      )}
    </div>
  );
}

// ==========================================
// VIEWS
// ==========================================

// --- 1. Home View (Voter Login) ---
function HomeView({ onLogin, onGoAdmin, settings, showToast }) {
  const [voterId, setVoterId] = useState('');
  const [role, setRole] = useState('Siswa');
  const [gender, setGender] = useState('Laki-laki');
  const [isChecking, setIsChecking] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!voterId.trim()) {
      showToast('Masukkan ID Pemilih terlebih dahulu.', 'error');
      return;
    }

    // --- VALIDASI FORMAT ID (BARU) ---
    // Menerima format A-001 s.d. A-999 (Siswa) atau B-001 s.d. B-999 (Non-Siswa)
    // Bersifat tidak case-sensitive (huruf a/b kecil tetap bisa)
    const idPattern = /^[AB]-[0-9]{3}$/i;

    if (!idPattern.test(voterId.trim())) {
      showToast(
        'Format ID salah! Gunakan format A-001 untuk Siswa atau B-001 untuk Non-Siswa.',
        'error'
      );
      return;
    }
    // ----------------------------------

    setIsChecking(true);
    try {
      // Check if user has already voted by checking the votedIds collection
      const voterDocRef = doc(db, 'votedIds', voterId.trim());
      const voterSnap = await getDoc(voterDocRef);

      if (voterSnap.exists()) {
        showToast('Maaf, ID Pemilih ini sudah digunakan.', 'error');
        setIsChecking(false);
        return;
      }

      onLogin({ id: voterId.trim(), role, gender });
    } catch (err) {
      console.error(err);
      showToast('Gagal memverifikasi ID. Periksa koneksi internet.', 'error');
    }
    setIsChecking(false);
  };

  return (
    <div className="max-w-2xl mx-auto pt-12 p-6 flex flex-col items-center">
      {/* Logos Section - Exact Requirements */}
      <div className="flex flex-col items-center gap-6 mb-8 w-full">
        {/* Top Row: Main Logo SMP NU */}
        <div className="flex justify-center">
          <img
            src="https://lh3.googleusercontent.com/d/1VcoKqHq9JtcX2HQ30yhBgku8Zn5VRZFL=w1000"
            alt="Logo SMP NU Al Fattah"
            referrerPolicy="no-referrer"
            className="h-32 sm:h-40 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
        {/* Second Row: OSIS, IPNU, IPPNU - Exactly Half Size */}
        <div className="flex gap-6 sm:gap-10 mt-2 justify-center items-center">
          <img
            src="https://lh3.googleusercontent.com/d/1iAZFiX1Os0dY9lPzMbEztcEFSDvXCpsd=w500"
            alt="Logo OSIS"
            referrerPolicy="no-referrer"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
          <img
            src="https://lh3.googleusercontent.com/d/1vjZQlTHqwrnadx-1CJ4lbGzO3CdR0U2E"
            alt="Logo IPNU"
            referrerPolicy="no-referrer"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
          <img
            src="https://lh3.googleusercontent.com/d/1HeuwQDNo6G2xwrwzRoP6pHnf1m_j5pne"
            alt="Logo IPPNU"
            referrerPolicy="no-referrer"
            className="h-16 sm:h-20 w-auto object-contain drop-shadow-md hover:scale-105 transition-transform duration-300"
          />
        </div>
      </div>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          APLIKASI E-VOTING
        </h1>
        <h2 className="text-xl font-bold text-emerald-700 mb-1">
          SMP NU AL FATTAH
        </h2>
        <p className="text-gray-500 font-medium bg-emerald-50 py-1 px-4 rounded-full inline-block">
          PERIODE TAHUN {settings.startYear} - {settings.endYear}
        </p>
      </div>

      <Card className="w-full p-6 sm:p-8">
        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              ID Pemilih
            </label>
            <input
              type="text"
              required
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
              placeholder="Masukkan ID unik Anda"
            />
            <p className="text-xs text-gray-500 mt-1">
              *Pastikan ID Anda benar. Satu ID hanya berlaku satu kali.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Role / Jenis Pemilih
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Siswa">Siswa</option>
                <option value="Non-Siswa">Non-Siswa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isChecking ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{' '}
                Memverifikasi...
              </>
            ) : (
              <>
                <LogIn size={20} /> MASUK
              </>
            )}
          </button>
        </form>
      </Card>

      <button
        onClick={onGoAdmin}
        className="mt-8 text-sm text-gray-400 hover:text-emerald-600 transition-colors flex items-center gap-1"
      >
        <Settings size={14} /> Login Admin
      </button>
    </div>
  );
}

// --- 2. Voting View ---
function VotingView({
  voter,
  candidates,
  onVoteComplete,
  onCancel,
  showToast,
}) {
  const [selectedOsis, setSelectedOsis] = useState(null);
  const [selectedIpnu, setSelectedIpnu] = useState(null);
  const [selectedIppnu, setSelectedIppnu] = useState(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Filter candidates
  const osisCandidates = candidates.filter((c) => c.category === 'OSIS');
  const ipnuCandidates = candidates.filter((c) => c.category === 'IPNU');
  const ippnuCandidates = candidates.filter((c) => c.category === 'IPPNU');

  const needsIpnu = voter.gender === 'Laki-laki';
  const needsIppnu = voter.gender === 'Perempuan';

  const isReadyToVote =
    selectedOsis &&
    ((needsIpnu && selectedIpnu) || (needsIppnu && selectedIppnu));

  const handleVoteSubmit = async () => {
    setIsVoting(true);
    try {
      const voteWeight = voter.role === 'Siswa' ? 1 : 3;

      // Prepare updates using Batch to ensure all succeed or all fail atomically
      const batch = writeBatch(db);

      // 1. Mark voter as voted
      const voterRef = doc(db, 'votedIds', voter.id);
      batch.set(voterRef, {
        votedAt: new Date().toISOString(),
        role: voter.role,
        gender: voter.gender,
      });

      // 2. Increment votes for selected candidates
      const selectedIds = [selectedOsis];
      if (needsIpnu) selectedIds.push(selectedIpnu);
      if (needsIppnu) selectedIds.push(selectedIppnu);

      for (const candId of selectedIds) {
        if (!candId) continue;
        const candRef = doc(db, 'candidates', candId);
        batch.update(candRef, {
          votes: increment(voteWeight),
        });
      }

      // Execute transaction
      await batch.commit();

      showToast('Suara berhasil terkirim! Terima kasih.', 'success');
      onVoteComplete();
    } catch (err) {
      console.error('Gagal mengirim suara:', err);
      showToast('Terjadi kesalahan saat mengirim suara. Coba lagi.', 'error');
    }
    setIsVoting(false);
    setShowConfirmModal(false);
  };

  const CandidateCard = ({ candidate, isSelected, onSelect }) => (
    <div
      onClick={onSelect}
      className={`relative cursor-pointer transition-all duration-200 rounded-xl border-2 overflow-hidden bg-white shadow-sm hover:shadow-md
        ${
          isSelected
            ? 'border-emerald-500 ring-4 ring-emerald-100 scale-[1.02]'
            : 'border-gray-200 hover:border-emerald-300'
        }`}
    >
      {isSelected && (
        <div className="absolute top-3 right-3 bg-emerald-500 text-white p-1 rounded-full z-10 shadow-sm animate-in zoom-in">
          <CheckCircle2 size={20} />
        </div>
      )}
      <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center overflow-hidden relative group">
        {candidate.photoUrl ? (
          <img
            src={candidate.photoUrl}
            alt={candidate.name}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <User size={48} className="text-gray-300" />
        )}
      </div>
      <div className="p-4 text-center">
        <h3 className="font-bold text-lg text-gray-800 line-clamp-2">
          {candidate.name}
        </h3>

        <div className="mt-4 text-left text-sm space-y-2 border-t pt-3">
          <div>
            <span className="font-semibold text-emerald-700 block mb-1">
              Visi:
            </span>
            <p className="text-gray-600 text-xs line-clamp-3 italic">
              "{candidate.vision}"
            </p>
          </div>
          <div>
            <span className="font-semibold text-emerald-700 block mb-1">
              Misi:
            </span>
            <p className="text-gray-600 text-xs line-clamp-3">
              {candidate.mission}
            </p>
          </div>
        </div>
      </div>

      <div
        className={`py-3 text-center font-bold text-sm transition-colors ${
          isSelected
            ? 'bg-emerald-500 text-white'
            : 'bg-gray-50 text-gray-500 group-hover:bg-emerald-50'
        }`}
      >
        {isSelected ? 'TERPILIH' : 'PILIH KANDIDAT INI'}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto pt-6 p-4 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div>
          <p className="text-sm text-gray-500">
            ID Pemilih:{' '}
            <span className="font-bold text-gray-800">{voter.id}</span>
          </p>
          <p className="text-sm text-gray-500">
            Hak Suara:{' '}
            <span className="font-bold text-emerald-600">
              {voter.role} (Bobot: {voter.role === 'Siswa' ? '1' : '3'})
            </span>
          </p>
        </div>
        <button
          onClick={onCancel}
          className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1 border border-red-100 bg-red-50 px-3 py-1.5 rounded-lg"
        >
          <X size={16} /> Batal & Keluar
        </button>
      </div>

      <div className="space-y-12">
        {/* OSIS Section */}
        <section>
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">
              Calon Ketua & Wakil Ketua OSIS
            </h2>
            <div className="w-16 h-1 bg-emerald-500 mx-auto mt-2 rounded-full"></div>
          </div>
          {osisCandidates.length === 0 ? (
            <p className="text-center text-gray-400 py-8">
              Belum ada kandidat OSIS yang terdaftar.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {osisCandidates.map((c) => (
                <CandidateCard
                  key={c.id}
                  candidate={c}
                  isSelected={selectedOsis === c.id}
                  onSelect={() => setSelectedOsis(c.id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* IPNU Section (Laki-laki only) */}
        {needsIpnu && (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Calon Ketua IPNU
              </h2>
              <div className="w-16 h-1 bg-yellow-500 mx-auto mt-2 rounded-full"></div>
            </div>
            {ipnuCandidates.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Belum ada kandidat IPNU yang terdaftar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {ipnuCandidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    isSelected={selectedIpnu === c.id}
                    onSelect={() => setSelectedIpnu(c.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* IPPNU Section (Perempuan only) */}
        {needsIppnu && (
          <section>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Calon Ketua IPPNU
              </h2>
              <div className="w-16 h-1 bg-green-500 mx-auto mt-2 rounded-full"></div>
            </div>
            {ippnuCandidates.length === 0 ? (
              <p className="text-center text-gray-400 py-8">
                Belum ada kandidat IPPNU yang terdaftar.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {ippnuCandidates.map((c) => (
                  <CandidateCard
                    key={c.id}
                    candidate={c}
                    isSelected={selectedIppnu === c.id}
                    onSelect={() => setSelectedIppnu(c.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Floating VOTE Button */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex justify-center z-40">
        <div className="max-w-2xl w-full flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 hidden sm:block">
            Pastikan Anda telah memilih kandidat di semua kategori yang
            tersedia.
          </p>
          <button
            onClick={() =>
              isReadyToVote
                ? setShowConfirmModal(true)
                : showToast(
                    'Pilih kandidat di setiap kategori terlebih dahulu.',
                    'error'
                  )
            }
            className={`w-full sm:w-auto px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2
              ${
                isReadyToVote
                  ? 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-emerald-200'
                  : 'bg-gray-400 cursor-not-allowed'
              }`}
          >
            <CheckCircle2 size={20} />
            KIRIM SUARA (VOTE)
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => !isVoting && setShowConfirmModal(false)}
        title="Konfirmasi Pilihan"
        actions={
          <>
            <button
              disabled={isVoting}
              onClick={() => setShowConfirmModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              disabled={isVoting}
              onClick={handleVoteSubmit}
              className="px-6 py-2 bg-emerald-600 text-white rounded-lg font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-70 flex items-center justify-center gap-2 min-w-[140px]"
            >
              {isVoting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{' '}
                  Mengirim...
                </>
              ) : (
                'Ya, Kirim Suara'
              )}
            </button>
          </>
        }
      >
        <p className="text-gray-600 mb-4">
          Apakah Anda yakin dengan pilihan Anda? Pilihan{' '}
          <strong className="text-red-500">tidak dapat diubah</strong> setelah
          suara dikirim.
        </p>
        <div className="bg-gray-50 p-3 rounded-lg text-sm space-y-2 border border-gray-200">
          <p className="flex justify-between">
            <span className="font-semibold text-gray-500">OSIS:</span>{' '}
            <span className="font-bold text-gray-800">
              {osisCandidates.find((c) => c.id === selectedOsis)?.name}
            </span>
          </p>
          {needsIpnu && (
            <p className="flex justify-between">
              <span className="font-semibold text-gray-500">IPNU:</span>{' '}
              <span className="font-bold text-gray-800">
                {ipnuCandidates.find((c) => c.id === selectedIpnu)?.name}
              </span>
            </p>
          )}
          {needsIppnu && (
            <p className="flex justify-between">
              <span className="font-semibold text-gray-500">IPPNU:</span>{' '}
              <span className="font-bold text-gray-800">
                {ippnuCandidates.find((c) => c.id === selectedIppnu)?.name}
              </span>
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

// --- 3. Admin Login View ---
function AdminLoginView({ onSuccess, onCancel, showToast }) {
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === 'alfattahvote') {
      onSuccess();
    } else {
      showToast('Password salah!', 'error');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600">
            <ShieldAlert size={32} />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">
          Login Admin Panel
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
              placeholder="Masukkan password admin"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="w-1/3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="w-2/3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-colors"
            >
              Masuk
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}

// --- 4. Admin Dashboard ---
function AdminDashboard({ settings, candidates, onLogout, showToast }) {
  const [activeTab, setActiveTab] = useState('results'); // results, candidates, settings
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

// --- FUNGSI KOMPRESI GAMBAR KE BASE64 ---
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

        const MAX_WIDTH = 400; // Batas maksimal lebar gambar
        const MAX_HEIGHT = 400; // Batas maksimal tinggi gambar

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Kompres kualitas ke JPEG 75% agar ukuran string kecil & aman di Firestore
        const base64String = canvas.toDataURL('image/jpeg', 0.75);
        setNewCand({ ...newCand, photoUrl: base64String });
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };
  
  // New Candidate Form State
  const [newCand, setNewCand] = useState({
    category: 'OSIS',
    name: '',
    photoUrl: '',
    vision: '',
    mission: '',
  });
  const [isAdding, setIsAdding] = useState(false);
  const [isUpdatingSettings, setIsUpdatingSettings] = useState(false);

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newStart = formData.get('startYear');
    const newEnd = formData.get('endYear');

    setIsUpdatingSettings(true);
    try {
      await setDoc(doc(db, 'settings', 'main'), {
        startYear: newStart,
        endYear: newEnd,
      });
      showToast('Periode berhasil diperbarui!', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal memperbarui periode.', 'error');
    }
    setIsUpdatingSettings(false);
  };

  const handleAddCandidate = async (e) => {
    e.preventDefault();
    if (!newCand.name || !newCand.vision || !newCand.mission) {
      showToast('Harap isi semua kolom wajib.', 'error');
      return;
    }
    setIsAdding(true);
    try {
      const newRef = doc(collection(db, 'candidates'));
      await setDoc(newRef, {
        ...newCand,
        votes: 0,
        createdAt: new Date().toISOString(),
      });
      setNewCand({
        category: 'OSIS',
        name: '',
        photoUrl: '',
        vision: '',
        mission: '',
      });
      showToast('Kandidat berhasil ditambahkan.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Gagal menambahkan kandidat.', 'error');
    }
    setIsAdding(false);
  };

  const handleDeleteCandidate = async (id) => {
    try {
      await deleteDoc(doc(db, 'candidates', id));
      showToast('Kandidat dihapus.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal menghapus.', 'error');
    }
  };

  const handleResetData = async () => {
    setIsResetting(true);
    try {
      // 1. Get all voters and delete them
      const votersSnap = await getDocs(collection(db, 'votedIds'));

      // We use batches for deleting to avoid spamming the DB, limits apply but fine for small schools
      let batch = writeBatch(db);
      let count = 0;

      votersSnap.docs.forEach((d) => {
        batch.delete(doc(db, 'votedIds', d.id));
        count++;
        // Commit every 400 to stay under firestore 500 limit if many users
        if (count % 400 === 0) {
          batch.commit();
          batch = writeBatch(db);
        }
      });
      await batch.commit();

      // 2. Reset all candidate votes to 0
      batch = writeBatch(db);
      candidates.forEach((c) => {
        batch.update(doc(db, 'candidates', c.id), { votes: 0 });
      });
      await batch.commit();

      showToast(
        'Data berhasil di-reset. Sistem siap untuk uji coba/periode baru.',
        'success'
      );
      setShowResetModal(false);
    } catch (err) {
      console.error(err);
      showToast('Gagal mereset data.', 'error');
    }
    setIsResetting(false);
  };

  const renderResults = () => {
    const categories = ['OSIS', 'IPNU', 'IPPNU'];

    return (
      <div className="space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <h3 className="text-xl font-bold text-gray-800">
            Rekapitulasi Suara (Real-time)
          </h3>
          <button
            onClick={() => setShowResetModal(true)}
            className="flex items-center gap-2 text-sm text-white bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-medium shadow-sm transition-colors"
          >
            <Trash2 size={16} /> Reset Data Pemilihan
          </button>
        </div>

        {categories.map((cat) => {
          const catCandidates = candidates
            .filter((c) => c.category === cat)
            .sort((a, b) => b.votes - a.votes);
          const totalVotes = catCandidates.reduce(
            (sum, c) => sum + (c.votes || 0),
            0
          );

          return (
            <Card key={cat} className="p-6">
              <h4 className="font-bold text-lg mb-4 text-emerald-800 border-b pb-2">
                Kategori: {cat} (Total: {totalVotes} Poin Suara)
              </h4>
              {catCandidates.length === 0 ? (
                <p className="text-gray-400 italic text-sm">
                  Tidak ada kandidat
                </p>
              ) : (
                <div className="space-y-4">
                  {catCandidates.map((c) => {
                    const percentage =
                      totalVotes === 0
                        ? 0
                        : Math.round((c.votes / totalVotes) * 100);
                    return (
                      <div key={c.id} className="mb-2">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-semibold text-gray-700">
                            {c.name}
                          </span>
                          <span className="font-bold text-emerald-600">
                            {c.votes || 0} Poin ({percentage}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div
                            className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    );
  };

  const renderManageCandidates = () => (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1">
        <Card className="p-6 sticky top-24">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
            <PlusCircle size={20} className="text-emerald-500" /> Tambah
            Kandidat
          </h3>
          <form onSubmit={handleAddCandidate} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Kategori
              </label>
              <select
                value={newCand.category}
                onChange={(e) =>
                  setNewCand({ ...newCand, category: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
              >
                <option value="OSIS">OSIS</option>
                <option value="IPNU">IPNU</option>
                <option value="IPPNU">IPPNU</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Nama Lengkap
              </label>
              <input
                type="text"
                required
                value={newCand.name}
                onChange={(e) =>
                  setNewCand({ ...newCand, name: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-emerald-500"
              />
            </div>
            <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Foto Kandidat
            </label>
            {newCand.photoUrl ? (
              <div className="relative w-28 h-36 bg-gray-100 rounded-lg overflow-hidden border">
                <img
                  src={newCand.photoUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => setNewCand({ ...newCand, photoUrl: '' })}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex flex-col items-center justify-center pt-3 pb-4">
                  <Upload className="w-6 h-6 mb-1 text-gray-400" />
                  <p className="text-xs text-gray-500 font-semibold">
                    Klik untuk Pilih Foto
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}
            <p className="text-[11px] text-gray-400 mt-1">
              *Foto dikompres otomatis agar aman di database.
            </p>
          </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Visi
              </label>
              <textarea
                required
                rows={2}
                value={newCand.vision}
                onChange={(e) =>
                  setNewCand({ ...newCand, vision: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-emerald-500"
              ></textarea>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Misi
              </label>
              <textarea
                required
                rows={3}
                value={newCand.mission}
                onChange={(e) =>
                  setNewCand({ ...newCand, mission: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md text-sm outline-none focus:border-emerald-500"
              ></textarea>
            </div>
            <button
              type="submit"
              disabled={isAdding}
              className="w-full bg-emerald-600 text-white font-bold py-2 rounded-md hover:bg-emerald-700 text-sm flex justify-center items-center gap-2"
            >
              {isAdding ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{' '}
                  Menyimpan...
                </>
              ) : (
                'Simpan Kandidat'
              )}
            </button>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <h3 className="font-bold text-lg mb-2">Daftar Kandidat Tersimpan</h3>
        {candidates.length === 0 ? (
          <div className="bg-white p-8 rounded-xl border text-center text-gray-500">
            Belum ada kandidat terdaftar.
          </div>
        ) : (
          candidates.map((c) => (
            <Card
              key={c.id}
              className="p-4 flex gap-4 items-start hover:border-emerald-200 transition-colors"
            >
              <div className="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                {c.photoUrl ? (
                  <img
                    src={c.photoUrl}
                    referrerPolicy="no-referrer"
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-3 text-gray-300" />
                )}
              </div>
              <div className="flex-grow">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {c.category}
                    </span>
                    <h4 className="font-bold text-gray-800 mt-1">{c.name}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteCandidate(c.id)}
                    className="text-gray-400 hover:text-red-500 p-1.5 bg-gray-50 rounded hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="mt-2 text-xs text-gray-600 space-y-1">
                  <p>
                    <span className="font-semibold">Visi:</span> {c.vision}
                  </p>
                  <p>
                    <span className="font-semibold">Misi:</span> {c.mission}
                  </p>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <Card className="p-6 max-w-lg">
      <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
        <Settings size={20} className="text-emerald-500" /> Pengaturan Periode
      </h3>
      <form onSubmit={handleUpdateSettings} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tahun Mulai
            </label>
            <input
              type="number"
              required
              name="startYear"
              defaultValue={settings?.startYear || new Date().getFullYear()}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Tahun Selesai
            </label>
            <input
              type="number"
              required
              name="endYear"
              defaultValue={settings?.endYear || new Date().getFullYear() + 1}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={isUpdatingSettings}
          className="bg-emerald-600 text-white font-bold py-2 px-6 rounded-lg shadow-sm hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isUpdatingSettings ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{' '}
              Menyimpan...
            </>
          ) : (
            'Simpan Pengaturan'
          )}
        </button>
      </form>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Admin Header */}
      <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-gray-800">
            <div className="bg-emerald-600 text-white p-1.5 rounded-md">
              <ShieldAlert size={18} />
            </div>
            Admin Panel E-Voting
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 font-medium bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </header>

      {/* Admin Content */}
      <main className="flex-grow max-w-6xl mx-auto w-full px-4 py-8">
        {/* Navigation Tabs */}
        <div className="flex space-x-2 mb-8 bg-white p-1.5 rounded-xl shadow-sm border border-gray-100 w-fit overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab('results')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'results'
                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <BarChart2 size={16} /> Rekap Suara
          </button>
          <button
            onClick={() => setActiveTab('candidates')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'candidates'
                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Users size={16} /> Kelola Kandidat
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === 'settings'
                ? 'bg-emerald-50 text-emerald-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings size={16} /> Pengaturan
          </button>
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          {activeTab === 'results' && renderResults()}
          {activeTab === 'candidates' && renderManageCandidates()}
          {activeTab === 'settings' && renderSettings()}
        </div>
      </main>

      {/* Reset Confirmation Modal */}
      <Modal
        isOpen={showResetModal}
        onClose={() => !isResetting && setShowResetModal(false)}
        title={
          <>
            <AlertCircle className="text-red-500" size={20} /> Peringatan Bahaya
          </>
        }
        actions={
          <>
            <button
              disabled={isResetting}
              onClick={() => setShowResetModal(false)}
              className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
            >
              Batal
            </button>
            <button
              disabled={isResetting}
              onClick={handleResetData}
              className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold shadow-sm hover:bg-red-700 disabled:opacity-70 flex items-center gap-2 min-w-[150px] justify-center"
            >
              {isResetting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{' '}
                  Mereset...
                </>
              ) : (
                'Ya, Reset Semua'
              )}
            </button>
          </>
        }
      >
        <p className="text-gray-700 font-medium mb-2">
          Anda yakin ingin mereset SEMUA data?
        </p>
        <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1 mb-4">
          <li>
            Semua ID Pemilih yang sudah terekam akan <strong>dihapus</strong>{' '}
            secara permanen.
          </li>
          <li>
            Perolehan suara semua kandidat akan dikembalikan menjadi{' '}
            <strong>0</strong>.
          </li>
        </ul>
        <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 font-medium">
          Tindakan ini tidak dapat dibatalkan. Hanya gunakan ini untuk uji coba
          atau saat memulai periode pemilihan baru.
        </p>
      </Modal>
    </div>
  );
}

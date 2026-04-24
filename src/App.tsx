// src/App.tsx -- Final Version (Tích hợp PWA, Offline Mode & Full Metadata)

import { useEffect, useState } from 'react';
import { Users, ShieldCheck, TreeDeciduous, CircleAlert, Info } from 'lucide-react';
import TreeView from './components/TreeView';
import { Admin } from './pages/Admin';
import About from './components/About';
import AdminSetup from './components/AdminSetup';
import { GitHubService } from './utils/githubService';

function App() {
  // --- QUẢN LÝ QUYỀN TRUY CẬP TRUNG TÂM ---
  const [auth, setAuth] = useState<{ service: GitHubService; role: string; user: any; rawToken?: string } | null>(null);
  
  // --- STATE DỮ LIỆU TOÀN CỤC ---
  const [members, setMembers] = useState<any[]>([]);
  const [metadata, setMetadata] = useState<any>(null);
  const [familyName, setFamilyName] = useState("GIA PHẢ TRỰC TUYẾN");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- TRẠNG THÁI MẠNG (PWA OFFLINE MODE) ---
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const [tab, setTab] = useState<'view' | 'intro' | 'admin' | 'setup'>(() => {
    if (window.location.pathname === '/adminsetup') return 'setup';
    return 'view';
  });

  // 1. Lắng nghe thay đổi trạng thái mạng
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 2. Logic Tải dữ liệu thông minh
  useEffect(() => {
    const loadData = async () => {
      try {
        const localDraft = localStorage.getItem('mock_git_data.json');
        let data: any;
        
        if (localDraft) {
          data = JSON.parse(localDraft);
          console.log("🚀 Đang sử dụng dữ liệu từ bản nháp Local (LocalStorage)");
        } else {
          const response = await fetch('/data.json');
          if (!response.ok) throw new Error("Không thể tải tệp dữ liệu gốc.");
          data = await response.json();
        }

        setMembers(data.members || []);
        setMetadata(data.metadata || null); 
        if (data.metadata?.familyName) setFamilyName(data.metadata.familyName.toUpperCase());
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <div className="fixed inset-0 bg-stone-100 flex flex-col overflow-hidden font-sans select-none">
      
      {/* HEADER HỆ THỐNG */}
      <header className="bg-white p-4 shadow-md text-center border-b-4 border-[#704214] z-30">
        <h1 className="text-xl font-black text-[#704214] flex flex-wrap items-center justify-center gap-2 tracking-tighter">
          <TreeDeciduous size={28} /> 
          <span>{familyName}</span>
          
          {/* Badge Trạng thái Đăng nhập */}
          {auth && !isOffline && (
            <span className="text-[9px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full animate-pulse border border-green-200 uppercase tracking-widest ml-1">
              Live Cloud
            </span>
          )}
          
          {/* Badge Trạng thái Mất mạng */}
          {isOffline && (
            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-widest ml-1 font-black">
              📴 Ngoại tuyến
            </span>
          )}
        </h1>
      </header>

      {/* VÙNG NỘI DUNG CHÍNH */}
      <main className="flex-1 relative overflow-hidden bg-[#f8f7f5]">
        {tab === 'view' ? (
          loading ? (
            <div className="h-full flex items-center justify-center animate-pulse text-stone-400 font-bold uppercase text-xs tracking-widest">
              Đang khởi tạo cây...
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 p-10 text-center space-y-3">
              <CircleAlert size={40} />
              <p className="font-black uppercase text-sm tracking-tight">{error}</p>
              <button onClick={() => window.location.reload()} className="text-[10px] bg-stone-200 px-4 py-2 rounded-lg font-bold hover:bg-stone-300 transition-colors">
                THỬ LẠI
              </button>
            </div>
          ) : (
            <TreeView members={members} />
          )
        ) : tab === 'intro' ? (
          <About 
            aboutFamily={metadata?.aboutFamily || ""} 
            familyPhotos={metadata?.familyPhotos || []} 
          />
        ) : tab === 'admin' ? (
          <Admin 
            onBack={() => setTab('view')} 
            globalMembers={members} 
            setGlobalMembers={setMembers}
            auth={auth}
            setAuth={setAuth}
            isOffline={isOffline}
          />
        ) : (
          <AdminSetup />
        )}
      </main>

      {/* THANH ĐIỀU HƯỚNG DƯỚI */}
      <nav className="bg-white border-t border-stone-200 flex justify-around p-4 shadow-inner z-30">
        <button 
          onClick={() => setTab('view')} 
          className={`flex flex-col items-center gap-1 transition-all ${tab === 'view' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400'}`}
        >
          <Users size={24} /> 
          <span className="text-[10px] uppercase font-black tracking-widest">Xem Gia Phả</span>
        </button>

        <button 
          onClick={() => setTab('intro')} 
          className={`flex flex-col items-center gap-1 transition-all ${tab === 'intro' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400'}`}
        >
          <Info size={24} /> 
          <span className="text-[10px] uppercase font-black tracking-widest">Giới Thiệu</span>
        </button>
        
        <button 
          onClick={() => setTab('admin')} 
          className={`flex flex-col items-center gap-1 transition-all ${tab === 'admin' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400'}`}
        >
          <ShieldCheck size={24} /> 
          <span className="text-[10px] uppercase font-black tracking-widest">Quản Trị</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
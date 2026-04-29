// src/App.tsx -- version 2.5 (Fixed Header Responsive Layout & Line Clamp)

import { useEffect, useState, useCallback } from 'react';
import { Users, ShieldCheck, TreeDeciduous, CircleAlert, Info, Crown, Lock, Loader2 } from 'lucide-react';
import TreeView from './components/TreeView';
import { Admin } from './pages/Admin';
import About from './components/About';
import MemberForm from './components/MemberForm';

function App() {
  const [auth, setAuth] = useState<{ role: string; mod_name?: string; rootId?: string } | null>(null);
  const [isGuestLocked, setIsGuestLocked] = useState(false);
  const [guestPin, setGuestPin] = useState('');
  
  const [members, setMembers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [familyName, setFamilyName] = useState("GIA PHẢ TRỰC TUYẾN");
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [tab, setTab] = useState<'view' | 'intro' | 'admin'>('view');
  const [isInitializingRoot, setIsInitializingRoot] = useState(false);

  // 1. Tự động đếm lượt truy cập (Chạy ngầm không ảnh hưởng UI)
  useEffect(() => {
    fetch('/api/system/track', { method: 'POST' }).catch(() => {});
  }, []);

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

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const resSettings = await fetch('/api/system/settings');
      if (resSettings.ok) {
        const dataSettings = (await resSettings.json()) as any[]; 
        const settingsMap = dataSettings.reduce((acc: any, curr: any) => ({ ...acc, [curr.key]: curr.value }), {});
        setSettings(settingsMap);
        if (settingsMap.family_name) setFamilyName(settingsMap.family_name.toUpperCase());
        
        if (settingsMap.view_pin_hash && !auth) {
          setIsGuestLocked(true);
          setLoading(false);
          return;
        }
      }

      const resMembers = await fetch('/api/members');
      if (!resMembers.ok) {
        if (resMembers.status === 401) setIsGuestLocked(true);
        throw new Error("Không thể tải dữ liệu gia phả.");
      }
      
      const dataMembers = (await resMembers.json()) as any[];
      setMembers(dataMembers || []);
      setIsGuestLocked(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [auth]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleGuestLogin = async () => {
    if (!guestPin) return;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: guestPin })
      });
      const data = (await res.json()) as any;
      
      if (res.ok && data.role === 'guest') {
        setAuth({ role: 'guest', mod_name: 'Khách' });
        setIsGuestLocked(false);
        refreshData();
      } else {
        alert(data.error || "Mã PIN không hợp lệ");
      }
    } catch (err) { alert("Lỗi kết nối máy chủ"); }
  };

  const handleSaveRoot = async (formData: any, newImageBase64?: string) => {
    try {
      setLoading(true);
      let finalAvatarUrl = null;

      if (newImageBase64) {
        const blob = await (await fetch(newImageBase64)).blob();
        const uploadForm = new FormData();
        uploadForm.append('file', blob, `${formData.id}.webp`);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        const uploadData = (await uploadRes.json()) as any;
        if (uploadData.success) finalAvatarUrl = uploadData.url;
      }

      const res = await fetch('/api/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, avatar_url: finalAvatarUrl })
      });

      if (res.ok) {
        setIsInitializingRoot(false);
        refreshData();
      } else {
        const errorData = (await res.json()) as any;
        alert(errorData.error || "Lỗi khi tạo Thủy Tổ");
      }
    } catch (err) { alert("Lỗi kết nối máy chủ"); } finally { setLoading(false); }
  };

  if (isGuestLocked) {
    return (
      <div className="fixed inset-0 bg-stone-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-[#704214]/10 w-full max-w-sm space-y-6 animate-in zoom-in-95">
          <div className="inline-flex p-5 bg-[#704214]/10 text-[#704214] rounded-full"><Lock size={36} /></div>
          <div>
            <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tighter">Gia phả nội bộ</h2>
            <p className="text-[11px] mt-1 text-stone-500 font-bold uppercase tracking-widest">Yêu cầu mã truy cập từ Trưởng tộc</p>
          </div>
          <input 
            type="password" maxLength={4} placeholder="••••"
            className="w-full p-5 text-4xl text-center tracking-[1em] font-mono border-2 border-stone-200 rounded-3xl focus:border-[#704214] focus:ring-4 ring-[#704214]/10 outline-none transition-all"
            value={guestPin} onChange={(e) => setGuestPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGuestLogin()}
          />
          <button onClick={handleGuestLogin} className="w-full py-5 bg-[#704214] text-white rounded-2xl font-black uppercase shadow-xl shadow-[#704214]/30 hover:scale-105 transition-transform text-xs tracking-widest">Mở Khóa Gia Phả</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[#f8f7f5] flex flex-col overflow-hidden font-sans select-none">
      
      {/* BẢN VÁ: Tối ưu UI Header (Giới hạn 2 dòng tiêu đề, ghim nút Live sang phải) */}
      <header className="bg-white p-3 sm:p-4 shadow-sm border-b-2 border-stone-200 z-30 flex items-center justify-center relative min-h-[64px] shrink-0">
        
        {/* Khu vực Tiêu đề (Bị ép tối đa 2 dòng bằng line-clamp-2) */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 w-full max-w-[65vw] sm:max-w-2xl px-2">
          <TreeDeciduous size={24} className="text-[#704214] shrink-0" />
          <h1 className="text-base sm:text-lg font-black text-[#704214] tracking-tighter uppercase line-clamp-2 overflow-hidden leading-tight text-center">
            {familyName}
          </h1>
        </div>
        
        {/* Chốt cố định Huy hiệu Trạng thái ở góc phải */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {!isOffline ? (
            <span className="text-[9px] sm:text-[10px] bg-green-50 text-green-700 px-2 py-1.5 rounded-md font-black border border-green-200 uppercase tracking-widest shadow-sm flex items-center">
              <span className="animate-pulse inline-block mr-1">●</span> Live
            </span>
          ) : (
            <span className="text-[9px] sm:text-[10px] bg-amber-50 text-amber-700 px-2 py-1.5 rounded-md border border-amber-200 uppercase tracking-widest font-black shadow-sm flex items-center">
              📴 Offline
            </span>
          )}
        </div>

      </header>

      <main className="flex-1 relative overflow-hidden bg-[#f8f7f5]">
        {tab === 'view' ? (
          loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4">
               <Loader2 size={32} className="animate-spin text-[#704214]" />
               <p className="text-[10px] font-black uppercase text-stone-400 tracking-widest">Đang tải dữ liệu...</p>
            </div>
          ) : error ? (
            <div className="h-full flex flex-col items-center justify-center text-red-500 p-10 text-center space-y-4">
              <CircleAlert size={48} />
              <p className="font-black uppercase text-sm tracking-tight">{error}</p>
              <button onClick={refreshData} className="text-[10px] bg-stone-200 px-5 py-3 rounded-xl font-black uppercase hover:bg-stone-300 text-stone-700 shadow-sm transition-colors">Thử lại</button>
            </div>
          ) : members.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-6 space-y-8 bg-white">
              <div className="p-8 bg-amber-50 text-amber-600 rounded-full animate-bounce shadow-inner border border-amber-100"><Crown size={56} /></div>
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tighter">Gia phả trống</h2>
                <p className="text-sm font-bold text-stone-500 max-w-sm mx-auto">Cơ sở dữ liệu chưa có bất kỳ thành viên nào. Hãy bắt đầu bằng việc khởi tạo người đứng đầu gia tộc.</p>
              </div>
              <button 
                onClick={() => setIsInitializingRoot(true)} 
                className="py-5 px-10 bg-[#704214] text-white rounded-2xl font-black text-sm uppercase shadow-2xl hover:scale-105 transition-transform tracking-widest"
              >
                👑 Tạo Thủy Tổ (Đời 1)
              </button>
            </div>
          ) : (
            <TreeView members={members} />
          )
        ) : tab === 'intro' ? (
          <About aboutFamily={settings.about_family} familyPhotos={settings.family_photos ? JSON.parse(settings.family_photos) : []} />
        ) : (
          <Admin 
            onBack={() => setTab('view')} 
            globalMembers={members} 
            auth={auth} 
            setAuth={setAuth} 
            isOffline={isOffline}
            refreshData={refreshData} 
          />
        )}
      </main>

      <nav className="bg-white border-t border-stone-200 flex justify-around p-3 sm:p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.02)] z-30 relative pb-safe">
        <button onClick={() => setTab('view')} className={`flex flex-col items-center gap-1.5 transition-all ${tab === 'view' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400 hover:text-stone-600'}`}>
          <Users size={22} /> <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Cây Gia Phả</span>
        </button>
        <button onClick={() => setTab('intro')} className={`flex flex-col items-center gap-1.5 transition-all ${tab === 'intro' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400 hover:text-stone-600'}`}>
          <Info size={22} /> <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Giới Thiệu</span>
        </button>
        <button onClick={() => setTab('admin')} className={`flex flex-col items-center gap-1.5 transition-all ${tab === 'admin' ? 'text-[#704214] scale-110 font-bold' : 'text-stone-400 hover:text-stone-600'}`}>
          <ShieldCheck size={22} /> <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest">Quản Trị</span>
        </button>
      </nav>

      {isInitializingRoot && (
        <MemberForm 
          member={{ id: `P${Date.now()}`, gender: 'M', relation_status: 'biological', is_alive: 1 }} 
          allMembers={[]} isNew={true}
          onCancel={() => setIsInitializingRoot(false)}
          onSave={handleSaveRoot}
          authorInfo={{ role: 'super', name: 'Hệ thống' }}
        />
      )}
    </div>
  );
}

export default App;
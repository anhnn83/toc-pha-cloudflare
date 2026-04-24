// src/pages/Admin.tsx -- Version 5.3 (Tích hợp tính năng PWA & Chế độ Offline)

import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, CheckCircle2, 
  Loader2, ShieldAlert, X, Save, Copy, History, Clock, WifiOff
} from 'lucide-react';
import { hashPIN, decryptToken, encryptToken } from '../utils/security';
import { GitHubService } from '../utils/githubService';
import MemberForm from '../components/MemberForm';
import TreeViewAdmin from '../components/TreeViewAdmin';

interface AdminProps { 
  onBack: () => void; 
  globalMembers: any[]; 
  setGlobalMembers: React.Dispatch<React.SetStateAction<any[]>>;
  auth: { service: GitHubService; role: string; user: any; rawToken?: string } | null;
  setAuth: (auth: any) => void;
  isOffline: boolean; // Bổ sung prop nhận trạng thái mạng từ App.tsx
}

export const Admin: React.FC<AdminProps> = ({ onBack, globalMembers, setGlobalMembers, auth, setAuth, isOffline }) => {
  const [pin, setPin] = useState('');
  const [config, setConfig] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [editingMember, setEditingMember] = useState<any>(null);
  const [formMode, setFormMode] = useState<'edit' | 'add' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [loadingText, setLoadingText] = useState("Đang xử lý...");

  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);
  const [tempName, setTempName] = useState("");
  const [tempAbout, setTempAbout] = useState("");
  const [tempPhotos, setTempPhotos] = useState<{url: string, caption: string}[]>([]);

  const [modModal, setModModal] = useState<{
    isOpen: boolean; member: any; step: 1 | 2; modName: string; generatedPin: string;
  }>({ isOpen: false, member: null, step: 1, modName: "", generatedPin: "" });

  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const getActionAuthor = () => auth?.role === 'super' ? 'TRƯỞNG TỘC' : `MOD: ${auth?.user?.name}`;

  useEffect(() => {
    fetch('/config.json')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(() => setError("Lỗi tải cấu hình!"));
  }, []);

  const handleLogin = () => {
    if (!config) return;
    if (isOffline) {
      setError("Vui lòng kết nối mạng để đăng nhập!");
      return;
    }

    const hashedInput = hashPIN(pin);
    let role = '';
    let userData = null;

    if (config.permissions.super.includes(hashedInput)) {
      role = 'super';
    } else if (config.permissions.mods?.[hashedInput]) {
      role = 'mod';
      userData = config.permissions.mods[hashedInput];
    }

    if (role) {
      const tokenToDecrypt = (role === 'mod' && userData.token) ? userData.token : config.auth.encryptedToken;
      const rawToken = decryptToken(tokenToDecrypt, pin, config.auth.salt);
      
      if (rawToken) {
        setAuth({ service: new GitHubService(rawToken), role, user: userData, rawToken });
        setError(null);
        setPin('');
      } else { setError("Mã PIN không thể giải mã!"); }
    } else { setError("Mã PIN không đúng!"); }
  };

  const handleOpenLogs = async () => {
    // Chặn nếu ngoại tuyến
    if (!auth || isOffline) {
      alert("Tính năng xem lịch sử yêu cầu kết nối mạng!");
      return; 
    }
    setIsLoadingLogs(true);
    setIsLogModalOpen(true);
    try {
      const commits = await auth.service.getCommits('data.json', 30);
      setAuditLogs(commits);
    } catch (err) {
      alert("Không thể tải lịch sử!");
      setIsLogModalOpen(false);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const handleSaveMember = async (updatedData: any, newImageBase64?: string) => {
    if (!auth || isOffline) return; // Bảo vệ API
    setIsSaving(true);
    setLoadingText("Đang đồng bộ cây...");

    try {
      let finalMember = { ...updatedData };
      let newFullList = [...globalMembers];

      if (newImageBase64) {
        const imagePath = `src/assets/images/${finalMember.id}.webp`;
        await auth.service.updateFile(imagePath, newImageBase64.split(',')[1], undefined, `[Ảnh] Cập nhật: ${finalMember.fullName}`);
      }
      finalMember.avatarUrl = `/src/assets/images/${finalMember.id}.webp`;

      if (finalMember.relationType === 'in_law' && finalMember._bloodlineSpouseId) {
        const bloodlineId = finalMember._bloodlineSpouseId;
        const marriageStatus = finalMember._marriageStatus || 'current';
        newFullList = newFullList.map(m => {
          if (m.id === bloodlineId) {
            const existingSpouses = m.spouses || [];
            const isAlreadyIn = existingSpouses.some((s: any) => s.id === finalMember.id);
            if (isAlreadyIn) {
              return { ...m, spouses: existingSpouses.map((s: any) => s.id === finalMember.id ? { ...s, status: marriageStatus } : s) };
            } else {
              return { ...m, spouses: [...existingSpouses, { id: finalMember.id, status: marriageStatus, type: existingSpouses.length + 1 }] };
            }
          }
          return m;
        });
        delete finalMember._marriageStatus;
        delete finalMember._bloodlineSpouseId;
      }

      const exists = newFullList.find(m => m.id === finalMember.id);
      if (exists) newFullList = newFullList.map(m => m.id === finalMember.id ? finalMember : m);
      else newFullList.push(finalMember);

      const currentFile = await auth.service.getFile('data.json');
      const logMessage = `[${exists ? "Sửa" : "Thêm"}] ${finalMember.fullName} - Bởi: ${getActionAuthor()}`;
      await auth.service.updateFile('data.json', { ...currentFile?.content, members: newFullList }, currentFile?.sha, logMessage);

      setGlobalMembers(newFullList);
      setEditingMember(null);
      setFormMode(null);
      alert("✅ Đã lưu thành công!");
    } catch (err: any) { alert("Lỗi: " + err.message); }
    finally { setIsSaving(false); }
  };

  const handleDeleteMember = async (id: string) => {
    if (!auth || isOffline) return; // Bảo vệ API
    const hasChildren = globalMembers.some(m => m.parents?.fatherId === id || m.parents?.motherId === id);
    if (hasChildren) { alert("⛔ KHÔNG THỂ XÓA: Thành viên này đang có con!"); return; }

    setIsSaving(true);
    setLoadingText("Đang xóa dữ liệu...");
    try {
      const currentFile = await auth.service.getFile('data.json');
      const memberToDelete = globalMembers.find(m => m.id === id);
      let updatedList = globalMembers.filter(m => m.id !== id).map(m => ({
        ...m, spouses: m.spouses?.filter((s: any) => s.id !== id)
      }));

      await auth.service.updateFile('data.json', { ...currentFile?.content, members: updatedList }, currentFile?.sha, `[Xóa] ${memberToDelete?.fullName} - Bởi: ${getActionAuthor()}`);
      setGlobalMembers(updatedList);
      setEditingMember(null);
      setFormMode(null);
      alert("🗑️ Đã xóa thành công.");
    } catch (err) { alert("Lỗi khi xóa!"); }
    finally { setIsSaving(false); }
  };

  const handleAddRelative = (parent: any, type: 'child' | 'spouse') => {
    const newMember: any = {
      id: '', fullName: '', relationType: type === 'child' ? 'biological' : 'in_law',
      gender: type === 'child' ? 'M' : (parent.gender === 'M' ? 'F' : 'M'),
    };
    if (type === 'child') {
      const bId = parent.relationType === 'in_law' ? globalMembers.find(m => m.spouses?.some((s:any) => s.id === parent.id))?.id : parent.id;
      newMember.parents = { fatherId: parent.gender === 'M' ? parent.id : '', motherId: parent.gender === 'F' ? parent.id : '' };
      newMember.siblingRank = globalMembers.filter(m => m.parents?.fatherId === bId || m.parents?.motherId === bId).length + 1;
    } else {
      newMember.spouses = [{ id: parent.id, status: 'current' }];
    }
    setFormMode('add');
    setEditingMember(newMember);
  };

  const handleManageRole = async (member: any, isAssigned: boolean) => {
    if (!auth || auth.role !== 'super' || isOffline) return;
    if (isAssigned) {
      if (!window.confirm(`Xác nhận THU HỒI quyền của [${member.fullName}]?`)) return;
      setIsSaving(true);
      try {
        const configFile = await auth.service.getFile('config.json');
        const newConfig = JSON.parse(JSON.stringify(configFile?.content || config));
        const currentMods = newConfig.permissions.mods;
        const modHashKey = Object.keys(currentMods).find(key => currentMods[key].rootId === member.id);
        
        if (modHashKey) {
          delete currentMods[modHashKey]; 
          await auth.service.updateFile('config.json', newConfig, configFile?.sha, `[Thu hồi] Mod: ${member.fullName} - Bởi: TRƯỞNG TỘC`);
          setConfig(newConfig); 
          alert("✅ Đã thu hồi quyền.");
        }
      } catch (err) { alert("Lỗi cập nhật!"); } finally { setIsSaving(false); }
    } else {
      setModModal({ isOpen: true, member, step: 1, modName: "", generatedPin: "" });
    }
  };

  const handleCreateModSubmit = async () => {
    if (!auth || !auth.rawToken || isOffline) return;
    setIsSaving(true);
    try {
      const newPin = Math.floor(100000 + Math.random() * 900000).toString();
      const encryptedTokenForMod = encryptToken(auth.rawToken, newPin, config.auth.salt);
      const configFile = await auth.service.getFile('config.json');
      const newConfig = JSON.parse(JSON.stringify(configFile?.content || config));
      
      newConfig.permissions.mods[hashPIN(newPin)] = { 
        rootId: modModal.member.id, name: modModal.modName, token: encryptedTokenForMod 
      };
      
      await auth.service.updateFile('config.json', newConfig, configFile?.sha, `[Cấp quyền] Mod: ${modModal.modName} - Bởi: TRƯỞNG TỘC`);
      setConfig(newConfig); 
      setModModal({ ...modModal, step: 2, generatedPin: newPin });
    } catch (err) { alert("Lỗi cấp quyền!"); } finally { setIsSaving(false); }
  };

  const handleCloudBackup = async () => {
    if (!auth || auth.role !== 'super' || isOffline) return;
    setIsSaving(true);
    try {
      const path = `src/backups/data_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      await auth.service.updateFile(path, { members: globalMembers }, undefined, `[Backup] Bởi: TRƯỞNG TỘC`);
      alert(`✅ Đã sao lưu Cloud!`);
    } catch (err) { alert("Lỗi sao lưu!"); } finally { setIsSaving(false); }
  };

  const handleExportJSON = () => {
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(JSON.stringify({ members: globalMembers }, null, 2));
    const link = document.createElement('a');
    link.setAttribute('href', dataUri);
    link.setAttribute('download', `giapha_${new Date().toISOString().split('T')[0]}.json`);
    link.click();
  };

  const handleSaveFamilySettings = async (about: string, name: string, photos: any[]) => {
    if (!auth || isOffline) return;
    setIsSaving(true);
    try {
      const currentFile = await auth.service.getFile('data.json');
      const updatedData = { ...currentFile?.content, metadata: { ...currentFile?.content?.metadata, aboutFamily: about, familyName: name, familyPhotos: photos.filter(p => p.url.trim() !== "") } };
      await auth.service.updateFile('data.json', updatedData, currentFile?.sha, `[Cài đặt] Cập nhật Tộc phả - Bởi: TRƯỞNG TỘC`);
      setGlobalMembers(updatedData.members); 
      setIsFamilyModalOpen(false);
      alert("✅ Đã cập nhật!");
      window.location.reload(); 
    } catch (err) { alert("Lỗi cập nhật!"); } finally { setIsSaving(false); }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!auth || auth.role !== 'super' || !e.target.files?.[0] || isOffline) return;
    if (!window.confirm("⚠️ CẢNH BÁO: Hành động này sẽ GHI ĐÈ toàn bộ dữ liệu. Tiếp tục?")) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        setIsSaving(true);
        const currentFile = await auth.service.getFile('data.json');
        await auth.service.updateFile('data.json', data, currentFile?.sha, `[Khôi phục] Dữ liệu từ File - Bởi: TRƯỞNG TỘC`);
        setGlobalMembers(data.members); alert("✅ Khôi phục thành công!");
      } catch (err) { alert("Lỗi tệp!"); } finally { setIsSaving(false); }
    };
    reader.readAsText(e.target.files[0]);
  };

  if (!auth) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-stone-50">
        <div className="w-full max-w-sm space-y-6 text-center animate-in fade-in">
          <div className="inline-flex p-5 bg-[#704214]/10 rounded-full text-[#704214]"><Lock size={32} /></div>
          <h2 className="text-2xl font-black text-stone-800 uppercase tracking-tight">Xác thực Quản trị</h2>
          <input type="password" maxLength={6} className="w-full p-5 text-4xl text-center font-mono tracking-[0.5em] border-2 border-stone-200 rounded-3xl focus:border-[#704214] outline-none" placeholder="••••••" value={pin} onChange={(e) => setPin(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
          {error && <div className="text-red-600 text-xs font-bold bg-red-50 p-3 rounded-xl">{error}</div>}
          <div className="flex gap-3">
            <button onClick={onBack} className="flex-1 py-4 bg-stone-200 text-stone-600 rounded-2xl font-bold uppercase text-xs">Quay lại</button>
            <button onClick={handleLogin} className="flex-[2] py-4 bg-[#704214] text-white rounded-2xl font-black shadow-lg uppercase text-xs tracking-widest">Đăng nhập</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f8f7f5] overflow-hidden text-stone-800">
      <div className="p-4 border-b flex justify-between items-center bg-white shadow-sm z-20 overflow-x-auto custom-scrollbar">
        <div className="flex items-center gap-3 shrink-0 mr-4">
          <div className={`p-2 rounded-full ${isOffline ? 'bg-amber-100 text-amber-600' : 'text-green-600 bg-green-100'}`}>
            {isOffline ? <WifiOff size={18} /> : <CheckCircle2 size={18} />}
          </div>
          <div>
            <p className={`text-[9px] font-black uppercase leading-none ${isOffline ? 'text-amber-500' : 'text-stone-400'}`}>
              {isOffline ? 'Offline Mode' : 'Cloud Connected'}
            </p>
            <p className="text-sm font-bold text-[#704214]">{auth.role === 'super' ? '🚩 TRƯỞNG TỘC' : `🌿 QUẢN TRỊ NHÁNH: ${auth.user.name}`}</p>
          </div>
        </div>

        {/* Khối quản lý sẽ bị mờ và không thể click nếu mất mạng */}
        <div className={`flex gap-2 border-x px-4 border-stone-200 shrink-0 transition-opacity duration-300 ${isOffline ? 'opacity-40 pointer-events-none' : ''}`}>
          <button onClick={handleOpenLogs} className="px-3 py-2 bg-stone-100 text-stone-700 rounded-lg font-bold text-[10px] uppercase hover:bg-stone-200 transition-colors flex items-center gap-1">
            <History size={14} /> Lịch sử
          </button>
          {auth.role === 'super' && (
            <>
              <button onClick={handleCloudBackup} className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg font-bold text-[10px] uppercase hover:bg-blue-100 transition-colors hidden md:block">☁️ Backup Cloud</button>
              <button onClick={async () => {
                  setIsSaving(true);
                  try {
                    const file = await auth.service.getFile('data.json');
                    const meta = file?.content?.metadata || {};
                    setTempName(meta.familyName || "GIA PHẢ");
                    setTempAbout(meta.aboutFamily || "");
                    setTempPhotos(meta.familyPhotos || []);
                    setIsFamilyModalOpen(true);
                  } finally { setIsSaving(false); }
                }} className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg font-bold text-[10px] uppercase hover:bg-purple-100 transition-colors">⚙️ Thông tin chung</button>
              <button onClick={handleExportJSON} className="px-3 py-2 bg-amber-50 text-amber-600 rounded-lg font-bold text-[10px] uppercase hover:bg-amber-100 transition-colors hidden sm:block">📥 Lưu DB về máy</button>
              <label className="px-3 py-2 bg-red-50 text-red-600 rounded-lg font-bold text-[10px] uppercase hover:bg-red-100 transition-colors cursor-pointer hidden sm:block">
                📤 Khôi Phục <input type="file" accept=".json" className="hidden" onChange={handleImportJSON} />
              </label>
            </>
          )}
        </div>

        <button onClick={() => setAuth(null)} className="flex items-center gap-2 ml-4 px-4 py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs uppercase tracking-tighter transition-colors hover:bg-red-100 shrink-0">
           <LogOut size={16} /> Thoát
        </button>
      </div>

      <div className="flex-1 relative w-full h-full overflow-hidden">
         <TreeViewAdmin 
            members={globalMembers} config={config} currentUserRole={auth.role}
            allowedRootId={auth.role === 'super' ? null : auth.user.rootId}
            onEdit={(m: any) => { 
              if (isOffline) { alert("Vui lòng kết nối mạng để chỉnh sửa!"); return; } // Chặn mở Form khi offline
              setFormMode('edit'); setEditingMember(m); 
            }}
            onAddRelative={(p: any, t: any) => { 
              if (isOffline) { alert("Vui lòng kết nối mạng để thêm thành viên!"); return; } // Chặn mở Form khi offline
              handleAddRelative(p, t); 
            }}
            onManageRole={(m: any, a: boolean) => { 
              if (isOffline) { alert("Vui lòng kết nối mạng để thao tác!"); return; } // Chặn mở Form khi offline
              handleManageRole(m, a); 
            }}
         />
         {auth.role === 'mod' && (
           <div className="absolute top-4 right-4 bg-amber-100 border border-amber-200 p-3 rounded-2xl flex items-center gap-2 shadow-sm pointer-events-none z-10 text-[10px] font-bold text-amber-800 uppercase">
              <ShieldAlert size={16} /> Nhánh: {auth.user.rootId}
           </div>
         )}
      </div>

      {editingMember && (
        <MemberForm 
          member={editingMember} allMembers={globalMembers} isNew={formMode !== 'edit'} 
          onCancel={() => { setEditingMember(null); setFormMode(null); }}
          onSave={handleSaveMember} 
          onDelete={handleDeleteMember}
          authorInfo={{ role: auth.role, name: auth.user?.name }}
        />
      )}

      {/* FORM CÀI ĐẶT TỘC PHẢ */}
      {isFamilyModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95">
             <div className="p-8 border-b bg-stone-50 flex justify-between items-center shrink-0">
              <h3 className="font-black text-xl text-stone-800 uppercase tracking-tighter">Thông tin dòng tộc</h3>
              <button onClick={() => setIsFamilyModalOpen(false)} className="p-2 text-stone-400 hover:text-red-500 transition-colors"><X size={24}/></button>
            </div>
            <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
              <input type="text" value={tempName} onChange={(e) => setTempName(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-200 font-black text-stone-800 uppercase outline-none focus:ring-2 ring-purple-500" placeholder="Tên Tộc phả" />
              <textarea rows={4} value={tempAbout} onChange={(e) => setTempAbout(e.target.value)} className="w-full p-4 bg-stone-50 rounded-2xl border border-stone-200 text-sm text-stone-700 outline-none focus:ring-2 ring-purple-500" placeholder="Giới thiệu"></textarea>
              <div className="space-y-3 pt-4 border-t border-stone-200">
                <div className="flex justify-between items-center"><label className="text-[10px] font-black text-stone-500 uppercase">Album ({tempPhotos.length}/10)</label><button onClick={() => setTempPhotos([...tempPhotos, { url: "", caption: "" }])} className="text-purple-600 bg-purple-50 px-2 py-1 rounded-md text-[10px] font-bold uppercase">+ Thêm</button></div>
                {tempPhotos.map((p, idx) => (
                  <div key={idx} className="p-3 bg-stone-50 rounded-xl border border-stone-200 space-y-2">
                    <div className="flex gap-2"><input type="text" value={p.url} onChange={(e) => { const n = [...tempPhotos]; n[idx].url = e.target.value; setTempPhotos(n); }} className="flex-1 p-2 bg-white rounded-lg border text-xs outline-none" placeholder="URL" /><button onClick={() => setTempPhotos(tempPhotos.filter((_, i) => i !== idx))} className="text-red-400"><X size={16}/></button></div>
                    <input type="text" value={p.caption} onChange={(e) => { const n = [...tempPhotos]; n[idx].caption = e.target.value; setTempPhotos(n); }} className="w-full p-2 bg-white rounded-lg border text-[10px] italic outline-none" placeholder="Chú thích" />
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 border-t bg-stone-50 flex gap-3 shrink-0"><button onClick={() => setIsFamilyModalOpen(false)} className="flex-1 py-4 bg-stone-200 text-stone-600 rounded-2xl font-black uppercase text-xs">Hủy</button><button onClick={() => handleSaveFamilySettings(tempAbout, tempName, tempPhotos)} className="flex-[2] py-4 bg-purple-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-purple-700 transition-all flex items-center justify-center gap-2"><Save size={18} /> Lưu</button></div>
          </div>
        </div>
      )}

      {/* MODAL PHÂN QUYỀN */}
      {modModal.isOpen && (
        <div className="fixed inset-0 z-[160] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-6 border-b bg-stone-50 flex justify-between items-center"><h3 className="font-black text-lg uppercase tracking-tighter">Phân quyền</h3>{modModal.step === 1 && <button onClick={() => setModModal({ ...modModal, isOpen: false })}><X size={20}/></button>}</div>
            {modModal.step === 1 ? (
              <div className="p-6 space-y-6">
                <p className="text-xs font-bold text-blue-800 bg-blue-50 p-3 rounded-xl">Nhánh: {modModal.member?.fullName}</p>
                <input type="text" value={modModal.modName} onChange={(e) => setModModal({...modModal, modName: e.target.value})} placeholder="Tên Quản trị..." className="w-full p-4 bg-stone-50 rounded-2xl border text-sm font-bold outline-none focus:ring-2 ring-blue-500" />
                <button onClick={handleCreateModSubmit} disabled={!modModal.modName.trim()} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg disabled:opacity-50">Tạo Mã</button>
              </div>
            ) : (
              <div className="p-8 space-y-6 text-center">
                <div className="text-5xl font-mono tracking-widest font-black text-blue-600 bg-blue-50 py-4 rounded-3xl border-2 border-blue-200">{modModal.generatedPin}</div>
                <p className="text-[10px] text-red-600 font-bold italic">Lưu ý: Mã này chỉ hiển thị MỘT LẦN DUY NHẤT!</p>
                <button onClick={() => { navigator.clipboard.writeText(modModal.generatedPin); alert('Đã copy!'); }} className="w-full py-4 bg-stone-100 rounded-2xl font-black uppercase text-xs flex items-center justify-center gap-2"><Copy size={16}/> Copy Mã PIN</button>
                <button onClick={() => setModModal({ ...modModal, isOpen: false })} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs">Xong</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL LỊCH SỬ (Audit Log) */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            <div className="p-6 border-b bg-stone-50 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3"><History size={20} /><h3 className="font-black text-lg uppercase tracking-tighter">Lịch sử Thao tác</h3></div>
              <button onClick={() => setIsLogModalOpen(false)}><X size={24}/></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-stone-50/50">
              {isLoadingLogs ? <div className="py-10 text-center animate-pulse uppercase text-xs font-bold">Đang tải...</div> : (
                <div className="space-y-3">
                  {auditLogs.map((log: any, idx: number) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border shadow-sm flex items-start gap-4">
                      <Clock size={16} className="text-stone-400 mt-1 shrink-0" />
                      <div><p className="text-sm font-bold text-stone-800 leading-tight">{log.commit?.message}</p><p className="text-[10px] text-stone-400 font-black uppercase mt-1">{new Date(log.commit?.author?.date).toLocaleString('vi-VN')}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[300] bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-blue-600 mb-4" size={48} />
          <p className="font-black text-blue-800 uppercase text-xs tracking-widest">{loadingText}</p>
        </div>
      )}
    </div>
  );
};
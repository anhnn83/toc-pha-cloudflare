// src/pages/Admin.tsx -- version 3.8 (Data Integrity Constraints for Soft Delete)

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Lock, Unlock, LogOut, Loader2, X, History, Clock, Trash2, 
  RefreshCcw, Database, ShieldCheck, Download, 
  Upload, Image as ImageIcon, LayoutDashboard, Save, Key, UploadCloud, Plus
} from 'lucide-react';
import MemberForm from '../components/MemberForm';
import TreeViewAdmin from '../components/TreeViewAdmin';

interface AdminProps { 
  onBack: () => void; 
  globalMembers: any[]; 
  auth: { role: string; mod_name?: string; rootId?: string } | null;
  setAuth: (auth: any) => void;
  isOffline: boolean;
  refreshData: () => Promise<void>;
}

type AdminTab = 'tree' | 'security' | 'system' | 'about';

export const Admin: React.FC<AdminProps> = ({ 
  onBack, globalMembers, auth, setAuth, isOffline, refreshData 
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const [activeTab, setActiveTab] = useState<AdminTab>('tree');
  const [editingMember, setEditingMember] = useState<any>(null);
  const [formMode, setFormMode] = useState<'edit' | 'add' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [systemData, setSystemData] = useState<any>(null);
  const [aboutData, setAboutData] = useState({ family_name: '', intro: '', photos: [] as any[] });
  const [securityData, setSecurityData] = useState({ guestPin: '', smPin: '', newMod: { name: '', pin: '', rootId: '' } });

  const [showPhotoForm, setShowPhotoForm] = useState(false);
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [newPhotoPreview, setNewPhotoPreview] = useState<string | null>(null);
  const [newPhotoCaption, setNewPhotoCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleLogin = async () => {
    if (isOffline) { setError("Vui lòng kết nối mạng để đăng nhập!"); return; }
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin })
      });
      const data = await res.json() as { role: string; mod_name?: string; branch_root_id?: string; error?: string };
      if (res.ok) {
        setAuth({ role: data.role, mod_name: data.mod_name, rootId: data.branch_root_id });
        setPin('');
        setError(null);
      } else {
        setError(data.error || "Mã PIN không chính xác");
      }
    } catch (err) { setError("Lỗi kết nối máy chủ"); }
  };

  const fetchSystemInfo = useCallback(async () => {
    if (auth?.role !== 'sm' || isOffline) return;
    try {
      const res = await fetch('/api/system');
      if (res.ok) {
        const data: any = await res.json();
        setSystemData(data);
        const familyName = data.settings?.find((s: any) => s.key === 'family_name')?.value || 'GIA PHẢ TRỰC TUYẾN';
        const about = data.settings?.find((s: any) => s.key === 'about_family')?.value || '';
        const photos = JSON.parse(data.settings?.find((s: any) => s.key === 'family_photos')?.value || '[]');
        setAboutData({ family_name: familyName, intro: about, photos });
      }
    } catch (err) { console.error("Lỗi tải dữ liệu hệ thống"); }
  }, [auth, isOffline]);

  useEffect(() => {
    if (auth?.role === 'sm') fetchSystemInfo();
  }, [auth, fetchSystemInfo, activeTab]);

  const handleSaveMember = async (formData: any, newImageBase64?: string) => {
    setIsSaving(true);
    try {
      let finalAvatarUrl = formData.avatar_url;
      if (newImageBase64) {
        const blob = await (await fetch(newImageBase64)).blob();
        const uploadForm = new FormData();
        uploadForm.append('file', blob, `${formData.id}.webp`);
        const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
        const uploadData = await uploadRes.json() as { success?: boolean; url?: string };
        if (uploadData.success && uploadData.url) finalAvatarUrl = uploadData.url;
      }

      const url = formMode === 'add' ? '/api/members' : `/api/members/${formData.id}`;
      const res = await fetch(url, {
        method: formMode === 'add' ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, avatar_url: finalAvatarUrl })
      });

      if (res.ok) {
        await refreshData();
        setEditingMember(null);
        setFormMode(null);
      } else {
        const err = await res.json() as { error?: string };
        alert(err.error || "Lỗi xử lý");
      }
    } catch (err) { alert("Lỗi kết nối"); } finally { setIsSaving(false); }
  };

  const handleDeleteMember = async (id: string) => {
    // --- BẢN VÁ: RÀNG BUỘC KIỂM TRA PHỤ THUỘC (TRÁNH MỒ CÔI DỮ LIỆU) ---
    const target = globalMembers.find(m => m.id === id);
    if (target) {
        // 1. Kiểm tra nếu là Trực hệ, có Dâu/Rể bám theo không?
        if (target.relation_status !== 'in_law' && target.spouses && target.spouses.length > 0) {
            alert("LỖI BẢO VỆ DỮ LIỆU:\nThành viên này đang có Dâu/Rể liên kết. Vui lòng xóa hồ sơ Dâu/Rể trước để tránh dữ liệu bị mồ côi!");
            return;
        }
        // 2. Kiểm tra có con cái không?
        const hasChildren = globalMembers.some(m => m.father_id === id || m.mother_id === id);
        if (hasChildren) {
            alert("LỖI BẢO VỆ DỮ LIỆU:\nThành viên này đang có con cái. Vui lòng xóa hồ sơ các con trước!");
            return;
        }
    }

    if (!window.confirm("Chuyển thành viên này vào thùng rác?")) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/members/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await refreshData();
        setEditingMember(null);
        setFormMode(null);
      } else {
        const err = await res.json() as { error?: string };
        alert(err.error || "Không thể xóa");
      }
    } catch (err) { alert("Lỗi kết nối"); } finally { setIsSaving(false); }
  };

  const handleSecurityAction = async (action: string, payload: any) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/system/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload })
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        if (action === 'UPDATE_FAMILY_NAME') await refreshData();
        fetchSystemInfo();
        return true; 
      } else {
        alert(data.error || "Lỗi xử lý");
        return false;
      }
    } finally { setIsSaving(false); }
  };

  const handleBackup = async () => {
    try {
      const res = await fetch('/api/system/backup');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `giapha_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
      }
    } catch (err) { alert("Lỗi tải bản sao lưu"); }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !window.confirm("CẢNH BÁO: Dữ liệu hiện tại sẽ bị xóa sạch và thay thế bằng file này. Tiếp tục?")) return;
    
    setIsSaving(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const content = JSON.parse(event.target?.result as string);
        const res = await fetch('/api/system/restore', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(content)
        });
        if (res.ok) {
          alert("Khôi phục hoàn tất!");
          window.location.reload();
        } else alert("Lỗi khôi phục dữ liệu");
      };
      reader.readAsText(file);
    } finally { setIsSaving(false); }
  };

  const handleSelectNewPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (event) => setNewPhotoPreview(event.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleUploadPhoto = async () => {
    if (!newPhotoFile) return alert("Vui lòng chọn ảnh!");
    setIsSaving(true);
    try {
      const uploadForm = new FormData();
      uploadForm.append('file', newPhotoFile, newPhotoFile.name);
      
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: uploadForm });
      const uploadData = await uploadRes.json() as { success?: boolean; url?: string; error?: string };
      
      if (!uploadData.success || !uploadData.url) {
        alert(uploadData.error || "Tải ảnh thất bại.");
        return;
      }

      const updatedPhotos = [...aboutData.photos, { url: uploadData.url, caption: newPhotoCaption }];
      
      const res = await fetch('/api/system/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_FAMILY_PHOTOS', payload: { photos: updatedPhotos } })
      });
      
      if (res.ok) {
        setAboutData(prev => ({ ...prev, photos: updatedPhotos }));
        setShowPhotoForm(false);
        setNewPhotoFile(null);
        setNewPhotoPreview(null);
        setNewPhotoCaption('');
        fetchSystemInfo();
      } else {
        alert("Lỗi cập nhật danh sách ảnh!");
      }
    } catch (err) {
      alert("Lỗi kết nối");
    } finally {
      setIsSaving(false);
    }
  };

  if (!auth || auth.role === 'guest') {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 bg-stone-50">
        <div className="w-full max-w-sm space-y-8 text-center animate-in fade-in zoom-in-95">
          <div className="inline-flex p-6 bg-[#704214]/10 rounded-3xl text-[#704214] border-2 border-[#704214]/20 shadow-inner"><Lock size={40} /></div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-stone-800 uppercase tracking-tighter">Quản trị viên</h2>
            <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Xác thực mã PIN để tiếp tục</p>
          </div>
          <input 
            type="password" maxLength={6} placeholder="••••••"
            className="w-full p-6 text-5xl text-center font-mono tracking-[0.5em] border-2 border-stone-200 rounded-[2rem] focus:border-[#704214] focus:ring-4 ring-[#704214]/10 outline-none transition-all"
            value={pin} onChange={(e) => setPin(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
          {error && <div className="text-red-600 text-xs font-black bg-red-50 p-4 rounded-2xl border border-red-100">{error}</div>}
          <div className="flex gap-4">
            <button onClick={onBack} className="flex-1 py-5 bg-stone-200 text-stone-600 rounded-2xl font-black uppercase text-xs hover:bg-stone-300 transition-colors">Hủy bỏ</button>
            <button onClick={handleLogin} className="flex-[2] py-5 bg-[#704214] text-white rounded-2xl font-black shadow-xl shadow-[#704214]/30 uppercase text-xs tracking-widest hover:scale-105 active:scale-95 transition-all">Đăng nhập</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#f8f7f5] overflow-hidden">
      <div className="px-6 py-4 border-b flex flex-wrap justify-between items-center bg-white shadow-sm z-30 gap-4">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
          <button onClick={() => setActiveTab('tree')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'tree' ? 'bg-[#704214] text-white shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}><Database size={14} /> Cây Gia Phả</button>
          
          {auth.role === 'sm' && (
            <>
              <button onClick={() => setActiveTab('security')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-blue-700 text-white shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}><ShieldCheck size={14} /> Mod & Bảo mật</button>
              <button onClick={() => setActiveTab('about')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'about' ? 'bg-pink-700 text-white shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}><ImageIcon size={14} /> Trang Giới thiệu</button>
              <button onClick={() => setActiveTab('system')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'system' ? 'bg-stone-800 text-white shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}><LayoutDashboard size={14} /> Hệ thống</button>
            </>
          )}

          {auth.role === 'mod' && (
            <button onClick={() => setActiveTab('security')} className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all whitespace-nowrap ${activeTab === 'security' ? 'bg-blue-700 text-white shadow-lg' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}><Key size={14} /> Đổi mã PIN</button>
          )}
        </div>
        
        <div className="flex items-center gap-4 ml-auto">
            <div className="text-right hidden sm:block">
                <p className="text-[10px] font-black text-stone-400 uppercase leading-none">Xin chào,</p>
                <p className="text-xs font-black text-stone-800 uppercase tracking-tighter">
                  {auth?.mod_name || (auth?.role === 'sm' ? 'Trưởng Tộc' : 'Mod Nhánh')}
                </p>
            </div>
            <button onClick={() => { if(window.confirm("Xác nhận đăng xuất?")) setAuth(null); }} className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors" title="Đăng xuất"><LogOut size={20} /></button>
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        {activeTab === 'tree' && (
          <TreeViewAdmin 
            members={globalMembers} currentUserRole={auth.role} allowedRootId={auth.rootId || null}
            onEdit={(m) => { setFormMode('edit'); setEditingMember(m); }}
            onAddRelative={(parent, type) => {
              const newM: any = { id: '', relation_status: type === 'child' ? 'biological' : 'in_law', gender: type === 'spouse' ? (parent.gender === 'M' ? 'F' : 'M') : 'M' };
              if (type === 'child') parent.gender === 'M' ? newM.father_id = parent.id : newM.mother_id = parent.id;
              else newM._bloodlineSpouseId = parent.id;
              setFormMode('add'); setEditingMember(newM);
            }}
            onManageRole={(m) => { setActiveTab('security'); setSecurityData(prev => ({ ...prev, newMod: { ...prev.newMod, rootId: m.id, name: m.full_name } })); }} 
          />
        )}

        {activeTab === 'security' && (
          <div className="h-full overflow-y-auto p-6 space-y-10 custom-scrollbar max-w-5xl mx-auto">
            
            {auth.role === 'sm' ? (
              <>
                <section className="space-y-4">
                  <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2"><ShieldCheck size={16}/> Quản lý Mod Nhánh</h3>
                  <div className="bg-white rounded-3xl border shadow-sm overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-stone-50 border-b">
                        <tr>
                          <th className="p-4 text-[9px] font-black text-stone-400 uppercase">Tên Mod / Nhánh</th>
                          <th className="p-4 text-[9px] font-black text-stone-400 uppercase text-center">Mã PIN</th>
                          <th className="p-4 text-[9px] font-black text-stone-400 uppercase text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {systemData?.mods?.map((m: any) => (
                          <tr key={m.id} className="hover:bg-stone-50/50 transition-colors">
                            <td className="p-4">
                              <p className="font-black text-stone-800 text-sm">{m.mod_name}</p>
                              <p className="text-[10px] text-stone-400 uppercase">Gốc nhánh: {m.branch_root_id}</p>
                            </td>
                            <td className="p-4 text-center font-mono text-xs text-stone-400">••••••</td>
                            <td className="p-4 text-right flex justify-end gap-2">
                               <button onClick={() => { const p = prompt("Nhập mã PIN 6 số mới cho Mod:"); if(p) handleSecurityAction('CHANGE_MOD_PIN', { id: m.id, pin: p }); }} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><Key size={14}/></button>
                               <button onClick={() => { if(window.confirm(`Thu hồi quyền Mod của ${m.mod_name}?`)) handleSecurityAction('REVOKE_MOD', { id: m.id }); }} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><Trash2 size={14}/></button>
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-blue-50/30">
                            <td className="p-4">
                                <input type="text" placeholder="Tên Mod..." className="w-full bg-white p-2 rounded-lg text-xs border border-blue-100 outline-none" value={securityData.newMod.name} onChange={e => setSecurityData({...securityData, newMod: {...securityData.newMod, name: e.target.value}})} />
                            </td>
                            <td className="p-4">
                                <input type="password" maxLength={6} placeholder="6 số..." className="w-24 mx-auto block bg-white p-2 rounded-lg text-xs border border-blue-100 text-center font-mono outline-none" value={securityData.newMod.pin} onChange={e => setSecurityData({...securityData, newMod: {...securityData.newMod, pin: e.target.value}})} />
                            </td>
                            <td className="p-4 text-right">
                                <button onClick={() => { if(!securityData.newMod.name || securityData.newMod.pin.length < 6) return alert("Vui lòng nhập đủ tên và 6 số PIN"); handleSecurityAction('ADD_MOD', securityData.newMod); }} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase shadow-lg">Cấp quyền</button>
                            </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(() => {
                        const isGuestPinActive = !!systemData?.settings?.find((s: any) => s.key === 'view_pin_hash')?.value;
                        return (
                            <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xs font-black text-stone-400 uppercase flex items-center gap-2">
                                        {isGuestPinActive ? <Lock size={16} className="text-red-500" /> : <Unlock size={16} className="text-green-500" />}
                                        View PIN (Khách)
                                    </h3>
                                    {isGuestPinActive ? (
                                        <span className="text-[9px] font-black bg-red-50 text-red-600 px-2 py-1 rounded uppercase tracking-widest">Đang khóa</span>
                                    ) : (
                                        <span className="text-[9px] font-black bg-green-50 text-green-600 px-2 py-1 rounded uppercase tracking-widest">Mở tự do</span>
                                    )}
                                </div>
                                
                                <input 
                                    type="password" maxLength={4} 
                                    className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl text-2xl text-center tracking-[1em] font-mono outline-none focus:border-stone-400 transition-colors" 
                                    placeholder={isGuestPinActive ? "••••" : "••••"} 
                                    value={securityData.guestPin} 
                                    onChange={e => setSecurityData({...securityData, guestPin: e.target.value})} 
                                />
                                
                                <div className="flex gap-2">
                                    <button onClick={() => {
                                        if (!securityData.guestPin || securityData.guestPin.length < 4) return alert("Vui lòng nhập đủ 4 số để cập nhật!");
                                        handleSecurityAction('UPDATE_GUEST_PIN', { pin: securityData.guestPin });
                                        setSecurityData({...securityData, guestPin: ''});
                                    }} className="flex-1 py-3 bg-stone-800 text-white rounded-xl font-black uppercase text-[10px] hover:bg-stone-900 transition-colors">Lưu mã mới</button>
                                    
                                    {isGuestPinActive && (
                                        <button onClick={() => {
                                            if(window.confirm("Bạn muốn tắt mã bảo vệ và mở cửa tự do cho khách?")) {
                                                handleSecurityAction('UPDATE_GUEST_PIN', { pin: '' });
                                            }
                                        }} className="py-3 px-4 bg-red-50 text-red-600 rounded-xl font-black uppercase text-[10px] hover:bg-red-100 transition-colors">Gỡ khóa</button>
                                    )}
                                </div>
                                <p className="text-[9px] text-stone-400 italic text-center leading-relaxed">
                                    * Mã PIN được mã hóa bảo mật 1 chiều (SHA-256) nên không thể xem lại mã cũ. Hãy nhập mã mới để ghi đè hoặc chọn Gỡ khóa.
                                </p>
                            </div>
                        );
                    })()}
                    <div className="bg-white p-6 rounded-3xl border shadow-sm space-y-4">
                        <h3 className="text-xs font-black text-stone-400 uppercase flex items-center gap-2"><Key size={16}/> SM PIN (Mã Trưởng tộc 6 số)</h3>
                        <input type="password" maxLength={6} className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl text-2xl text-center tracking-[1em] font-mono outline-none" placeholder="••••••" value={securityData.smPin} onChange={e => setSecurityData({...securityData, smPin: e.target.value})} />
                        <button onClick={() => handleSecurityAction('UPDATE_SM_PIN', { pin: securityData.smPin })} className="w-full py-4 bg-[#704214] text-white rounded-2xl font-black uppercase text-xs">Thay đổi mã cá nhân</button>
                    </div>
                </section>
              </>
            ) : (
              <section className="bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6 max-w-md mx-auto mt-10">
                <div className="text-center space-y-2">
                  <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-2xl mb-2"><Key size={32}/></div>
                  <h3 className="text-lg font-black text-stone-800 uppercase tracking-tighter">Đổi mã PIN cá nhân</h3>
                  <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">Dành cho Mod Nhánh: {auth.mod_name}</p>
                </div>
                <input 
                  type="password" maxLength={6} placeholder="Nhập 6 số mới..."
                  className="w-full p-4 bg-stone-50 border border-stone-100 rounded-2xl text-2xl text-center tracking-[1em] font-mono outline-none focus:border-blue-500 transition-colors"
                  value={securityData.smPin} onChange={e => setSecurityData({...securityData, smPin: e.target.value})}
                />
                <button 
                  onClick={() => {
                    if(securityData.smPin.length < 6) return alert("Vui lòng nhập đủ 6 số");
                    handleSecurityAction('CHANGE_MY_PIN', { pin: securityData.smPin });
                    setSecurityData({...securityData, smPin: ''});
                  }}
                  className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-lg hover:bg-blue-700 transition-colors"
                >Xác nhận đổi mã PIN</button>
              </section>
            )}
          </div>
        )}

        {activeTab === 'about' && auth.role === 'sm' && (
          <div className="h-full overflow-y-auto p-6 space-y-8 custom-scrollbar max-w-5xl mx-auto pb-32">
             <div className="flex justify-between items-center border-b-2 border-pink-100 pb-4">
                <h3 className="text-lg font-black text-pink-900 uppercase tracking-tighter">Nội dung Giới thiệu dòng tộc</h3>
             </div>
             
             <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Tên hiển thị Gia Phả</label>
                    <span className={`text-[10px] font-black ${aboutData.family_name.length >= 100 ? 'text-red-500' : 'text-stone-400'}`}>({aboutData.family_name.length}/100)</span>
                </div>
                <div className="flex gap-3">
                    <input 
                        type="text" maxLength={100} 
                        className="flex-1 p-4 bg-stone-50 border border-stone-200 rounded-2xl outline-none focus:ring-4 ring-pink-50 text-sm font-bold text-stone-800 uppercase transition-all" 
                        placeholder="VD: GIA PHẢ HỌ NGUYỄN" 
                        value={aboutData.family_name} 
                        onChange={e => setAboutData({...aboutData, family_name: e.target.value})} 
                    />
                    <button 
                        onClick={() => handleSecurityAction('UPDATE_FAMILY_NAME', { name: aboutData.family_name })} 
                        className="px-6 bg-pink-700 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-pink-800 transition-colors shadow-lg"
                    >Lưu Tên</button>
                </div>
             </div>

             <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-3">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Tiểu sử dòng tộc (Hiển thị đầu trang About)</label>
                    <span className={`text-[10px] font-black ${aboutData.intro.length >= 3000 ? 'text-red-500 animate-pulse' : 'text-stone-400'}`}>({aboutData.intro.length}/3000)</span>
                </div>
                <textarea 
                    rows={8} maxLength={3000}
                    className="w-full p-6 bg-stone-50 border border-stone-200 rounded-3xl outline-none focus:ring-4 ring-pink-50 text-sm leading-relaxed transition-all resize-y" 
                    placeholder="Viết vài dòng giới thiệu về lịch sử, truyền thống dòng họ..." 
                    value={aboutData.intro} 
                    onChange={e => setAboutData({...aboutData, intro: e.target.value})}
                ></textarea>
                <div className="flex justify-end">
                    <button 
                        onClick={() => handleSecurityAction('UPDATE_ABOUT_INTRO', { intro: aboutData.intro })} 
                        className="px-8 py-3 bg-pink-700 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-pink-800 transition-colors shadow-lg flex items-center gap-2"
                    ><Save size={14}/> Lưu Tiểu Sử</button>
                </div>
             </div>

             <div className="bg-white p-6 rounded-[2rem] border shadow-sm space-y-6 relative">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black text-stone-400 uppercase tracking-widest">Album ảnh dòng tộc ({aboutData.photos.length}/12 ảnh)</label>
                    <div className="flex items-center gap-2">
                        {aboutData.photos.length > 0 && (
                            <button onClick={() => handleSecurityAction('UPDATE_FAMILY_PHOTOS', { photos: aboutData.photos })} className="text-[10px] font-black text-white bg-stone-800 px-4 py-2 rounded-xl hover:bg-stone-900 transition-colors uppercase flex items-center gap-1 shadow-md">
                                <Save size={12}/> Lưu Ghi Chú Ảnh
                            </button>
                        )}
                        {aboutData.photos.length < 12 && !showPhotoForm && (
                            <button onClick={() => setShowPhotoForm(true)} className="text-[10px] font-black text-pink-700 bg-pink-50 px-4 py-2 rounded-xl border border-pink-100 uppercase hover:bg-pink-100 transition-colors flex items-center gap-1">
                                <Plus size={14}/> Ảnh Mới
                            </button>
                        )}
                    </div>
                </div>

                {showPhotoForm && (
                    <div className="p-4 bg-pink-50/50 rounded-2xl border-2 border-dashed border-pink-200 animate-in fade-in zoom-in-95">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[10px] font-black text-pink-800 uppercase">Thêm ảnh vào Album</h4>
                            <button onClick={() => { setShowPhotoForm(false); setNewPhotoPreview(null); setNewPhotoFile(null); setNewPhotoCaption(''); }} className="text-stone-400 hover:text-red-500"><X size={16}/></button>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4 items-start">
                            <div className="w-full sm:w-40 aspect-square shrink-0 rounded-xl border-2 border-stone-200 border-dashed bg-white flex flex-col items-center justify-center overflow-hidden relative cursor-pointer hover:border-pink-300 transition-colors group" onClick={() => fileInputRef.current?.click()}>
                                {newPhotoPreview ? (
                                    <>
                                        <img src={newPhotoPreview} className="w-full h-full object-cover absolute inset-0 z-10" />
                                        <div className="absolute inset-0 bg-black/50 z-20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] font-black text-white uppercase"><UploadCloud size={20}/></div>
                                    </>
                                ) : (
                                    <div className="text-center p-4">
                                        <UploadCloud size={24} className="text-stone-300 mx-auto mb-2" />
                                        <span className="text-[10px] font-black text-stone-400 uppercase">Chọn ảnh (Max 10MB)</span>
                                    </div>
                                )}
                                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleSelectNewPhoto} />
                            </div>

                            <div className="flex-1 w-full space-y-3">
                                <div>
                                    <div className="flex justify-between items-center mb-1">
                                        <label className="text-[10px] font-black text-stone-500 uppercase">Ghi chú ảnh (Không bắt buộc)</label>
                                        <span className={`text-[9px] font-black ${newPhotoCaption.length >= 150 ? 'text-red-500' : 'text-stone-400'}`}>({newPhotoCaption.length}/150)</span>
                                    </div>
                                    <textarea 
                                        rows={3} maxLength={150}
                                        placeholder="Ví dụ: Lễ thanh minh năm 2025 tại nhà thờ Tổ..."
                                        className="w-full p-3 bg-white border border-stone-200 rounded-xl outline-none focus:border-pink-300 text-xs"
                                        value={newPhotoCaption}
                                        onChange={(e) => setNewPhotoCaption(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="flex justify-end">
                                    <button 
                                        onClick={handleUploadPhoto} 
                                        disabled={!newPhotoFile}
                                        className="px-6 py-2.5 bg-pink-700 text-white rounded-xl font-black uppercase text-[10px] shadow-lg hover:bg-pink-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    ><Upload size={14}/> Xác nhận thêm ảnh</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {aboutData.photos.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {aboutData.photos.map((photo, idx) => (
                            <div key={idx} className="relative aspect-square bg-stone-100 rounded-2xl border border-stone-200 overflow-hidden group shadow-sm">
                                <img src={photo.url} className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-500" onError={(e) => e.currentTarget.style.display='none'} />
                                
                                <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                     <button 
                                        onClick={() => {
                                            if(window.confirm("Xóa bức ảnh này khỏi hệ thống (Không thể hoàn tác)?")) {
                                                handleSecurityAction('DELETE_FAMILY_PHOTO', { url: photo.url });
                                            }
                                        }} 
                                        className="p-1.5 bg-white/90 text-red-600 hover:bg-red-500 hover:text-white rounded-lg shadow-md transition-colors"
                                        title="Xóa ảnh"
                                     ><Trash2 size={14}/></button>
                                </div>

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-6">
                                    <input 
                                        type="text" maxLength={150} 
                                        placeholder="Ghi chú (Tùy chọn)..." 
                                        className="w-full p-1.5 rounded-lg text-[9px] bg-white/20 text-white placeholder-white/50 border border-white/20 outline-none focus:bg-white/90 focus:text-stone-800 transition-colors font-medium text-center" 
                                        value={photo.caption} 
                                        onChange={e => { const newP = [...aboutData.photos]; newP[idx].caption = e.target.value; setAboutData({...aboutData, photos: newP}); }} 
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    !showPhotoForm && (
                        <div className="py-12 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center text-stone-400 space-y-2 bg-stone-50/50">
                            <ImageIcon size={32} className="opacity-50" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Album chưa có ảnh nào</p>
                        </div>
                    )
                )}
             </div>
          </div>
        )}

        {activeTab === 'system' && auth.role === 'sm' && (
          <div className="h-full overflow-y-auto p-6 space-y-10 custom-scrollbar max-w-5xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center space-y-1">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Thành viên</p>
                    <p className="text-2xl font-black text-stone-800 tracking-tighter">{globalMembers.length}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center space-y-1">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Lượt truy cập</p>
                    <p className="text-2xl font-black text-blue-700 tracking-tighter">{systemData?.stats?.views || 0}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center space-y-1">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Dung lượng R2</p>
                    <p className="text-2xl font-black text-orange-700 tracking-tighter">{systemData?.stats?.r2_size || '0 MB'}</p>
                </div>
                <div className="bg-white p-5 rounded-3xl border shadow-sm text-center space-y-1">
                    <p className="text-[9px] font-black text-stone-400 uppercase tracking-widest">Database</p>
                    <p className="text-2xl font-black text-green-700 tracking-tighter">Ready</p>
                </div>
            </div>

            <section className="bg-stone-800 p-8 rounded-[2.5rem] text-white space-y-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform"><Database size={160}/></div>
                <div className="relative">
                    <h3 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3"><RefreshCcw /> Sao lưu & Khôi phục (Local)</h3>
                    <p className="text-stone-400 text-xs mt-2 max-w-xl leading-relaxed">Hãy tải bản sao lưu (file JSON) về máy tính cá nhân hàng tháng. Thao tác khôi phục sẽ xóa sạch dữ liệu hiện tại để ghi đè từ file, chỉ dùng khi hệ thống gặp sự cố nghiêm trọng.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 relative">
                    <button onClick={handleBackup} className="px-8 py-4 bg-white text-stone-900 rounded-2xl font-black uppercase text-xs flex items-center gap-2 hover:bg-stone-100 transition-colors shadow-lg"><Download size={18}/> Tải về Bản sao lưu (.json)</button>
                    <label className="px-8 py-4 bg-stone-700 text-stone-300 rounded-2xl font-black uppercase text-xs flex items-center gap-2 cursor-pointer border border-stone-600 hover:border-white transition-all">
                        <Upload size={18}/> {isSaving ? "Đang xử lý..." : "Khôi phục từ file"}
                        <input type="file" accept=".json" className="hidden" onChange={handleRestore} disabled={isSaving} />
                    </label>
                </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-black text-stone-400 uppercase flex items-center gap-2 tracking-widest"><Trash2 size={16}/> Thùng rác (Thành viên bị ẩn)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {systemData?.recycleBin?.map((m: any) => (
                  <div key={m.id} className="bg-white p-5 rounded-3xl border flex justify-between items-center shadow-sm hover:border-blue-200 transition-colors">
                    <div>
                        <p className="font-black text-stone-800 text-sm">{m.full_name.toUpperCase()}</p>
                        <p className="text-[10px] text-stone-400 uppercase font-bold">ID: {m.id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleSecurityAction('RESTORE_MEMBER', { id: m.id })} className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100" title="Khôi phục"><RefreshCcw size={16}/></button>
                      <button onClick={() => window.confirm("XÓA VĨNH VIỄN? Không thể hoàn tác.") && handleSecurityAction('HARD_DELETE_MEMBER', { id: m.id })} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100" title="Xóa cứng"><X size={16}/></button>
                    </div>
                  </div>
                ))}
                {systemData?.recycleBin?.length === 0 && <div className="col-span-full py-10 bg-white rounded-3xl border border-dashed border-stone-200 text-center text-xs text-stone-400 italic">Thùng rác đang trống</div>}
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="text-xs font-black text-stone-400 uppercase flex items-center gap-2 tracking-widest"><History size={16}/> Nhật ký thao tác (Audit Logs)</h3>
              <div className="bg-white rounded-[2rem] border overflow-hidden shadow-sm">
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {systemData?.auditLogs?.map((log: any) => (
                    <div key={log.id} className="p-4 border-b last:border-0 hover:bg-stone-50 transition-colors flex items-start gap-4">
                        <div className="p-2 bg-stone-100 rounded-lg text-stone-400"><Clock size={16} /></div>
                        <div className="flex-1">
                            <p className="text-xs text-stone-600 leading-relaxed">
                                <span className="font-black text-blue-800 uppercase text-[10px] tracking-tight">[{log.author_name}]</span> {log.action}: <span className="font-bold text-stone-800 italic">"{log.target_name}"</span>
                            </p>
                            <p className="text-[9px] text-stone-400 mt-1 font-bold">
                              {new Date((log.timestamp || '').replace(' ', 'T') + 'Z').toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}
                            </p>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>

      {editingMember && (
        <MemberForm 
          member={editingMember} allMembers={globalMembers} isNew={formMode === 'add'} 
          onCancel={() => { setEditingMember(null); setFormMode(null); }}
          onSave={handleSaveMember} onDelete={handleDeleteMember}
          authorInfo={{ role: auth.role, name: auth.mod_name }}
        />
      )}

      {isSaving && (
        <div className="fixed inset-0 z-[400] bg-white/70 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in">
          <div className="p-10 bg-white rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 border-2 border-[#704214]/10">
            <Loader2 className="animate-spin text-[#704214]" size={48} />
            <div className="text-center">
                <p className="text-xs font-black uppercase tracking-widest text-stone-800">Đang đồng bộ</p>
                <p className="text-[9px] text-stone-400 font-bold uppercase mt-1 italic">Vui lòng không đóng trình duyệt...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
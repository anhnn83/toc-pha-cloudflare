// src/components/MemberForm.tsx -- Version 4.3 (Cập nhật thông tin người thực hiện)

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, X, Trash2, HelpCircle, UploadCloud, User, Loader2 } from 'lucide-react';

interface MemberFormProps {
  member: any;
  allMembers: any[]; 
  onSave: (data: any, newImageBase64?: string) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
  // Bổ sung prop để nhận thông tin người đang đăng nhập
  authorInfo?: { role: string; name?: string }; 
}

const HelpTooltip = ({ text }: { text: string }) => (
  <div className="relative group inline-block ml-1">
    <HelpCircle size={14} className="text-stone-400 cursor-help hover:text-blue-500 transition-colors" />
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-stone-800 text-white text-[10px] rounded-lg shadow-lg z-50 text-center leading-relaxed font-normal">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-stone-800"></div>
    </div>
  </div>
);

const formatTitleCase = (str: string) => {
  if (!str) return '';
  return str.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
};

const MemberForm: React.FC<MemberFormProps> = ({ member, allMembers, onSave, onCancel, onDelete, isNew, authorInfo }) => {
  const [formData, setFormData] = useState<any>(member);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 1. Phục hồi ảnh preview từ LocalStorage
  useEffect(() => {
    if (!isNew && !imagePreview) {
      const localImg = localStorage.getItem(`mock_git_src/assets/images/${formData.id}.webp`);
      if (localImg) {
        setImagePreview(localImg.startsWith('data:') ? localImg : `data:image/webp;base64,${localImg}`);
      }
    }
  }, [formData.id, isNew, imagePreview]);

  // 2. Khởi tạo ID tự động cho người mới
  useEffect(() => {
    if (isNew && !formData.id) {
      const ids = allMembers.map(m => parseInt(m.id.replace(/\D/g, '')) || 0);
      const maxId = ids.length > 0 ? Math.max(...ids) : 0;
      const nextId = `P${String(maxId + 1).padStart(3, '0')}`;
      
      setFormData((prev: any) => ({
        ...prev, id: nextId, lifeStatus: 'alive'
      }));
    }
  }, [isNew, allMembers]);

  // 3. THUẬT TOÁN THÔNG MINH: Nhận diện Tình trạng Hôn nhân
  useEffect(() => {
    if (formData.relationType === 'in_law' && formData._marriageStatus === undefined) {
        let spId = '';
        let stat = 'current';

        if (isNew && formData.spouses?.length > 0) {
            spId = formData.spouses[0].id;
            stat = formData.spouses[0].status;
        } else {
            const sp = allMembers.find(m => m.spouses?.some((s:any) => s.id === formData.id));
            if (sp) {
                spId = sp.id;
                stat = sp.spouses.find((s:any) => s.id === formData.id)?.status || 'current';
            }
        }

        if (spId) {
            setFormData((prev: any) => ({...prev, _marriageStatus: stat, _bloodlineSpouseId: spId}));
        }
    }
  }, [formData.relationType, formData.id, isNew, allMembers, formData.spouses]);

  // 4. THUẬT TOÁN THÔNG MINH: Lọc danh sách Cha/Mẹ
  const parentInfo = useMemo(() => {
    if (formData.relationType === 'in_law') return null;
    const fId = formData.parents?.fatherId;
    const mId = formData.parents?.motherId;
    if (!fId && !mId) return null; 

    const f = allMembers.find(m => m.id === fId);
    const m = allMembers.find(m => m.id === mId);

    let bloodline = null;
    if (f && f.relationType !== 'in_law') bloodline = f;
    else if (m && m.relationType !== 'in_law') bloodline = m;
    else bloodline = f || m;

    if (!bloodline) return null;
    const otherRole = bloodline.gender === 'M' ? 'motherId' : 'fatherId';
    const spouses = (bloodline.spouses || []).map((s:any) => {
        const sp = allMembers.find(member => member.id === s.id);
        return { id: s.id, name: sp?.fullName || s.id };
    });

    return { bloodline, otherRole, spouses };
  }, [formData.relationType, formData.parents, allMembers]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width; let height = img.height;
        const MAX_SIZE = 1200;
        if (width > height && width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } 
        else if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        setImagePreview(canvas.toDataURL('image/webp', 0.90));
        setIsCompressing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedData = {
      ...formData,
      fullName: formatTitleCase(formData.fullName),
      nickname: formatTitleCase(formData.nickname)
    };
    onSave(formattedData, imagePreview || undefined);
  };
  
  const isAlive = formData.lifeStatus === 'alive';
  const isInLaw = formData.relationType === 'in_law';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-full overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b bg-stone-50 rounded-t-[2rem]">
          <div>
            <h3 className="font-black text-xl text-stone-800 uppercase tracking-tight">
              {isNew ? 'THÊM THÀNH VIÊN MỚI' : `CHỈNH SỬA HỒ SƠ: ${formData.id}`}
            </h3>
            {/* THAY ĐỔI DÒNG CHỮ Ở ĐÂY */}
            <p className="text-[11px] text-stone-500 font-bold uppercase mt-1">
              Người cập nhật: {authorInfo?.role === 'super' ? 'Trưởng tộc' : `Quản trị nhánh: ${authorInfo?.name || 'Ẩn danh'}`}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* ... GIỮ NGUYÊN PHẦN BODY NHƯ CŨ ... */}
          
          {/* THÔNG TIN CƠ BẢN */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase flex items-center gap-2">Thông tin cơ bản</h4>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex flex-col items-center gap-3">
                <div className="w-28 h-28 rounded-3xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden relative group">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : !isNew ? (
                    <img src={`/src/assets/images/${formData.id}.webp`} 
                         onError={(e) => {
                           const target = e.currentTarget;
                           const currentExt = target.src.match(/\.(webp|jpg|png|jpeg)$/)?.[0] || '';
                           const exts = ['.webp', '.jpg', '.png', '.jpeg'];
                           const nextIdx = exts.indexOf(currentExt) + 1;
                           if (nextIdx < exts.length) target.src = `/src/assets/images/${formData.id}${exts[nextIdx]}`;
                           else target.style.display = 'none';
                         }} 
                         className="w-full h-full object-cover absolute inset-0 z-10" />
                  ) : null}
                  <User size={40} className="text-stone-300 absolute z-0" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                    <UploadCloud className="text-white" size={24} />
                  </div>
                </div>
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-lg flex items-center gap-1 uppercase transition-colors">
                  {isCompressing ? <Loader2 size={14} className="animate-spin" /> : 'Thay Ảnh'}
                </button>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">* Họ và tên</label>
                  <input required type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 ring-blue-500 outline-none font-bold" 
                         value={formData.fullName || ''} 
                         onChange={(e) => setFormData({...formData, fullName: e.target.value})} 
                         onBlur={(e) => setFormData({...formData, fullName: formatTitleCase(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Biệt danh / Tên tự</label>
                  <input type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200" 
                         value={formData.nickname || ''} 
                         onChange={(e) => setFormData({...formData, nickname: e.target.value})} 
                         onBlur={(e) => setFormData({...formData, nickname: formatTitleCase(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">* Giới tính</label>
                  <div className="flex gap-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer"><input type="radio" checked={formData.gender === 'M'} onChange={() => setFormData({...formData, gender: 'M'})} /> Nam</label>
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer"><input type="radio" checked={formData.gender === 'F'} onChange={() => setFormData({...formData, gender: 'F'})} /> Nữ</label>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">* Trạng thái sự sống</label>
                  <div className="flex gap-4 p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-green-700"><input type="radio" checked={isAlive} onChange={() => setFormData({...formData, lifeStatus: 'alive'})} /> Còn sống</label>
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-red-700"><input type="radio" checked={!isAlive} onChange={() => setFormData({...formData, lifeStatus: 'deceased'})} /> Đã mất</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* ... (các phần khác giữ nguyên) ... */}
          
          {/* THÔNG TIN SINH / TỬ */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Thông tin Sinh / Tử</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3">
                <label className="text-[10px] font-black text-stone-500 uppercase block">Ngày Sinh (DD/MM/YYYY)</label>
                <div className="flex gap-2">
                  <input type="number" placeholder="DD" className="w-16 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500" value={formData.birth?.dd || ''} onChange={(e) => setFormData({...formData, birth: {...formData.birth, dd: parseInt(e.target.value) || null}})} /> /
                  <input type="number" placeholder="MM" className="w-16 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500" value={formData.birth?.mm || ''} onChange={(e) => setFormData({...formData, birth: {...formData.birth, mm: parseInt(e.target.value) || null}})} /> /
                  <input type="number" placeholder="YYYY" className="w-24 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500" value={formData.birth?.yyyy || ''} onChange={(e) => setFormData({...formData, birth: {...formData.birth, yyyy: parseInt(e.target.value) || null}})} />
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-500"><input type="checkbox" checked={formData.birth?.isApproximate || false} onChange={(e) => setFormData({...formData, birth: {...formData.birth, isApproximate: e.target.checked}})} /> Chỉ nhớ khoảng năm</label>
              </div>

              <div className={`p-4 rounded-xl border space-y-3 transition-colors ${isAlive ? 'bg-stone-100 border-transparent opacity-60' : 'bg-red-50 border-red-100'}`}>
                <label className="text-[10px] font-black text-stone-500 uppercase flex items-center gap-1">Ngày Mất (DD/MM/YYYY)</label>
                <div className="flex gap-2">
                  <input disabled={isAlive} type="number" placeholder="DD" className="w-16 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500 disabled:bg-stone-200" value={formData.death?.dd || ''} onChange={(e) => setFormData({...formData, death: {...formData.death, dd: parseInt(e.target.value) || null}})} /> /
                  <input disabled={isAlive} type="number" placeholder="MM" className="w-16 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500 disabled:bg-stone-200" value={formData.death?.mm || ''} onChange={(e) => setFormData({...formData, death: {...formData.death, mm: parseInt(e.target.value) || null}})} /> /
                  <input disabled={isAlive} type="number" placeholder="YYYY" className="w-24 p-2 rounded-lg border border-stone-300 text-center text-sm outline-none focus:border-blue-500 disabled:bg-stone-200" value={formData.death?.yyyy || ''} onChange={(e) => setFormData({...formData, death: {...formData.death, yyyy: parseInt(e.target.value) || null}})} />
                </div>
                <div className="flex items-center justify-between">
                   <label className="flex items-center gap-2 text-xs text-stone-500"><input disabled={isAlive} type="checkbox" checked={formData.death?.isApproximate || false} onChange={(e) => setFormData({...formData, death: {...formData.death, isApproximate: e.target.checked}})} /> Chỉ nhớ khoảng năm</label>
                   <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-stone-500 uppercase">Giỗ Âm (DD/MM)</span>
                      <input disabled={isAlive} type="text" placeholder="15/08" className="w-16 p-1.5 rounded border border-stone-300 text-center text-xs disabled:bg-stone-200" 
                        value={formData.deathAnniversary?.displayText || (formData.deathAnniversary?.dd ? `${formData.deathAnniversary.dd}/${formData.deathAnniversary.mm}` : '')} 
                        onChange={(e) => {
                          const val = e.target.value; const parts = val.split('/');
                          setFormData({ ...formData, deathAnniversary: { displayText: val, dd: parts[0] ? parseInt(parts[0]) : null, mm: parts[1] ? parseInt(parts[1]) : null } });
                        }} 
                      />
                   </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Quan hệ gia đình</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 flex items-center gap-1">* Kiểu quan hệ</label>
                <select disabled className="w-full p-3 bg-stone-100 rounded-xl border border-stone-200 text-sm font-bold text-stone-500 cursor-not-allowed" value={formData.relationType} onChange={(e) => setFormData({...formData, relationType: e.target.value})}>
                  <option value="biological">Con ruột</option>
                  <option value="adopted">Con nuôi</option>
                  <option value="in_law">Dâu / Rể</option>
                  <option value="step">Con riêng</option>
                </select>
              </div>

              {!isInLaw && (
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase mb-1 flex items-center gap-1">Thứ tự trong nhà (Sinh thứ mấy) <HelpTooltip text="Giúp sắp xếp anh em trên cây từ trái qua phải." /></label>
                    <input type="number" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500" placeholder="Ví dụ: 1, 2..." value={formData.siblingRank || ''} onChange={(e) => setFormData({...formData, siblingRank: parseInt(e.target.value)})} />
                  </div>
              )}

              {parentInfo && (
                  <>
                    <div className="p-4 rounded-xl border bg-stone-50 border-stone-200">
                        <label className="text-[10px] font-black text-stone-500 uppercase mb-2 block">
                            * {parentInfo.bloodline.gender === 'M' ? 'Cha' : 'Mẹ'} (Người mang dòng họ)
                        </label>
                        <input disabled type="text" className="w-full p-3 bg-stone-200 rounded-lg border border-stone-300 font-bold text-sm text-stone-600" value={parentInfo.bloodline.fullName} />
                    </div>
                    <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                        <label className="text-[10px] font-black text-blue-800 uppercase mb-2 flex items-center gap-1">
                            * {parentInfo.otherRole === 'motherId' ? 'Mẹ' : 'Cha'} (Khác họ) <HelpTooltip text="Chọn Không nếu là con riêng hoặc chưa rõ thông tin." />
                        </label>
                        <select 
                            className="w-full p-3 bg-white rounded-lg border border-blue-200 font-bold text-sm outline-none focus:border-blue-500 text-blue-900"
                            value={formData.parents?.[parentInfo.otherRole] || ''}
                            onChange={(e) => setFormData({
                                ...formData, 
                                parents: { ...formData.parents, [parentInfo.otherRole]: e.target.value }
                            })}
                        >
                            <option value="">-- KHÔNG (Con riêng / Chưa rõ) --</option>
                            {parentInfo.spouses.map((s:any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                  </>
              )}

              {formData.relationType === 'in_law' && formData._bloodlineSpouseId && (
                  <>
                    <div className="p-4 rounded-xl border bg-stone-50 border-stone-200">
                        <label className="text-[10px] font-black text-stone-500 uppercase mb-2 block">
                            {formData.gender === 'M' ? 'Là Chồng của' : 'Là Vợ của'}
                        </label>
                        <input disabled type="text" className="w-full p-3 bg-stone-200 rounded-lg border border-stone-300 font-bold text-sm text-stone-600" 
                               value={allMembers.find(m => m.id === formData._bloodlineSpouseId)?.fullName} />
                    </div>
                    <div className="p-4 rounded-xl border bg-pink-50 border-pink-200">
                        <label className="text-[10px] font-black text-pink-800 uppercase mb-2 block">Tình trạng hôn nhân</label>
                        <select 
                            className="w-full p-3 bg-white rounded-lg border border-pink-200 font-bold text-sm outline-none text-pink-900"
                            value={formData._marriageStatus || 'current'}
                            onChange={(e) => setFormData({...formData, _marriageStatus: e.target.value})}
                        >
                            <option value="current">Đang hôn thú</option>
                            <option value="divorced">Đã ly hôn</option>
                        </select>
                    </div>
                  </>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Thông tin bổ sung</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">{isAlive ? 'Nơi ở hiện tại' : 'Nơi an táng'}</label>
                <input type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500" value={formData.location || ''} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Tiểu sử chi tiết</label>
                <textarea rows={3} className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500 text-sm" placeholder="Ghi chú về cuộc đời, sự nghiệp, công trạng..." value={formData.biography || ''} onChange={(e) => setFormData({...formData, biography: e.target.value})}></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Ghi chú bổ sung</label>
                <textarea 
                  rows={2} 
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500 text-sm" 
                  placeholder="Thông tin thông gia, số điện thoại, người tổ chức giỗ, ghi chú khác..." 
                  value={formData.note || ''} 
                  onChange={(e) => setFormData({...formData, note: e.target.value})}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-stone-50 rounded-b-[2rem] flex flex-col sm:flex-row gap-3">
          <button type="submit" className="flex-[2] py-4 bg-[#704214] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-[#8a5219] transition-all text-sm uppercase tracking-wider">
            <Save size={20} /> {isNew ? 'THÊM VÀO GIA PHẢ' : 'LƯU THAY ĐỔI'}
          </button>
          
          {!isNew && onDelete && (
            <button type="button" onClick={() => window.confirm("Xác nhận xóa vĩnh viễn thành viên này?") && onDelete(formData.id)} className="flex-1 py-4 text-red-600 bg-red-100 hover:bg-red-200 font-bold flex items-center justify-center gap-2 rounded-2xl transition-colors text-xs uppercase">
              <Trash2 size={16} /> Xóa
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
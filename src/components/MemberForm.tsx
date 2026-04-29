// src/components/MemberForm.tsx -- version 3.2

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Save, X, Trash2, HelpCircle, UploadCloud, User, Loader2 } from 'lucide-react';
import { getNextSolarAnniversary } from '../utils/lunarUtils';

interface MemberFormProps {
  member: any;
  allMembers: any[]; 
  onSave: (data: any, newImageBase64?: string) => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
  isNew?: boolean;
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

const parseDateString = (dateStr?: string | null) => {
  if (!dateStr) return { dd: '', mm: '', yyyy: '' };
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 1) return { dd: '', mm: '', yyyy: parts[0] };
  if (parts.length === 3) return { dd: parts[0], mm: parts[1], yyyy: parts[2] };
  return { dd: '', mm: '', yyyy: '' };
};

const parseLunarDate = (dateStr?: string | null) => {
  if (!dateStr) return { dd: '', mm: '' };
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 2) return { dd: parts[0], mm: parts[1] };
  return { dd: '', mm: '' };
};

const MemberForm: React.FC<MemberFormProps> = ({ member, allMembers, onSave, onCancel, onDelete, isNew, authorInfo }) => {
  const [formData, setFormData] = useState<any>({
    id: member.id || '',
    full_name: member.full_name || member.fullName || '',
    alias: member.alias || member.nickname || '',
    gender: member.gender || 'M',
    relation_status: member.relation_status || member.relationType || 'biological',
    is_alive: member.is_alive !== undefined ? member.is_alive : 1,
    father_id: member.father_id || null,
    mother_id: member.mother_id || null,
    location: member.location || '',
    biography: member.biography || '',
    notes: member.notes || member.note || '',
    avatar_url: member.avatar_url || null,
    rank_in_family: member.rank_in_family || member.siblingRank || 1,
    _bloodlineSpouseId: member._bloodlineSpouseId || '',
    _marriageStatus: member._marriageStatus || 'current'
  });

  const [birth, setBirth] = useState({ ...parseDateString(member.birthday), isApproximate: member.is_birth_approximate === 1 });
  const [death, setDeath] = useState({ ...parseDateString(member.death_date), isApproximate: member.is_death_approximate === 1 });
  
  // State quản lý ngày giỗ Âm Lịch
  const initialLunar = parseLunarDate(member.lunar_death_date);
  const [lunarDeathDay, setLunarDeathDay] = useState(initialLunar.dd);
  const [lunarDeathMonth, setLunarDeathMonth] = useState(initialLunar.mm);

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tính toán Preview Ngày giỗ Dương Lịch sắp tới
  const previewSolarAnniversary = useMemo(() => {
    if (lunarDeathDay && lunarDeathMonth && lunarDeathDay.length > 0 && lunarDeathMonth.length > 0) {
      return getNextSolarAnniversary(`${lunarDeathDay.padStart(2, '0')}/${lunarDeathMonth.padStart(2, '0')}`);
    }
    return null;
  }, [lunarDeathDay, lunarDeathMonth]);

  useEffect(() => {
    if (isNew && !formData.id) {
      const nextId = `P${Date.now()}`;
      setFormData((prev: any) => ({ ...prev, id: nextId, is_alive: 1 }));
    }
  }, [isNew, formData.id]);

  useEffect(() => {
      if (formData.relation_status === 'in_law') {
      if (member._bloodlineSpouseId && !formData._bloodlineSpouseId) {
        setFormData((prev: any) => ({ 
          ...prev, 
          _bloodlineSpouseId: member._bloodlineSpouseId,
          _marriageStatus: member._marriageStatus || 'current'
        }));
      } 
      else if (!formData._bloodlineSpouseId && !isNew) {
        const spouseRelation = allMembers.find(m => m.spouses?.some((s: any) => s.id === formData.id));
        if (spouseRelation) {
          const relationDetail = spouseRelation.spouses.find((s: any) => s.id === formData.id);
          setFormData((prev: any) => ({
            ...prev,
            _bloodlineSpouseId: spouseRelation.id,
            _marriageStatus: relationDetail?.status || 'current'
          }));
        }
      }
    }
  }, [formData.relation_status, member, allMembers, isNew]);

  const parentInfo = useMemo(() => {
    if (formData.relation_status === 'in_law') return null;
    const fId = formData.father_id;
    const mId = formData.mother_id;
    if (!fId && !mId) return null; 

    const f = allMembers.find(m => m.id === fId);
    const m = allMembers.find(m => m.id === mId);

    let bloodline = null;
    if (f && f.relation_status !== 'in_law') bloodline = f;
    else if (m && m.relation_status !== 'in_law') bloodline = m;
    else bloodline = f || m;

    if (!bloodline) return null;
    const otherRole = bloodline.gender === 'M' ? 'mother_id' : 'father_id';
    
    const spouses = (bloodline.spouses || []).map((s:any) => {
        const sp = allMembers.find(member => member.id === s.id);
        return { id: s.id, name: sp?.full_name || sp?.fullName || s.id };
    });

    return { bloodline, otherRole, spouses };
  }, [formData.relation_status, formData.father_id, formData.mother_id, allMembers]);

  useEffect(() => {
    if (isNew && parentInfo && parentInfo.spouses.length === 1) {
      setFormData((prev: any) => {
        if (prev[parentInfo.otherRole] === null) {
          return { ...prev, [parentInfo.otherRole]: parentInfo.spouses[0].id };
        }
        return prev;
      });
    }
  }, [isNew, parentInfo]);

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
        // Khi up ảnh mới, đảm bảo avatar_url khác rỗng để backend biết
        setFormData((prev: any) => ({ ...prev, avatar_url: 'pending' })); 
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Logic Xóa Ảnh
  const handleRemoveImage = () => {
    setImagePreview(null);
    setFormData((prev: any) => ({ ...prev, avatar_url: '' })); // Đánh dấu là đã xóa ảnh
    if (fileInputRef.current) {
        fileInputRef.current.value = ''; // Reset input file
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const buildDate = (d: any) => {
      if (!d.yyyy) return null;
      if (d.dd && d.mm) return `${String(d.dd).padStart(2,'0')}/${String(d.mm).padStart(2,'0')}/${d.yyyy}`;
      return `${d.yyyy}`;
    };

    const formattedData = {
      ...formData,
      full_name: formatTitleCase(formData.full_name),
      alias: formatTitleCase(formData.alias),
      birthday: buildDate(birth),
      is_birth_approximate: birth.isApproximate ? 1 : 0,
      death_date: formData.is_alive === 1 ? null : buildDate(death),
      is_death_approximate: death.isApproximate ? 1 : 0,
      lunar_death_date: (formData.is_alive === 0 && lunarDeathDay && lunarDeathMonth) 
        ? `${String(lunarDeathDay).padStart(2,'0')}/${String(lunarDeathMonth).padStart(2,'0')}` 
        : null,
    };

    // Truyền imagePreview. Nếu vừa xóa ảnh (avatar_url = ''), backend sẽ tự xử lý
    onSave(formattedData, imagePreview || undefined);
  };
  
  const isAlive = formData.is_alive === 1;
  const isInLaw = formData.relation_status === 'in_law';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <form onSubmit={handleSubmit} className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl flex flex-col max-h-full overflow-hidden animate-in zoom-in-95">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b bg-stone-50 rounded-t-[2rem] shrink-0">
          <div>
            <h3 className="font-black text-xl text-stone-800 uppercase tracking-tight">
              {isNew ? 'THÊM THÀNH VIÊN MỚI' : `CHỈNH SỬA HỒ SƠ: ${formData.id}`}
            </h3>
            <p className="text-[11px] text-stone-500 font-bold uppercase mt-1">
              Người thao tác: {authorInfo?.role === 'super' || authorInfo?.role === 'sm' ? 'Trưởng tộc' : `Mod nhánh: ${authorInfo?.name || 'Ẩn danh'}`}
            </p>
          </div>
          <button type="button" onClick={onCancel} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"><X size={24}/></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          
          {/* THÔNG TIN CƠ BẢN */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase flex items-center gap-2">Thông tin cơ bản</h4>
            <div className="flex flex-col sm:flex-row gap-6">
              
              {/* KHU VỰC ẢNH ĐẠI DIỆN */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="w-28 h-28 rounded-3xl bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden relative group">
                  {imagePreview ? (
                    <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
                  ) : formData.avatar_url ? (
                    <img src={formData.avatar_url} className="w-full h-full object-cover absolute inset-0 z-10" onError={(e) => e.currentTarget.style.display='none'} />
                  ) : null}
                  <User size={40} className="text-stone-300 absolute z-0" />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-20 cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="text-white" size={24} />
                  </div>
                </div>
                <input type="file" accept="image/jpeg, image/png, image/webp" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
                
                <div className="flex flex-col w-full gap-2 mt-1">
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="text-[10px] w-full justify-center font-black bg-stone-100 hover:bg-stone-200 px-3 py-2 rounded-lg flex items-center gap-1 uppercase transition-colors">
                      {isCompressing ? <Loader2 size={14} className="animate-spin" /> : 'Thay Ảnh'}
                    </button>
                    {(imagePreview || formData.avatar_url) && (
                        <button type="button" onClick={handleRemoveImage} className="text-[10px] w-full justify-center font-black text-red-500 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg flex items-center gap-1 uppercase transition-colors">
                          <Trash2 size={14} /> Xóa Ảnh
                        </button>
                    )}
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">* Họ và tên</label>
                  <input required type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 ring-blue-500 outline-none font-bold" 
                         value={formData.full_name} 
                         onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
                         onBlur={(e) => setFormData({...formData, full_name: formatTitleCase(e.target.value)})} />
                </div>
                <div>
                  <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Biệt danh / Tên tự</label>
                  <input type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 focus:ring-2 ring-blue-500 outline-none" 
                         value={formData.alias} 
                         onChange={(e) => setFormData({...formData, alias: e.target.value})} 
                         onBlur={(e) => setFormData({...formData, alias: formatTitleCase(e.target.value)})} />
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
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-green-700"><input type="radio" checked={isAlive} onChange={() => setFormData({...formData, is_alive: 1})} /> Còn sống</label>
                    <label className="flex items-center gap-2 text-sm font-bold cursor-pointer text-red-700"><input type="radio" checked={!isAlive} onChange={() => setFormData({...formData, is_alive: 0})} /> Đã mất</label>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* THÔNG TIN SINH / TỬ */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Thông tin Sinh / Tử</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
              
              <div className="p-4 rounded-xl border border-stone-200 bg-stone-50 space-y-3 h-full">
                <label className="text-[10px] font-black text-stone-500 uppercase block">Ngày Sinh (DD/MM/YYYY)</label>
                <div className="flex gap-2">
                  <input type="text" maxLength={2} placeholder="DD" className="w-16 p-2 rounded-lg border text-center text-sm outline-none focus:border-blue-500" value={birth.dd} onChange={(e) => setBirth({...birth, dd: e.target.value.replace(/\D/g, '')})} /> /
                  <input type="text" maxLength={2} placeholder="MM" className="w-16 p-2 rounded-lg border text-center text-sm outline-none focus:border-blue-500" value={birth.mm} onChange={(e) => setBirth({...birth, mm: e.target.value.replace(/\D/g, '')})} /> /
                  <input type="text" maxLength={4} placeholder="YYYY" className="w-24 p-2 rounded-lg border text-center text-sm outline-none focus:border-blue-500" value={birth.yyyy} onChange={(e) => setBirth({...birth, yyyy: e.target.value.replace(/\D/g, '')})} />
                </div>
                <label className="flex items-center gap-2 text-xs text-stone-500"><input type="checkbox" checked={birth.isApproximate} onChange={(e) => setBirth({...birth, isApproximate: e.target.checked})} /> Chỉ nhớ khoảng năm</label>
              </div>

              <div className="space-y-4">
                {!isAlive && (
                  <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 relative shadow-sm animate-in fade-in">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-[10px] font-black text-orange-800 uppercase tracking-widest">
                        Ngày giỗ (Âm Lịch)
                      </label>
                      <span className="text-[10px] text-orange-600 font-bold italic">
                        Tháng nhuận lấy tháng chính
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <input 
                        type="text" 
                        placeholder="DD" 
                        maxLength={2}
                        value={lunarDeathDay}
                        onChange={(e) => setLunarDeathDay(e.target.value.replace(/\D/g, ''))}
                        className="w-16 p-2 text-center border border-orange-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none font-bold text-orange-900"
                      />
                      <span className="text-orange-400 font-black">/</span>
                      <input 
                        type="text" 
                        placeholder="MM" 
                        maxLength={2}
                        value={lunarDeathMonth}
                        onChange={(e) => setLunarDeathMonth(e.target.value.replace(/\D/g, ''))}
                        className="w-16 p-2 text-center border border-orange-200 rounded-lg text-sm bg-white focus:ring-2 focus:ring-orange-400 outline-none font-bold text-orange-900"
                      />
                      <span className="text-xs text-orange-600 ml-2 italic">
                        (VD: 10/03)
                      </span>
                    </div>
                    
                    {previewSolarAnniversary && (
                      <div className="mt-3 text-[11px] font-bold text-blue-800 bg-blue-100/50 p-2 rounded-lg border border-blue-100 flex items-center gap-2">
                        <span>🗓️</span> Giỗ Dương lịch sắp tới: {previewSolarAnniversary}
                      </div>
                    )}
                  </div>
                )}

                <div className={`p-4 rounded-xl border space-y-3 transition-colors ${isAlive ? 'bg-stone-100 border-transparent opacity-60' : 'bg-stone-50 border-stone-200'}`}>
                  <label className="text-[10px] font-black text-stone-500 uppercase flex items-center gap-1">Ngày Mất Dương Lịch (Nếu Nhớ)</label>
                  <div className="flex gap-2">
                    <input disabled={isAlive} type="text" maxLength={2} placeholder="DD" className="w-16 p-2 rounded-lg border text-center text-sm outline-none focus:border-stone-400 disabled:bg-stone-200" value={death.dd} onChange={(e) => setDeath({...death, dd: e.target.value.replace(/\D/g, '')})} /> /
                    <input disabled={isAlive} type="text" maxLength={2} placeholder="MM" className="w-16 p-2 rounded-lg border text-center text-sm outline-none focus:border-stone-400 disabled:bg-stone-200" value={death.mm} onChange={(e) => setDeath({...death, mm: e.target.value.replace(/\D/g, '')})} /> /
                    <input disabled={isAlive} type="text" maxLength={4} placeholder="YYYY" className="w-24 p-2 rounded-lg border text-center text-sm outline-none focus:border-stone-400 disabled:bg-stone-200" value={death.yyyy} onChange={(e) => setDeath({...death, yyyy: e.target.value.replace(/\D/g, '')})} />
                  </div>
                  <label className="flex items-center gap-2 text-xs text-stone-500"><input disabled={isAlive} type="checkbox" checked={death.isApproximate} onChange={(e) => setDeath({...death, isApproximate: e.target.checked})} /> Chỉ nhớ khoảng năm</label>
                </div>
              </div>
            </div>
          </div>

          {/* QUAN HỆ GIA ĐÌNH */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Quan hệ gia đình</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 flex items-center gap-1">* Kiểu quan hệ</label>
                  <select 
                    className={`w-full p-3 rounded-xl border text-sm font-bold outline-none transition-colors ${isInLaw ? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed' : 'bg-white border-blue-200 text-blue-900 focus:border-blue-500'}`} 
                    value={formData.relation_status}
                    onChange={(e) => setFormData({...formData, relation_status: e.target.value})}
                    disabled={isInLaw} 
                  >
                  <option value="biological">Con ruột</option>
                  <option value="adopted">Con nuôi</option>
                  <option value="in_law">Dâu / Rể</option>
                  <option value="step">Con riêng</option>
                </select>
              </div>

              {!isInLaw && (
                  <div>
                    <label className="text-[10px] font-black text-stone-500 uppercase mb-1 flex items-center gap-1">Thứ tự trong nhà (Sinh thứ mấy) <HelpTooltip text="Giúp sắp xếp anh em trên cây từ trái qua phải." /></label>
                    <input type="number" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500" placeholder="Ví dụ: 1, 2..." value={formData.rank_in_family || ''} onChange={(e) => setFormData({...formData, rank_in_family: parseInt(e.target.value)})} />
                  </div>
              )}

              {parentInfo && (
                  <>
                    <div className="p-4 rounded-xl border bg-stone-50 border-stone-200">
                        <label className="text-[10px] font-black text-stone-500 uppercase mb-2 block">
                            * {parentInfo.bloodline.gender === 'M' ? 'Cha' : 'Mẹ'} (Người mang dòng họ)
                        </label>
                        <input disabled type="text" className="w-full p-3 bg-stone-200 rounded-lg border border-stone-300 font-bold text-sm text-stone-600" value={parentInfo.bloodline.full_name || parentInfo.bloodline.fullName} />
                    </div>
                    <div className="p-4 rounded-xl border bg-blue-50 border-blue-200">
                        <label className="text-[10px] font-black text-blue-800 uppercase mb-2 flex items-center gap-1">
                            * {parentInfo.otherRole === 'mother_id' ? 'Mẹ' : 'Cha'} (Khác họ) <HelpTooltip text="Chọn Không nếu là con riêng hoặc chưa rõ thông tin." />
                        </label>
                        <select 
                            className="w-full p-3 bg-white rounded-lg border border-blue-200 font-bold text-sm outline-none focus:border-blue-500 text-blue-900"
                            value={formData[parentInfo.otherRole] || ''}
                            onChange={(e) => setFormData({...formData, [parentInfo.otherRole]: e.target.value })}
                        >
                            <option value="">-- KHÔNG (Con riêng / Chưa rõ) --</option>
                            {parentInfo.spouses.map((s:any) => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>
                  </>
              )}

              {isInLaw && formData._bloodlineSpouseId && (
                  <>
                    <div className="p-4 rounded-xl border bg-stone-50 border-stone-200">
                        <label className="text-[10px] font-black text-stone-500 uppercase mb-2 block">
                            {formData.gender === 'M' ? 'Là Chồng của' : 'Là Vợ của'}
                        </label>
                        <input disabled type="text" className="w-full p-3 bg-stone-200 rounded-lg border border-stone-300 font-bold text-sm text-stone-600" 
                               value={allMembers.find(m => m.id === formData._bloodlineSpouseId)?.full_name || allMembers.find(m => m.id === formData._bloodlineSpouseId)?.fullName} />
                    </div>
                    <div className="p-4 rounded-xl border bg-pink-50 border-pink-200">
                        <label className="text-[10px] font-black text-pink-800 uppercase mb-2 block">Tình trạng hôn nhân</label>
                        <select 
                            className="w-full p-3 bg-white rounded-lg border border-pink-200 font-bold text-sm outline-none text-pink-900"
                            value={formData._marriageStatus}
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

          {/* THÔNG TIN BỔ SUNG */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-800 border-b-2 border-blue-100 pb-2 uppercase">Thông tin bổ sung</h4>
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">{isAlive ? 'Nơi ở hiện tại' : 'Nơi an táng'}</label>
                <input type="text" className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Tiểu sử chi tiết</label>
                <textarea rows={3} className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500 text-sm" placeholder="Ghi chú về cuộc đời, sự nghiệp, công trạng..." value={formData.biography} onChange={(e) => setFormData({...formData, biography: e.target.value})}></textarea>
              </div>
              <div>
                <label className="text-[10px] font-black text-stone-500 uppercase mb-1 block">Ghi chú bổ sung</label>
                <textarea 
                  rows={2} 
                  className="w-full p-3 bg-stone-50 rounded-xl border border-stone-200 outline-none focus:border-blue-500 text-sm" 
                  placeholder="Thông tin thông gia, số điện thoại, người tổ chức giỗ, ghi chú khác..." 
                  value={formData.notes} 
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>
            </div>
          </div>
        </div>

        {/* BÀN PHÍM CHỨC NĂNG */}
        <div className="p-6 border-t bg-stone-50 rounded-b-[2rem] flex flex-col sm:flex-row gap-3 shrink-0">
          <button type="submit" className="flex-[2] py-4 bg-[#704214] text-white rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg hover:bg-[#8a5219] transition-all text-sm uppercase tracking-wider">
            <Save size={20} /> {isNew ? 'THÊM VÀO GIA PHẢ' : 'LƯU THAY ĐỔI'}
          </button>
          
          {!isNew && onDelete && (
            <button type="button" onClick={() => onDelete(formData.id)} className="flex-1 py-4 text-red-600 bg-red-100 hover:bg-red-200 font-bold flex items-center justify-center gap-2 rounded-2xl transition-colors text-xs uppercase">
              <Trash2 size={16} /> Chuyển vào Thùng rác
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default MemberForm;
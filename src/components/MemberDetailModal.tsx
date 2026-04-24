// src/components/MemberDetailModal.tsx -- version 2.9

import React, { useState, useMemo } from 'react';
import { X, User, Calendar, MapPin, BookOpen, Quote, Users, Heart, Baby, AlertCircle } from 'lucide-react';
// @ts-ignore
import { Lunar, Solar } from 'lunar-javascript';

interface DateInfo { 
  dd: number | null; 
  mm: number | null; 
  yyyy: number | null; 
  isApproximate?: boolean; 
  displayText?: string; 
}

interface Member {
  id: string; 
  fullName: string; 
  nickname?: string; 
  gender: 'M' | 'F';
  relationType: 'biological' | 'adopted' | 'in_law' | 'step';
  lifeStatus: 'alive' | 'deceased';
  parents?: { fatherId: string | null; motherId: string | null };
  spouses?: { id: string; status: 'current' | 'divorced' | 'widowed'; type: 'primary' | 'secondary' }[];
  birth?: DateInfo; 
  death?: DateInfo; 
  avatarUrl?: string;
  deathAnniversary?: { dd: number | null; mm: number | null; displayText?: string };
  note?: string; 
  biography?: string; 
  location?: string;
}

interface Props { 
  member: Member; 
  members: Member[]; 
  onClose: () => void; 
}

const MemberDetailModal: React.FC<Props> = ({ member, members, onClose }) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const displayAvatar = useMemo(() => {
    const localImg = localStorage.getItem(`mock_git_src/assets/images/${member.id}.webp`);
    if (localImg) {
      return localImg.startsWith('data:') ? localImg : `data:image/webp;base64,${localImg}`;
    }
    return member.avatarUrl;
  }, [member.id, member.avatarUrl]);
  // --- LOGIC TRUY XUẤT DỮ LIỆU GIA ĐÌNH ---
  const father = members.find(m => m.id === member.parents?.fatherId);
  const mother = members.find(m => m.id === member.parents?.motherId);
  
  const siblings = useMemo(() => {
    const fId = member.parents?.fatherId;
    const mId = member.parents?.motherId;
    if (!fId && !mId) return [];

    return members.filter(m => 
      m.id !== member.id && 
      ((fId && m.parents?.fatherId === fId) || (mId && m.parents?.motherId === mId))
    );
  }, [member, members]);

  const spousesWithChildren = useMemo(() => (member.spouses || []).map(s => {
    const spouseDetail = members.find(m => m.id === s.id);
    const children = members.filter(m => {
      if (member.gender === 'M') {
        return m.parents?.fatherId === member.id && m.parents?.motherId === s.id;
      } else {
        return m.parents?.motherId === member.id && m.parents?.fatherId === s.id;
      }
    });
    return { ...s, spouseDetail, children };
  }), [member, members]);

  // --- LOGIC TÍNH NGÀY GIỖ DƯƠNG LỊCH (Sử dụng lunar-javascript) ---
  const nextSolarAnniversary = useMemo(() => {
    // FIX LỖI 1: Bắt buộc phải có đủ dd và mm mới tính toán
    if (!member.deathAnniversary || !member.deathAnniversary.dd || !member.deathAnniversary.mm) {
      return null;
    }

    try {
      const now = Solar.fromDate(new Date());
      const currentYear = now.getYear();

      const lunar = Lunar.fromYmd(currentYear, member.deathAnniversary.mm, member.deathAnniversary.dd);
      let solar = lunar.getSolar();

      if (solar.toYmd() < now.toYmd()) {
        const nextLunar = Lunar.fromYmd(currentYear + 1, member.deathAnniversary.mm, member.deathAnniversary.dd);
        solar = nextLunar.getSolar();
      }

      const solarDate = solar.toYmd().split('-');
      return `${solarDate[2]}/${solarDate[1]}/${solarDate[0]}`;
    } catch (err) {
      console.error("Lỗi tính toán lịch âm dương:", err);
      return "Dữ liệu âm lịch không hợp lệ";
    }
  }, [member.deathAnniversary]);

  // FIX LỖI 2: Hàm formatDate đọc cờ isApproximate
  const formatDate = (date?: DateInfo) => {
    if (!date) return "Không rõ";
    
    // Nếu có cờ "Chỉ nhớ khoảng năm" VÀ có năm
    if (date.isApproximate && date.yyyy) {
      return `Khoảng năm ${date.yyyy}`;
    }
    
    // Nếu có đoạn text hiển thị riêng (tùy chọn)
    if (date.displayText) {
      return date.displayText;
    }

    // Nếu không có năm thì coi như không rõ
    if (!date.yyyy) return "Không rõ";

    // Trả về định dạng chuẩn
    const d = date.dd ? String(date.dd).padStart(2, '0') : '??';
    const m = date.mm ? String(date.mm).padStart(2, '0') : '??';
    return `${d}/${m}/${date.yyyy}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* HEADER */}
        <div className={`p-6 text-white flex justify-between items-start ${member.gender === 'M' ? 'bg-blue-800' : 'bg-pink-800'}`}>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{member.fullName.toUpperCase()}</h2>
            {member.nickname && <p className="text-white/80 italic text-lg">"{member.nickname}"</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TRẠNG THÁI & HÌNH ẢNH CHÂN DUNG */}
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-4">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
                <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Trạng thái</p>
                <p className="text-base font-bold text-stone-700">{member.lifeStatus === 'alive' ? '🟢 Còn sống' : '⚪ Đã mất'}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
                <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Quan hệ dòng tộc</p>
                <p className="text-base font-bold text-stone-700">
                  {member.relationType === 'biological' ? '🧬 Con ruột' : 
                   member.relationType === 'adopted' ? '👨‍👧 Con nuôi' : 
                   member.relationType === 'in_law' ? '🤝 Dâu/Rể' : 'Con riêng'}
                </p>
              </div>
            </div>

            <div className="w-32 sm:w-40 shrink-0">
              <div 
                className="aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border-4 border-white shadow-lg cursor-zoom-in hover:brightness-110 transition-all relative"
                onClick={() => setShowFullImage(true)}
              >
                {displayAvatar && (
                  <img 
                    src={displayAvatar} 
                    className="w-full h-full object-cover absolute inset-0 z-10" 
                    alt="Portrait" 
                    onError={(e) => e.currentTarget.style.display = 'none'}
                  />
                )}
                <div className="w-full h-full flex items-center justify-center text-stone-300 absolute inset-0 z-0">
                  <User size={48} />
                </div>
              </div>
            </div>
          </div>

          {/* NGÀY SINH & NGÀY MẤT */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3"><Calendar size={20} className="text-green-600" /> <span className="text-sm font-semibold text-stone-700">Ngày sinh: {formatDate(member.birth)}</span></div>
            {member.lifeStatus === 'deceased' && (
              <>
                <div className="flex items-center gap-3"><Calendar size={20} className="text-stone-400" /> <span className="text-sm font-semibold text-stone-700">Ngày mất: {formatDate(member.death)}</span></div>
                
                {/* HIỂN THỊ GIỖ ÂM (Sửa để chỉ hiện khi có dữ liệu) */}
                {member.deathAnniversary?.displayText && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <div className="flex-1 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                      <p className="text-[10px] text-amber-600 font-black uppercase">Ngày giỗ (Âm lịch)</p>
                      <p className="text-xl font-black text-amber-900 mt-1">Ngày {member.deathAnniversary.dd || '??'} tháng {member.deathAnniversary.mm || '??'}</p>
                    </div>
                    {/* Chỉ hiện block Dương lịch nếu tính toán thành công */}
                    {nextSolarAnniversary && (
                      <div className="flex-1 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] text-blue-600 font-black uppercase">Ngày giỗ sắp tới (Dương lịch)</p>
                        <p className="text-xl font-black text-blue-900 mt-1">{nextSolarAnniversary}</p>
                        <p className="text-[9px] text-blue-500/70 italic mt-3 leading-tight border-t border-blue-200/50 pt-1.5 flex items-start gap-1">
                          <AlertCircle size={10} className="shrink-0 mt-0.5" />
                          Ngày giỗ theo Dương lịch chỉ được tính theo tháng chính, không tính tháng nhuận.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {member.biography && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-400"><BookOpen size={18} /><span className="text-[10px] uppercase font-black">Tiểu sử chi tiết</span></div>
              <div className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-2xl italic border border-stone-100 shadow-inner">{member.biography}</div>
            </div>
          )}

          {member.relationType !== 'in_law' && (father || mother) && (
            <div className="space-y-2 pt-4 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 uppercase font-black">Thông tin cha mẹ</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">Cha: <span className="font-bold text-stone-800">{father?.fullName || "Không rõ"}</span></div>
                <div className="text-sm">Mẹ: <span className="font-bold text-stone-800">{mother?.fullName || "Không rõ"}</span></div>
              </div>
            </div>
          )}

          {siblings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-400"><Users size={16} /><span className="text-[10px] uppercase font-black">Anh chị em ruột</span></div>
              <div className="flex flex-wrap gap-2">
                {siblings.map(s => (
                  <span key={s.id} className="px-3 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600 border border-stone-200">{s.fullName}</span>
                ))}
              </div>
            </div>
          )}

          {spousesWithChildren.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-stone-400"><Heart size={16} /><span className="text-[10px] uppercase font-black">Vợ / Chồng & Con cái</span></div>
              {spousesWithChildren.map(s => (
                <div key={s.id} className="p-4 bg-stone-50/50 rounded-2xl border border-stone-100 space-y-3">
                  <div className="text-sm font-bold text-[#704214]">{member.gender === 'M' ? 'Vợ: ' : 'Chồng: '}{s.spouseDetail?.fullName}</div>
                  {s.children.length > 0 && (
                    <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-stone-200">
                      {s.children.map(child => (
                        <div key={child.id} className="text-xs text-stone-600 flex items-center gap-2">
                          <Baby size={12} className="text-stone-400"/> {child.fullName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {member.location && (
            <div className="flex items-start gap-3 border-t border-stone-100 pt-4">
              <MapPin size={18} className="text-red-500 mt-0.5" />
              <div className="text-sm text-stone-700 italic">
                {member.lifeStatus === 'alive' ? 'Đang sinh sống tại ' : 'Mộ phần tọa lạc tại '}
                {member.location}
              </div>
            </div>
          )}

          {member.note && (
            <div className="flex items-start gap-3 border-t border-stone-100 pt-4">
              <Quote size={18} className="text-blue-500 mt-1" />
              <div className="text-sm text-stone-500 italic leading-snug">{member.note}</div>
            </div>
          )}
        </div>
      </div>

      {showFullImage && displayAvatar && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setShowFullImage(false)}>
          <img src={displayAvatar} className="max-w-full max-h-full rounded-lg shadow-2xl" alt="Full Resolution" />
          <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/10 rounded-full transition-colors"><X size={32} /></button>
        </div>
      )}
    </div>
  );
};

export default MemberDetailModal;
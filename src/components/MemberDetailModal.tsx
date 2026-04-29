// src/components/MemberDetailModal.tsx -- version 4.3

import React, { useState, useMemo } from 'react';
import { X, User, Calendar, MapPin, BookOpen, Quote, Users, Heart, HeartOff, Baby } from 'lucide-react';
import { getNextSolarAnniversary } from '../utils/lunarUtils';

interface Member {
  id: string; 
  full_name: string; 
  alias?: string; 
  gender: 'M' | 'F';
  relation_status: 'biological' | 'adopted' | 'in_law' | 'step';
  is_alive: number; 
  father_id?: string | null; 
  mother_id?: string | null;
  spouses?: { id: string; status: 'current' | 'divorced' | 'widowed' }[];
  birthday?: string | null; 
  is_birth_approximate?: number;
  death_date?: string | null; 
  is_death_approximate?: number;
  lunar_death_date?: string | null; // Cột dữ liệu mới lưu ngày giỗ Âm lịch (DD/MM)
  location?: string;
  biography?: string;
  notes?: string;
  avatar_url?: string | null;
}

interface Props { 
  member: Member; 
  members: Member[]; 
  onClose: () => void; 
}

const MemberDetailModal: React.FC<Props> = ({ member, members, onClose }) => {
  const [showFullImage, setShowFullImage] = useState(false);

  // 1. Xử lý ảnh hiển thị (Ưu tiên Cache Local > R2 URL)
  const displayAvatar = useMemo(() => {
    return member.avatar_url;
  }, [member.avatar_url]);

  // 2. Tự động tính toán ngày giỗ Dương lịch sắp tới từ Ngày giỗ Âm lịch
  const nextSolarDate = useMemo(() => {
    return getNextSolarAnniversary(member.lunar_death_date);
  }, [member.lunar_death_date]);

  // 3. Truy xuất thông tin gia đình
  const father = members.find(m => m.id === member.father_id);
  const mother = members.find(m => m.id === member.mother_id);
  const siblings = members.filter(m => m.id !== member.id && ((member.father_id && m.father_id === member.father_id) || (member.mother_id && m.mother_id === member.mother_id)));

  const spousesWithChildren = (member.spouses || []).map(s => {
    const spouseDetail = members.find(m => m.id === s.id);
    const children = members.filter(m => member.gender === 'M' ? (m.father_id === member.id && m.mother_id === s.id) : (m.mother_id === member.id && m.father_id === s.id));
    return { ...s, spouseDetail, children };
  });

  const renderSpouseLabel = (spouseGender: string, status: string) => {
    const title = spouseGender === 'F' ? 'Vợ' : 'Chồng';
    const isActive = status === 'current';

    const icon = isActive
      ? <Heart size={14} className="text-rose-500 fill-rose-500 shrink-0" />
      : <HeartOff size={14} className="text-stone-400 shrink-0" />;

    return (
      <span className="flex items-center gap-1.5">
        {icon}
        <span>{title}:</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] relative">
        
        {/* HEADER */}
        <div className={`p-6 text-white flex justify-between items-start ${member.gender === 'M' ? 'bg-blue-800' : 'bg-pink-800'}`}>
          <div>
            <h2 className="text-2xl font-black tracking-tight">{member.full_name.toUpperCase()}</h2>
            {member.alias && <p className="text-white/80 italic text-lg">"{member.alias}"</p>}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X size={28} /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          <div className="flex gap-6 items-start">
            <div className="flex-1 space-y-4">
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
                <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Trạng thái</p>
                <p className="text-base font-bold text-stone-700">{member.is_alive === 1 ? '🟢 Còn sống' : '⚪ Đã mất'}</p>
              </div>
              <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 shadow-sm">
                <p className="text-[10px] text-stone-400 uppercase font-black mb-1">Quan hệ dòng tộc</p>
                <p className="text-base font-bold text-stone-700">{member.relation_status === 'biological' ? '🧬 Con ruột' : member.relation_status === 'in_law' ? '🤝 Dâu/Rể' : 'Con nuôi/riêng'}</p>
              </div>
            </div>
            <div className="w-32 sm:w-40 shrink-0">
              <div className="aspect-[3/4] bg-stone-100 rounded-2xl overflow-hidden border-4 border-white shadow-lg cursor-zoom-in relative" onClick={() => setShowFullImage(true)}>
                {displayAvatar && <img src={displayAvatar} className="w-full h-full object-cover absolute inset-0 z-10" alt="Portrait" />}
                <div className="w-full h-full flex items-center justify-center text-stone-300 absolute inset-0 z-0"><User size={48} /></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center gap-3"><Calendar size={20} className="text-green-600" /> <span className="text-sm font-semibold text-stone-700">Ngày sinh: {member.birthday || "Không rõ"}</span></div>
            
            {member.is_alive === 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-3"><Calendar size={20} className="text-stone-400" /> <span className="text-sm font-semibold text-stone-700">Ngày mất Dương lịch: {member.death_date || "Không rõ"}</span></div>
                
                {/* KHỐI HIỂN THỊ NGÀY GIỖ THÔNG MINH */}
                {member.lunar_death_date && (
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-center shadow-sm">
                      <p className="text-[10px] text-orange-600 font-black uppercase tracking-widest">Ngày Giỗ (Âm Lịch)</p>
                      <p className="text-2xl font-black text-orange-900 mt-1">{member.lunar_death_date}</p>
                    </div>
                    {nextSolarDate && (
                      <div className="flex-1 p-4 bg-blue-50 rounded-2xl border border-blue-100 text-center shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] font-black px-2 py-0.5 rounded-bl-lg uppercase">Sắp tới</div>
                        <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">Giỗ Dương Lịch {nextSolarDate.split('/')[2]}</p>
                        <p className="text-2xl font-black text-blue-900 mt-1">{nextSolarDate.split('/').slice(0,2).join('/')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {member.biography && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-400"><BookOpen size={18} /><span className="text-[10px] uppercase font-black">Tiểu sử</span></div>
              <div className="text-sm text-stone-600 leading-relaxed bg-stone-50 p-4 rounded-2xl italic border border-stone-100 shadow-inner">{member.biography}</div>
            </div>
          )}

          {/* THÔNG TIN GIA ĐÌNH */}
          {member.relation_status !== 'in_law' && (father || mother) && (
            <div className="space-y-2 pt-4 border-t border-stone-100">
              <p className="text-[10px] text-stone-400 uppercase font-black">Thông tin cha mẹ</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-sm">Cha: <span className="font-bold text-stone-800">{father?.full_name || "Không rõ"}</span></div>
                <div className="text-sm">Mẹ: <span className="font-bold text-stone-800">{mother?.full_name || "Không rõ"}</span></div>
              </div>
            </div>
          )}

          {siblings.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-stone-400"><Users size={16} /><span className="text-[10px] uppercase font-black">Anh chị em ruột</span></div>
              <div className="flex flex-wrap gap-2">
                {siblings.map(s => (
                  <span key={s.id} className="px-3 py-1 bg-stone-100 rounded-full text-xs font-medium text-stone-600 border border-stone-200">{s.full_name}</span>
                ))}
              </div>
            </div>
          )}

          {spousesWithChildren.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-stone-400"><Heart size={16} /><span className="text-[10px] uppercase font-black">Vợ / Chồng & Con cái</span></div>
                {spousesWithChildren.map(s => {
                  const spouseName = s.spouseDetail?.full_name || 'Không rõ';
                  const spouseGender = s.spouseDetail?.gender || (member.gender === 'M' ? 'F' : 'M');

                  return (
                    <div key={s.id} className="p-4 bg-stone-50/50 rounded-2xl border border-stone-100 space-y-3">
                      <div className="text-sm font-bold text-[#704214]">
                        <div className="flex items-center gap-2 px-4 py-3 bg-stone-50 rounded-xl border border-stone-100">
                          <span className="font-semibold text-[#704214] flex items-center gap-1.5 text-sm">
                            {renderSpouseLabel(spouseGender, s.status)}
                          </span>
                          <span className="text-stone-700 font-medium text-sm">{spouseName}</span>
                        </div>
                      </div>
                      {s.children.length > 0 && (
                        <div className="grid grid-cols-1 gap-2 pl-4 border-l-2 border-stone-200">
                          {s.children.map(child => (
                            <div key={child.id} className="text-xs text-stone-600 flex items-center gap-2"><Baby size={12} className="text-stone-400"/> {child.full_name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

          {member.location && (
            <div className="flex items-start gap-3 border-t border-stone-100 pt-4">
              <MapPin size={18} className="text-red-500 mt-0.5" />
              <div className="text-sm text-stone-700 italic">{member.is_alive === 1 ? 'Đang sinh sống tại ' : 'An nghỉ tại '}{member.location}</div>
            </div>
          )}

          {member.notes && (
            <div className="flex items-start gap-3 border-t border-stone-100 pt-4">
              <Quote size={18} className="text-blue-500 mt-1" />
              <div className="text-sm text-stone-500 italic leading-snug whitespace-pre-wrap">{member.notes}</div>
            </div>
          )}
        </div>
      </div>

      {showFullImage && displayAvatar && (
        <div className="fixed inset-0 z-[110] bg-black/90 flex items-center justify-center p-4" onClick={() => setShowFullImage(false)}>
          <img src={displayAvatar} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Full Resolution" />
        </div>
      )}
    </div>
  );
};

export default MemberDetailModal;
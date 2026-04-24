// src/components/TreeShare.tsx --version 3.1

import React, { useMemo, useState, useEffect } from 'react';
import { User, Target } from 'lucide-react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';

export interface DateInfo { dd: number | null; mm: number | null; yyyy: number | null; isApproximate?: boolean; displayText?: string; }
export interface Member {
  id: string; fullName: string; nickname?: string; gender: 'M' | 'F';
  relationType: 'biological' | 'adopted' | 'in_law' | 'step';
  lifeStatus: 'alive' | 'deceased';
  parents?: { fatherId: string | null; motherId: string | null };
  spouses?: { id: string; status: 'current' | 'divorced' | 'widowed'; type: 'primary' | 'secondary' | number }[];
  birth?: DateInfo; death?: DateInfo; avatarUrl?: string; siblingRank?: number;
}

export const formatDisplayName = (fullName: string, nickname?: string) => {
  const words = fullName.trim().split(/\s+/);

  // PHẪU THUẬT: Viết hoa chữ cái đầu cho TỪNG TỪ trong biệt danh
  const nickPart = nickname 
    ? ` (${nickname.trim().toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')})` 
    : '';

  if (words.length <= 1) return `${fullName.toUpperCase()}${nickPart}`;

  const first = words[0];
  const last = words[words.length - 1];
  const middleNames = words.slice(1, -1);
  const limit = 20;

  const buildNamePart = (mParts: string[]) => {
    const mid = mParts.length > 0 ? ` ${mParts.join(' ')} ` : ' ';
    return `${first}${mid}${last}`;
  };

  let currentMiddle = [...middleNames];
  let namePart = buildNamePart(currentMiddle);

  for (let i = 0; i < currentMiddle.length; i++) {
    if ((namePart + nickPart).length > limit) {
      currentMiddle[i] = currentMiddle[i][0] + '.';
      namePart = buildNamePart(currentMiddle);
    } else {
      break;
    }
  }

  return `${namePart.toUpperCase()}${nickPart}`;
};

export const getShortName = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
};

interface BaseCardProps {
  person: Member;
  members: Member[];
  isSpouse?: boolean;
  bloodlineName?: string;
  isAllowed?: boolean;
  onShowDetail?: (id: string) => void;
  onFocus?: (id: string) => void;
  renderExtraButtons?: React.ReactNode;
  renderCollapseButton?: React.ReactNode;
}

export const MemberCardBase: React.FC<BaseCardProps> = ({ 
  person, members, isSpouse = false, bloodlineName, isAllowed = true,
  onShowDetail, onFocus, renderExtraButtons, renderCollapseButton 
}) => {
  const icon = person.gender === 'M' ? '♂' : '♀';
  const displayAvatar = useMemo(() => {
    const localImg = localStorage.getItem(`public/images/${person.id}.webp`);
    if (localImg) {
      return localImg.startsWith('data:') ? localImg : `data:image/webp;base64,${localImg}`;
    }
    return person.avatarUrl;
  }, [person.id, person.avatarUrl]);

  const parentLabel = useMemo(() => {
    if (isSpouse) return person.gender === 'F' ? `👰🏻‍♀️Vợ ông ${bloodlineName}` : `🤵🏻Chồng bà ${bloodlineName}`;
    const father = members.find(m => m.id === person.parents?.fatherId);
    const mother = members.find(m => m.id === person.parents?.motherId);
    let indicator = person.relationType === 'biological' ? '🩸' : '👨‍👧';
    let text = '';
    if (father && mother) text = `Con ông ${getShortName(father.fullName)} & bà ${getShortName(mother.fullName)}`;
    else if (father) text = `Con ông ${getShortName(father.fullName)}`;
    else if (mother) text = `Con bà ${getShortName(mother.fullName)}`;
    else return null;
    return `${indicator}${text}`;
  }, [person, members, isSpouse, bloodlineName]);

 return (
    <div 
      id={person.id} 
      className={`flex flex-col w-[200px] bg-white rounded-lg shadow-xl border border-stone-200 overflow-hidden text-center transition-all select-none relative ${!isAllowed ? 'opacity-40 grayscale-[50%]' : ''}
        ${renderExtraButtons ? 'min-h-[285px]' : 'min-h-[240px]'} 
      `}
    >
      {/* 1. Header: Giới tính & Quan hệ */}
      <div className={`py-1.5 px-2 text-[10px] flex justify-between items-center font-bold ${person.gender === 'M' ? 'bg-blue-800 text-white' : 'bg-pink-800 text-white'}`}>
        <span className="shrink-0">{icon}</span>
        <span className="truncate ml-1 flex-1 text-right tracking-tight">{parentLabel}</span>
      </div>

      {/* 2. Tên thành viên */}
      <div className="py-3 px-2 border-b border-stone-100 bg-white flex items-center justify-center min-h-[55px]">
        <h4 className="text-[12px] font-black text-stone-800 leading-tight truncate w-full" title={formatDisplayName(person.fullName, person.nickname)}>
          {formatDisplayName(person.fullName, person.nickname)}
        </h4>
      </div>

      {/* 3. Phần Avatar: Tăng kích thước 10% (Từ 64px lên 70px) */}
      <div className="py-3 flex justify-center bg-stone-50/50 relative">
        <div 
          onClick={() => onShowDetail?.(person.id)}
          className={`relative w-[70px] h-[70px] rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-stone-200 cursor-pointer hover:scale-110 transition-transform ${person.relationType === 'adopted' ? 'border-dashed border-stone-400' : ''}`}
        >
          {displayAvatar && (
            <img 
              src={displayAvatar} 
              className="w-full h-full object-cover absolute inset-0 z-10" 
              onError={(e) => e.currentTarget.style.display = 'none'} 
            />
          )}
          <User size={36} className="text-stone-400 absolute z-0" />
        </div>
      </div>

      {/* 4. Phần Thông tin Năm & Cụm nút bấm (Đã đưa cụm nút xuống dưới) */}
      <div className="py-2.5 bg-white border-t border-stone-100 flex flex-col items-center gap-2">
        <p className="text-[10px] font-bold text-stone-600 flex justify-center items-center gap-1">
          {person.lifeStatus === 'deceased' 
            ? <>𓉸Năm mất: {person.death?.yyyy || '????'}</> 
            : <><span className="text-green-600">⛥</span>Năm sinh: {person.birth?.yyyy || '????'}</>}
        </p>

        {/* Cụm nút Focus & Collapse: Bố cục Flex tự nhiên thay vì Absolute chồng lấn */}
        <div className="flex gap-2 pb-1">
          {renderCollapseButton}
          {!isSpouse && (
            <button 
              onClick={(e) => { e.stopPropagation(); onFocus?.(person.id); }}
              className="bg-stone-50 rounded-full text-blue-600 hover:scale-110 transition-transform shadow-sm p-1 border border-stone-100"
              title="Tập trung vào nhánh này"
            >
              <Target size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 5. Nút Quản trị (Admin) */}
      <div className="mt-auto">
        {renderExtraButtons}
      </div>
    </div>
  );
};

export const useTreeCommonLogic = (members: Member[], transformRef: React.RefObject<ReactZoomPanPinchRef | null>) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return members.filter(m => 
      m.fullName.toLowerCase().includes(term) || m.nickname?.toLowerCase().includes(term)
    ).slice(0, 5);
  }, [searchTerm, members]);

  const handleSelectMember = (id: string) => {
    setSearchTerm('');
    setFocusId(null);
    const member = members.find(m => m.id === id);
    if (member && (member.parents?.fatherId || member.parents?.motherId)) {
      const newCollapsed = new Set(collapsedIds);
      if (member.parents?.fatherId) newCollapsed.delete(member.parents.fatherId);
      if (member.parents?.motherId) newCollapsed.delete(member.parents.motherId);
      setCollapsedIds(newCollapsed);
    }
    setTimeout(() => {
      transformRef.current?.zoomToElement(id, 1, 600);
    }, 100);
  };

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setCollapsedIds(newSet);
  };

  useEffect(() => {
    if (members.length > 0 && transformRef.current) {
      const timer = setTimeout(() => {
        transformRef.current?.centerView(0.6);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [members.length, focusId, transformRef]);

  const rootMember = useMemo(() => {
    if (focusId) return members.find(m => m.id === focusId);
    return members.find(m => (!m.parents?.fatherId && !m.parents?.motherId) && m.relationType === 'biological') || members[0];
  }, [members, focusId]);

  // PHẪU THUẬT: Thuật toán tính toán số Đời (Generation) của toàn bộ cây
  const generationMap = useMemo(() => {
    const map: Record<string, number> = {};
    const thuyTo = members.find(m => !m.parents?.fatherId && !m.parents?.motherId && m.relationType === 'biological');
    if (!thuyTo) return map;

    const compute = (memberId: string, gen: number) => {
      map[memberId] = gen;
      const member = members.find(m => m.id === memberId);
      
      // Gán cùng đời cho vợ/chồng
      if (member?.spouses) {
        member.spouses.forEach(s => { map[s.id] = gen; });
      }

      const children = members.filter(m => m.parents?.fatherId === memberId || m.parents?.motherId === memberId);
      children.forEach(child => compute(child.id, gen + 1));
    };

    compute(thuyTo.id, 0);
    return map;
  }, [members]);

  const maxGeneration = useMemo(() => {
    const values = Object.values(generationMap);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [generationMap]);

  return {
    searchTerm, setSearchTerm, collapsedIds, setCollapsedIds, selectedDetailId, setSelectedDetailId, 
    focusId, setFocusId, searchResults, handleSelectMember, toggleCollapse, rootMember,
    generationMap, maxGeneration // <--- Bổ sung thêm 2 trường này vào return
  };

};
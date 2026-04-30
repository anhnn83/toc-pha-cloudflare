// src/components/TreeShare.tsx -- version 3.8 (Golden Anniversary Highlight & 2-Line Name)

import React, { useMemo, useState } from 'react';
import { User, Target } from 'lucide-react';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { getNextSolarAnniversary } from '../utils/lunarUtils';

export interface DateInfo { dd: number | null; mm: number | null; yyyy: number | null; isApproximate?: boolean; displayText?: string; }
export interface Member {
  id: string; fullName: string; nickname?: string; gender: 'M' | 'F';
  relationType: 'biological' | 'adopted' | 'in_law' | 'step';
  lifeStatus: 'alive' | 'deceased';
  parents?: { fatherId: string | null; motherId: string | null };
  spouses?: { id: string; status: 'current' | 'divorced' | 'widowed'; type: 'primary' | 'secondary' | number }[];
  birth?: DateInfo; death?: DateInfo; avatarUrl?: string; siblingRank?: number;
  [key: string]: any; 
}

const extractYear = (dateStr?: string) => {
  if (!dateStr) return null;
  const parts = dateStr.split(/[-/]/);
  return parts.length === 3 ? parseInt(parts[2]) : parseInt(parts[0]);
};

export const formatDisplayName = (fullName: string, nickname?: string) => {
  if (!fullName) return nickname ? `(${nickname})` : "Ẩn danh";
  const words = fullName.trim().split(/\s+/);
  const nickPart = nickname ? ` (${nickname.trim().toLowerCase().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')})` : '';
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
    } else { break; }
  }
  return `${namePart.toUpperCase()}${nickPart}`;
};

export const getShortName = (fullName: string) => {
  if (!fullName) return "Ẩn danh";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1];
};

interface BaseCardProps {
  person: Member; members: Member[]; isSpouse?: boolean; bloodlineName?: string;
  isAllowed?: boolean; dichTonGen?: number | null;
  onShowDetail?: (id: string) => void; onFocus?: (id: string) => void;
  renderExtraButtons?: React.ReactNode; renderCollapseButton?: React.ReactNode;
}

export const MemberCardBase: React.FC<BaseCardProps> = ({ 
  person: rawPerson, members, isSpouse = false, bloodlineName, isAllowed = true, dichTonGen,
  onShowDetail, onFocus, renderExtraButtons, renderCollapseButton 
}) => {
  
  const person = useMemo(() => ({
    ...rawPerson,
    fullName: rawPerson.fullName || rawPerson.full_name || '',
    nickname: rawPerson.nickname || rawPerson.alias || '',
    avatarUrl: rawPerson.avatarUrl || rawPerson.avatar_url,
    lifeStatus: rawPerson.lifeStatus || (rawPerson.is_alive === 0 ? 'deceased' : 'alive'),
    relationType: rawPerson.relationType || rawPerson.relation_status,
    gender: rawPerson.gender || 'M',
    lunar_death_date: rawPerson.lunar_death_date || rawPerson.lunarDeathDate, // Trích xuất thêm ngày giỗ
    parents: rawPerson.parents || { fatherId: rawPerson.father_id, motherId: rawPerson.mother_id },
    birth: rawPerson.birth || { yyyy: extractYear(rawPerson.birthday) },
    death: rawPerson.death || { yyyy: extractYear(rawPerson.death_date) },
  }), [rawPerson]);

  const icon = person.gender === 'M' ? '♂' : '♀';
  
  const displayAvatar = useMemo(() => {
    const localImg = localStorage.getItem(`public/images/${person.id}.webp`);
    if (localImg) return localImg.startsWith('data:') ? localImg : `data:image/webp;base64,${localImg}`;
    return person.avatarUrl;
  }, [person.id, person.avatarUrl]);

  const parentLabel = useMemo(() => {
    if (isSpouse) return person.gender === 'F' ? `👰🏻‍♀️Vợ ông ${bloodlineName}` : `🤵🏻Chồng bà ${bloodlineName}`;
    const fatherRaw = members.find(m => m.id === person.parents?.fatherId);
    const motherRaw = members.find(m => m.id === person.parents?.motherId);
    const fatherName = fatherRaw ? (fatherRaw.fullName || fatherRaw.full_name) : null;
    const motherName = motherRaw ? (motherRaw.fullName || motherRaw.full_name) : null;
    let indicator = (person.relationType === 'biological' || person.relationType === 'step') ? '🩸' : '👨‍👧';
    
    if (fatherName && motherName) return `${indicator}Con ông ${getShortName(fatherName)} & bà ${getShortName(motherName)}`;
    if (fatherName) return `${indicator}Con ông ${getShortName(fatherName)}`;
    if (motherName) return `${indicator}Con bà ${getShortName(motherName)}`;
    return null;
  }, [person, members, isSpouse, bloodlineName]);

  const formattedNick = person.nickname ? person.nickname.trim().toLowerCase().split(/\s+/).map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : '';

  // BẢN VÁ: KIỂM TRA HÔM NAY CÓ PHẢI LÀ NGÀY GIỖ KHÔNG?
  const isAnniversaryToday = useMemo(() => {
    if (person.lifeStatus !== 'deceased' || !person.lunar_death_date) return false;
    const nextSolar = getNextSolarAnniversary(person.lunar_death_date);
    if (!nextSolar) return false;
    const today = new Date();
    const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
    return nextSolar === todayStr;
  }, [person]);

 return (
    <div 
      id={person.id} 
      // NẾU LÀ NGÀY GIỖ: Đổi thẻ thành màu Vàng Óng phát sáng
      className={`flex flex-col w-[200px] rounded-lg shadow-xl overflow-hidden text-center transition-all select-none relative ${!isAllowed ? 'opacity-40 grayscale-[50%]' : ''} ${renderExtraButtons ? 'min-h-[285px]' : 'min-h-[240px]'}
        ${isAnniversaryToday ? 'bg-gradient-to-b from-yellow-50 to-amber-100 border-2 border-yellow-400 shadow-[0_0_20px_rgba(251,191,36,0.6)] ring-1 ring-yellow-300' : 'bg-white border border-stone-200'}
      `}
    >
      <div className={`py-1.5 px-2 text-[10px] flex justify-between items-center font-bold ${isAnniversaryToday ? 'bg-amber-600 text-white' : person.gender === 'M' ? 'bg-blue-800 text-white' : 'bg-pink-800 text-white'}`}>
        <span className="shrink-0 flex items-center gap-0.5">
          {icon}
          {dichTonGen !== undefined && dichTonGen !== null && <span className="text-yellow-400 font-black animate-pulse" title={`Đích tôn đời ${dichTonGen}`}>({dichTonGen})</span>}
        </span>
        <span className="truncate ml-1 flex-1 text-right tracking-tight">{parentLabel}</span>
      </div>

      <div className={`py-2 px-2 border-b flex flex-col items-center justify-center min-h-[55px] w-full overflow-hidden ${isAnniversaryToday ? 'border-yellow-200/50' : 'bg-white border-stone-100'}`}>
        <h4 className={`text-[12px] font-black leading-tight truncate w-full ${isAnniversaryToday ? 'text-amber-900' : 'text-stone-800'}`} title={person.fullName}>
          {formatDisplayName(person.fullName)}
        </h4>
        {formattedNick && <div className={`text-[10px] font-bold italic truncate w-full mt-0.5 ${isAnniversaryToday ? 'text-amber-700' : 'text-stone-500'}`} title={person.nickname}>{formattedNick}</div>}
      </div>

      <div className={`py-3 flex justify-center relative ${isAnniversaryToday ? '' : 'bg-stone-50/50'}`}>
        <div onClick={() => onShowDetail?.(person.id)} className={`relative w-[70px] h-[70px] rounded-full border-4 border-white shadow-lg overflow-hidden flex items-center justify-center bg-stone-200 cursor-pointer hover:scale-110 transition-transform ${person.relationType === 'adopted' ? 'border-dashed border-stone-400' : ''}`}>
          {displayAvatar && <img src={displayAvatar} className="w-full h-full object-cover absolute inset-0 z-10" onError={(e) => e.currentTarget.style.display = 'none'} />}
          <User size={36} className="text-stone-400 absolute z-0" />
        </div>
      </div>

      <div className={`py-2.5 flex flex-col items-center gap-2 border-t ${isAnniversaryToday ? 'border-yellow-200/50' : 'bg-white border-stone-100'}`}>
        <p className={`text-[10px] font-bold flex justify-center items-center gap-1 ${isAnniversaryToday ? 'text-amber-800' : 'text-stone-600'}`}>
          {person.lifeStatus === 'deceased' ? <>𓉸Năm mất: {person.death?.yyyy || '????'}</> : <><span className="text-green-600">⛥</span>Năm sinh: {person.birth?.yyyy || '????'}</>}
        </p>
        <div className="flex gap-2 pb-1">
          {renderCollapseButton}
          {!isSpouse && <button onClick={(e) => { e.stopPropagation(); onFocus?.(person.id); }} className={`rounded-full hover:scale-110 transition-transform shadow-sm p-1 border ${isAnniversaryToday ? 'bg-amber-100 text-amber-600 border-amber-200' : 'bg-stone-50 text-blue-600 border-stone-100'}`}><Target size={14} /></button>}
        </div>
      </div>
      <div className="mt-auto">{renderExtraButtons}</div>
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
    return members.filter(m => {
      const name = (m.fullName || m.full_name || '').toLowerCase();
      const nick = (m.nickname || m.alias || '').toLowerCase();
      return name.includes(term) || nick.includes(term);
    }).slice(0, 5);
  }, [searchTerm, members]);

  const handleSelectMember = (id: string) => {
    setSearchTerm(''); setFocusId(null);
    const member = members.find(m => m.id === id);
    if (member) {
      const fId = member.parents?.fatherId || member.father_id;
      const mId = member.parents?.motherId || member.mother_id;
      if (fId || mId) {
        const newCollapsed = new Set(collapsedIds);
        if (fId) newCollapsed.delete(fId);
        if (mId) newCollapsed.delete(mId);
        setCollapsedIds(newCollapsed);
      }
    }
    setTimeout(() => { transformRef.current?.zoomToElement(id, 1, 600); }, 100);
  };

  const toggleCollapse = (id: string) => {
    const newSet = new Set(collapsedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setCollapsedIds(newSet);
  };

  const handleFocus = (id: string) => {
    setFocusId(id);
    setTimeout(() => { transformRef.current?.centerView(0.6, 600); }, 150);
  };

  const rootMember = useMemo(() => {
    if (focusId) return members.find(m => m.id === focusId);
    return members.find(m => {
      const fId = m.parents?.fatherId || m.father_id;
      const mId = m.parents?.motherId || m.mother_id;
      const rel = m.relationType || m.relation_status;
      return !fId && !mId && rel === 'biological';
    }) || members[0];
  }, [members, focusId]);

  const dichTonMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (!rootMember || rootMember.gender !== 'M') return map;

    let currentDT = rootMember;
    let currentGen = 0;
    map[currentDT.id] = currentGen;

    const getSons = (memberId: string) => {
      return members.filter(m => {
        const mFId = m.parents?.fatherId || (m as any).father_id;
        const mMId = m.parents?.motherId || (m as any).mother_id;
        const mRel = m.relationType || (m as any).relation_status;
        return (mFId === memberId || mMId === memberId) && m.gender === 'M' && mRel === 'biological';
      }).sort((a, b) => (Number(a.siblingRank || (a as any).rank_in_family) || 0) - (Number(b.siblingRank || (b as any).rank_in_family) || 0));
    };

    const findNextHeir = (member: any): Member | null => {
      const sons = getSons(member.id);
      if (sons.length > 0) return sons[0];

      const fId = member.parents?.fatherId || member.father_id;
      const mId = member.parents?.motherId || member.mother_id;
      const parentId = fId || mId;

      if (!parentId) return null;

      const allBrothers = members.filter(m => {
        const mFId = m.parents?.fatherId || (m as any).father_id;
        const mMId = m.parents?.motherId || (m as any).mother_id;
        const mRel = m.relationType || (m as any).relation_status;
        return (mFId === parentId || mMId === parentId) && m.gender === 'M' && mRel === 'biological';
      }).sort((a, b) => (Number(a.siblingRank || (a as any).rank_in_family) || 0) - (Number(b.siblingRank || (b as any).rank_in_family) || 0));

      const myIndex = allBrothers.findIndex(b => b.id === member.id);
      if (myIndex === -1) return null;

      const youngerBrothers = allBrothers.slice(myIndex + 1);

      for (const bro of youngerBrothers) {
        const broSons = getSons(bro.id);
        if (broSons.length > 0) return broSons[0];
      }

      return null;
    };

    while (true) {
      const nextDT = findNextHeir(currentDT);
      if (nextDT) {
        currentGen++;
        map[nextDT.id] = currentGen;
        currentDT = nextDT;
      } else { break; }
    }
    return map;
  }, [members, rootMember]);

  const generationMap = useMemo(() => {
    const map: Record<string, number> = {};
    const thuyTo = members.find(m => {
      const fId = m.parents?.fatherId || m.father_id;
      const mId = m.parents?.motherId || m.mother_id;
      const rel = m.relationType || m.relation_status;
      return !fId && !mId && rel === 'biological';
    });
    
    if (!thuyTo) return map;
    
    const compute = (memberId: string, gen: number) => {
      map[memberId] = gen;
      const member = members.find(m => m.id === memberId);
      if (member?.spouses) {
        member.spouses.forEach((s: any) => { map[s.id] = gen; });
      }
      const children = members.filter(m => {
        const mFId = m.parents?.fatherId || m.father_id;
        const mMId = m.parents?.motherId || m.mother_id;
        return mFId === memberId || mMId === memberId;
      });
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
    focusId, setFocusId, handleFocus, searchResults, handleSelectMember, toggleCollapse, rootMember,
    generationMap, maxGeneration, dichTonMap
  };
};
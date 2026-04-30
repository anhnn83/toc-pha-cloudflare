// src/components/TreeView.tsx -- version 3.4 (Golden Highlight in Anniversary Modal)

import React, { useMemo, useRef, useState } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Heart, HeartOff, PlusCircle, MinusCircle, Search, X, Crosshair, CalendarClock } from 'lucide-react';
import MemberDetailModal from './MemberDetailModal';
import { MemberCardBase, useTreeCommonLogic, getShortName } from './TreeShare';
import type { Member } from './TreeShare';
import { getNextSolarAnniversary } from '../utils/lunarUtils';

const TreeView: React.FC<{ members: Member[] }> = ({ members }) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  const logic = useTreeCommonLogic(members, transformRef);
  const [showAnniversaries, setShowAnniversaries] = useState(false);
  
  const selectedMember = useMemo(() => 
    members.find(m => m.id === logic.selectedDetailId), 
    [logic.selectedDetailId, members]
  );

  // --- BẢN VÁ: Lấy ngày hôm nay dưới dạng DD/MM/YYYY để so sánh ---
  const todayStr = useMemo(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  }, []);

  const anniversaryList = useMemo(() => {
    const getVisibleMemberIds = (rootId: string, acc: Set<string>) => {
      acc.add(rootId);
      const rootMember = members.find(m => m.id === rootId);
      if (rootMember && rootMember.spouses) {
        rootMember.spouses.forEach((s: any) => acc.add(s.id));
      }
      if (!logic.collapsedIds.has(rootId)) {
         const children = members.filter(m => m.father_id === rootId || m.mother_id === rootId);
         children.forEach(child => getVisibleMemberIds(child.id, acc));
      }
      return acc;
    };

    let visibleIds = new Set<string>();
    if (logic.rootMember) {
       visibleIds = getVisibleMemberIds(logic.rootMember.id, new Set());
    }

    const list = members
      .filter(m => visibleIds.has(m.id) && m.is_alive === 0 && m.lunar_death_date)
      .map(m => {
        const solarDateStr = getNextSolarAnniversary(m.lunar_death_date);
        let solarTimestamp = Infinity;
        let dayOfWeekShort = ''; 

        if (solarDateStr) {
           const [dd, mm, yyyy] = solarDateStr.split('/');
           const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
           solarTimestamp = dateObj.getTime();
           
           const daysShort = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
           dayOfWeekShort = daysShort[dateObj.getDay()];
        }
        return {
          id: m.id,
          name: m.full_name || m.fullName,
          alias: m.alias || m.nickname,
          lunarDate: m.lunar_death_date,
          solarDateStr,
          solarTimestamp,
          dayOfWeekShort 
        };
      })
      .filter(item => item.solarDateStr !== null);

    list.sort((a, b) => a.solarTimestamp - b.solarTimestamp);

    return list;
  }, [members, logic.rootMember, logic.collapsedIds, logic.focusId]);


  const renderNode = (nodeId: string) => {
    const person = members.find((m) => m.id === nodeId);
    if (!person) return null;

    const isCollapsed = logic.collapsedIds.has(person.id);
    const dichTonGen = logic.dichTonMap[person.id];

    const spouses = (person.spouses || []).flatMap((s: any) => {
      const obj = members.find(m => m.id === s.id);
      return obj ? [{ ...obj, relation_status: s.status }] : [];
    });

    const children = members
      .filter((m) => m.father_id === nodeId || m.mother_id === nodeId)
      .sort((a, b) => (a.rank_in_family || 99) - (b.rank_in_family || 99));

    return (
      <TreeNode
        key={person.id}
        label={
          <div className="inline-flex items-center justify-center relative py-6">
             <div className={`flex items-center gap-0 ${person.gender === 'F' ? 'flex-row-reverse' : 'flex-row'}`}>
                <MemberCardBase 
                  person={person} 
                  members={members} 
                  dichTonGen={dichTonGen} 
                  onShowDetail={logic.setSelectedDetailId}
                  onFocus={logic.handleFocus}
                  renderCollapseButton={
                    children.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); logic.toggleCollapse(person.id); }}
                        className="bg-white rounded-full text-[#704214] hover:scale-110 transition-transform shadow-md border border-stone-200"
                      >
                        {isCollapsed ? <PlusCircle size={20} fill="white" /> : <MinusCircle size={20} fill="white" />}
                      </button>
                    )
                  }
                />
                
                {spouses.map((spouse: any) => (
                  <React.Fragment key={spouse.id}>
                    <div className="flex items-center justify-center w-[12px] -mx-1 z-10">
                      {spouse.relation_status === 'divorced' 
                        ? <HeartOff size={16} className="text-stone-300 bg-[#f8f7f5] rounded-full" /> 
                        : <Heart size={16} className="text-red-500 bg-[#f8f7f5] rounded-full" fill="currentColor" />}
                    </div>
                    <MemberCardBase 
                      person={spouse} 
                      members={members} 
                      isSpouse 
                      bloodlineName={getShortName(person.full_name || person.fullName)} 
                      onShowDetail={logic.setSelectedDetailId}
                      onFocus={logic.handleFocus}
                    />
                  </React.Fragment>
                ))}
             </div>
          </div>
        }
      >
        {!isCollapsed && children.map((child) => renderNode(child.id))}
      </TreeNode>
    );
  };

  if (!logic.rootMember) return null;

  return (
    <div className="w-full h-full bg-[#f8f7f5] overflow-hidden relative">
      
      {/* THANH ĐIỀU KHIỂN BÊN TRÁI */}
      <div className="absolute top-6 left-6 z-40 flex flex-col gap-4 max-w-[calc(100vw-3rem)]">
        <div className="w-full sm:w-72 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-stone-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-3 border-2 border-[#704214]/10 rounded-2xl bg-white shadow-xl outline-none text-sm focus:border-[#704214]/40 transition-all"
            placeholder="Tìm theo tên hoặc biệt danh..."
            value={logic.searchTerm}
            onChange={(e) => logic.setSearchTerm(e.target.value)}
          />
          {logic.searchTerm && (
              <button onClick={() => logic.setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center">
                <X size={16} />
              </button>
            )}
            {logic.searchResults.length > 0 && (
              <div className="absolute top-full mt-1 left-0 right-0 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50 max-h-60 overflow-y-auto custom-scrollbar">
                {logic.searchResults.map((m: any) => (
                  <button
                    key={m.id}
                    onClick={() => logic.handleSelectMember(m.id)}
                    className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b last:border-0 border-stone-50 transition-colors flex flex-col"
                  >
                    <span>{(m.fullName || m.full_name)?.toUpperCase()}</span>
                    {(m.nickname || m.alias) && (
                      <span className="text-xs text-stone-400">({m.nickname || m.alias})</span>
                    )}
                  </button>
                ))}
              </div>
            )}
        </div>
        
        <div className="flex gap-4">
            <button 
            onClick={() => transformRef.current?.centerView(0.6)}
            className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-stone-200 flex items-center justify-center text-[#704214] hover:bg-stone-50 transition-colors shrink-0"
            title="Đưa về trung tâm"
            >
            <Crosshair size={20} />
            </button>

            <button 
            onClick={() => setShowAnniversaries(true)}
            className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-stone-200 flex items-center justify-center text-orange-600 hover:bg-orange-50 transition-colors shrink-0"
            title="Liệt kê ngày giỗ trong năm"
            >
            <CalendarClock size={20} />
            </button>
        </div>
      </div>

      {logic.focusId && (
        <button 
          onClick={() => logic.setFocusId(null)}
          className="absolute top-6 right-6 z-40 bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2"
        >
          <X size={16} /> <span className="hidden sm:inline">THOÁT TẬP TRUNG</span>
        </button>
      )}

      {/* DANH SÁCH NGÀY GIỖ (MODAL) */}
      {showAnniversaries && (
        <div className="absolute inset-0 z-50 flex justify-center sm:justify-start items-center sm:items-start p-4 sm:p-6 sm:pt-24 sm:pl-24 pointer-events-none">
           <div className="fixed inset-0 bg-black/40 sm:bg-black/20 pointer-events-auto backdrop-blur-sm transition-opacity" onClick={() => setShowAnniversaries(false)}></div>
           
           <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-2xl flex flex-col max-h-[85vh] sm:max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 sm:slide-in-from-left-8 pointer-events-auto relative z-10">
              <div className="flex justify-between items-center p-5 sm:p-6 border-b bg-orange-50 rounded-t-[2rem] shrink-0">
                  <div>
                    <h3 className="font-black text-lg sm:text-xl text-orange-900 uppercase tracking-tight flex items-center gap-2">
                        <CalendarClock size={24} className="shrink-0"/> <span className="truncate">Ngày Giỗ Trong Năm</span>
                    </h3>
                    <p className="text-[10px] sm:text-[11px] text-orange-600 font-bold uppercase mt-1">
                        Sắp xếp theo Ngày Dương lịch gần nhất
                    </p>
                  </div>
                  <button onClick={() => setShowAnniversaries(false)} className="p-2 text-orange-400 hover:text-red-500 hover:bg-orange-100 rounded-full transition-colors shrink-0 ml-2">
                      <X size={24}/>
                  </button>
              </div>

              <div className="flex-1 overflow-y-auto bg-white p-4 sm:p-6">
                 {anniversaryList.length > 0 ? (
                    <div className="border border-stone-200 rounded-2xl shadow-sm relative group bg-white">
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-white to-transparent opacity-100 sm:opacity-0 pointer-events-none z-10"></div>
                        
                        <div className="w-full overflow-x-auto custom-scrollbar pb-1">
                            <table className="w-full text-left border-collapse min-w-[450px]">
                                <thead className="bg-stone-50 border-b border-stone-200">
                                    <tr>
                                        <th className="p-3 text-[10px] font-black text-stone-400 uppercase text-center w-12 shrink-0">STT</th>
                                        <th className="p-3 text-[10px] font-black text-stone-400 uppercase whitespace-nowrap">Họ Tên (Biệt danh)</th>
                                        <th className="p-3 text-[10px] font-black text-stone-400 uppercase text-center whitespace-nowrap">Âm Lịch</th>
                                        <th className="p-3 text-[10px] font-black text-blue-700 uppercase text-right whitespace-nowrap bg-blue-50/50">Dương Lịch Sắp Tới</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100 text-sm">
                                    {anniversaryList.map((item, index) => {
                                        // BẢN VÁ: Kiểm tra xem dòng này có phải là ngày hôm nay không
                                        const isToday = item.solarDateStr === todayStr;
                                        
                                        return (
                                          <tr key={item.id} className={`transition-all ${isToday ? 'bg-gradient-to-r from-yellow-50 to-amber-100 shadow-[inset_4px_0_0_0_#fbbf24]' : 'hover:bg-orange-50/30'}`}>
                                              <td className={`p-3 text-center font-bold ${isToday ? 'text-amber-700' : 'text-stone-400'}`}>
                                                {index + 1}
                                              </td>
                                              <td className={`p-3 font-bold whitespace-nowrap ${isToday ? 'text-amber-900' : 'text-stone-800'}`}>
                                                  {item.name}
                                                  {item.alias && <span className={`${isToday ? 'text-amber-600' : 'text-stone-400'} font-normal italic ml-1`}>({item.alias})</span>}
                                                  {isToday && <span className="ml-2 inline-flex items-center text-[8px] bg-amber-500 text-white px-2 py-0.5 rounded-full uppercase animate-pulse tracking-widest">Hôm nay</span>}
                                              </td>
                                              <td className={`p-3 text-center font-bold whitespace-nowrap ${isToday ? 'text-amber-700' : 'text-orange-700'}`}>
                                                {item.lunarDate}
                                              </td>
                                              <td className={`p-3 text-right font-black whitespace-nowrap ${isToday ? 'text-amber-800 bg-amber-200/50' : 'text-blue-700 bg-blue-50/20'}`}>
                                                <span className={`${isToday ? 'text-amber-600' : 'text-blue-500/70'} font-bold mr-1`}>{item.dayOfWeekShort},</span>
                                                {item.solarDateStr}
                                            </td>
                                          </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                 ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-stone-400 space-y-3 bg-stone-50 rounded-3xl border border-dashed h-full min-h-[200px]">
                        <CalendarClock size={40} className="opacity-20" />
                        <p className="text-xs font-black uppercase tracking-widest text-center">Không có dữ liệu ngày giỗ<br/>trong khu vực đang hiển thị</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      )}

      <TransformWrapper
        ref={transformRef}
        initialScale={0.6}
        minScale={0.05}
        maxScale={2}
        centerOnInit={true}
        limitToBounds={false}
        wheel={{ step: 0.0005 }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div className="p-[800px] min-w-max relative">
            <Tree
              label={
                <div className="inline-block px-16 py-6 bg-[#704214] text-white rounded-full text-xl font-black mb-6 shadow-2xl uppercase border-4 border-white tracking-[0.2em]">
                  Tổ Tiên
                </div>
              }
              lineWidth={"3px"}
              lineColor={"#d6d3d1"}
              lineBorderRadius={"24px"}
              nodePadding={"32px"}
            >
              {renderNode(logic.rootMember.id)}
            </Tree>
          </div>
        </TransformComponent>
      </TransformWrapper>

      {selectedMember && (
        <MemberDetailModal 
          member={selectedMember as any} 
          members={members as any} 
          onClose={() => logic.setSelectedDetailId(null)} 
        />
      )}
    </div>
  );
};

export default TreeView;
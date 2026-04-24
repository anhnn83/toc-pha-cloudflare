// src/components/TreeView.tsx -- Version 4.1

import React, { useMemo } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Heart, HeartOff, PlusCircle, MinusCircle, Search, X } from 'lucide-react';
import MemberDetailModal from './MemberDetailModal';
import { MemberCardBase, useTreeCommonLogic, getShortName } from './TreeShare';
import type { Member } from './TreeShare';

const TreeView: React.FC<{ members: Member[] }> = ({ members }) => {
  const transformRef = React.useRef<ReactZoomPanPinchRef>(null);
  const logic = useTreeCommonLogic(members, transformRef);

  const selectedMember = useMemo(() => members.find(m => m.id === logic.selectedDetailId), [logic.selectedDetailId, members]);

  const renderNode = (nodeId: string) => {
    const person = members.find((m) => m.id === nodeId);
    if (!person) return null;

    const isCollapsed = logic.collapsedIds.has(person.id);
    const spouses = (person.spouses || []).flatMap(s => {
      const obj = members.find(m => m.id === s.id);
      return obj ? [{ ...obj, relationStatus: s.status }] : [];
    });

    const children = members
      .filter((m) => m.parents?.fatherId === nodeId || m.parents?.motherId === nodeId)
      .sort((a, b) => (a.siblingRank || 99) - (b.siblingRank || 99));

    return (
      <TreeNode
        key={person.id}
        label={
          <div className="inline-flex items-center justify-center relative py-4">
             <div className={`flex items-center gap-0 ${person.gender === 'F' ? 'flex-row-reverse' : 'flex-row'}`}>
                <MemberCardBase 
                  person={person} 
                  members={members} 
                  onShowDetail={logic.setSelectedDetailId}
                  onFocus={logic.setFocusId}
                  renderCollapseButton={
                    children.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); logic.toggleCollapse(person.id); }}
                        className="bg-white rounded-full text-[#704214] hover:scale-110 transition-transform shadow-md"
                        title="Thu gọn/Mở rộng"
                      >
                        {isCollapsed ? <PlusCircle size={20} fill="white" /> : <MinusCircle size={20} fill="white" />}
                      </button>
                    )
                  }
                />
                
                {spouses.map(spouse => (
                  <React.Fragment key={spouse.id}>
                    <div className="flex items-center justify-center w-[12px] -mx-1 z-10">
                      {spouse.relationStatus === 'divorced' 
                        ? <HeartOff size={16} className="text-stone-300 bg-[#f8f7f5] rounded-full" /> 
                        : <Heart size={16} className="text-red-500 bg-[#f8f7f5] rounded-full" fill="currentColor" />}
                    </div>
                    <MemberCardBase 
                      person={spouse} 
                      members={members} 
                      isSpouse 
                      bloodlineName={getShortName(person.fullName)} 
                      onShowDetail={logic.setSelectedDetailId}
                      onFocus={logic.setFocusId}
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
      {logic.focusId && (
        <button 
          onClick={() => logic.setFocusId(null)}
          className="absolute top-6 right-24 z-50 bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-lg flex items-center gap-2 hover:bg-blue-700 transition-all"
        >
          <X size={14} /> THOÁT CHẾ ĐỘ TẬP TRUNG
        </button>
      )}
      <div className="absolute top-6 left-6 z-50 w-72">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-stone-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-10 py-2.5 border-2 border-[#704214]/20 rounded-xl bg-white/90 backdrop-blur-sm shadow-lg outline-none text-sm"
            placeholder="Tìm tên hoặc biệt danh..."
            value={logic.searchTerm}
            onChange={(e) => logic.setSearchTerm(e.target.value)}
          />
          {logic.searchTerm && (
            <button onClick={() => logic.setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center">
              <X size={16} className="text-stone-400 hover:text-stone-600" />
            </button>
          )}
        </div>

        {logic.searchResults.length > 0 && (
          <div className="mt-2 bg-white rounded-xl shadow-2xl border border-stone-100 overflow-hidden">
            {logic.searchResults.map(m => (
              <button key={m.id} onClick={() => logic.handleSelectMember(m.id)} className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b last:border-0 border-stone-50 transition-colors flex flex-col">
                <span className="text-xs font-bold text-[#704214]">{m.fullName.toUpperCase()}</span>
                {m.nickname && <span className="text-[10px] text-stone-500 italic">({m.nickname})</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      <TransformWrapper
        ref={transformRef}
        initialScale={0.6}
        minScale={0.1}
        maxScale={2}
        centerOnInit={true}
        limitToBounds={false}
        wheel={{ step: 0.001 }}
        zoomAnimation={{ animationTime: 200 }}
      >
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div className="p-[500px] min-w-max relative">
            {/* PHẪU THUẬT: Thước đo Số Đời chuẩn xác 100% (Mục 3) */}
            {!logic.focusId && (
              <div 
                className="absolute left-[320px] flex flex-col items-center pointer-events-none z-10"
                style={{ top: '715px' }} // Vị trí khớp chính xác với tâm thẻ đời 0
              >
                {/* Sửa lỗi thiếu hàng cuối: 
                    Dùng logic.maxGeneration + 1 để bao phủ toàn bộ 
                */}
                {Array.from({ length: logic.maxGeneration + 1 }).map((_, idx) => (
                  <div 
                    key={idx} 
                    className="flex items-center justify-center font-black text-8xl italic opacity-15 select-none"
                    style={{ 
                      height: '300px', // Khớp với (240px thẻ + 60px padding)
                      color: idx % 2 === 0 ? '#166534' : '#991b1b'
                    }}
                  >
                    {idx}
                  </div>
                ))}
              </div>
            )}
            <Tree
              label={<div className="inline-block px-12 py-5 bg-[#704214] text-white rounded-full text-lg font-black mb-24 shadow-2xl uppercase border-4 border-white tracking-widest">TỔ TIÊN</div>}
              lineWidth={"3px"}
              lineColor={"#a8a29e"}
              lineBorderRadius={"20px"}
              nodePadding={"30px"}
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
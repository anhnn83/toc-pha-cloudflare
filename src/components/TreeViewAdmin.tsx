// src/components/TreeViewAdmin.tsx -- version 2.6 (Final - Heir Integration)

import React, { useMemo, useRef } from 'react';
import { Tree, TreeNode } from 'react-organizational-chart';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import type { ReactZoomPanPinchRef } from 'react-zoom-pan-pinch';
import { Heart, HeartOff, PlusCircle, MinusCircle, Search, X, Crosshair } from 'lucide-react';
import MemberDetailModal from './MemberDetailModal';
import { MemberCardBase, useTreeCommonLogic, getShortName } from './TreeShare';

interface TreeViewAdminProps {
  members: any[];
  currentUserRole: string;
  allowedRootId: string | null;
  onEdit: (m: any) => void;
  onAddRelative: (parent: any, type: 'child' | 'spouse') => void;
  onManageRole: (m: any, isAssigned: boolean) => void;
}

const TreeViewAdmin: React.FC<TreeViewAdminProps> = ({ 
  members, currentUserRole, allowedRootId, onEdit, onAddRelative, onManageRole 
}) => {
  const transformRef = useRef<ReactZoomPanPinchRef>(null);
  
  // Lấy dichTonMap và các logic điều hướng từ Hook dùng chung
  const logic = useTreeCommonLogic(members, transformRef);
  
  const selectedMember = useMemo(() => 
    members.find(m => m.id === logic.selectedDetailId), 
    [logic.selectedDetailId, members]
  );

  // Thuật toán kiểm tra ranh giới quyền hạn (Dành cho Mod nhánh)
  const allowedIds = useMemo(() => {
    if (currentUserRole === 'super' || currentUserRole === 'sm' || !allowedRootId) return null; 
    const allowed = new Set<string>();
    const stack = [allowedRootId];
    allowed.add(allowedRootId);

    while (stack.length > 0) {
      const currentId = stack.pop()!;
      const children = members.filter(m => m.father_id === currentId || m.mother_id === currentId);
      for (const child of children) {
        if (!allowed.has(child.id)) {
          allowed.add(child.id);
          stack.push(child.id);
        }
      }
    }
    return allowed;
  }, [members, currentUserRole, allowedRootId]);

  const renderNode = (nodeId: string) => {
    const person = members.find((m) => m.id === nodeId);
    if (!person) return null;

    const isCollapsed = logic.collapsedIds.has(person.id);
    const isAllowed = allowedIds === null || allowedIds.has(person.id);
    
    // Xác định đời đích tôn của người này (nếu có) từ dichTonMap
    const dichTonGen = logic.dichTonMap[person.id];

    const spouses = (person.spouses || []).flatMap((s: any) => {
      const obj = members.find(m => m.id === s.id);
      return obj ? [{ ...obj, relation_status: s.status }] : [];
    });

    const children = members
      .filter((m) => m.father_id === nodeId || m.mother_id === nodeId)
      .sort((a, b) => (a.rank_in_family || 99) - (b.rank_in_family || 99));

    const isAssignedMod = person.is_mod || false; 

    return (
      <TreeNode
        key={person.id}
        label={
          <div className="inline-flex items-center justify-center relative py-6">
             {/* Hiệu ứng làm mờ và chặn tương tác cho các thẻ ngoài quyền Mod */}
             <div className={`flex items-center gap-0 ${person.gender === 'F' ? 'flex-row-reverse' : 'flex-row'} ${!isAllowed ? 'opacity-[0.6] grayscale-[50%] pointer-events-none select-none transition-all duration-500' : 'transition-all duration-500'}`}>
                
                <MemberCardBase 
                  person={person} 
                  members={members} 
                  isAllowed={isAllowed}
                  dichTonGen={dichTonGen} // Gắn huy hiệu Đích Tôn
                  onShowDetail={logic.setSelectedDetailId}
                  onFocus={logic.handleFocus}
                  renderCollapseButton={
                    children.length > 0 && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); logic.toggleCollapse(person.id); }}
                        className="bg-white rounded-full text-[#704214] hover:scale-110 transition-transform shadow-md border border-stone-200 pointer-events-auto"
                      >
                        {isCollapsed ? <PlusCircle size={20} /> : <MinusCircle size={20} />}
                      </button>
                    )
                  }
                  renderExtraButtons={
                    <div className="bg-stone-100 border-t border-stone-200 py-2 px-3 flex justify-center items-center gap-3">
                      <button onClick={() => onEdit(person)} className="hover:scale-125 transition-transform" title="Chỉnh sửa">📝</button>
                      <span className="text-stone-300">|</span>
                      {/* Sử dụng Icon rút gọn theo yêu cầu */}
                      <button onClick={() => onAddRelative(person, 'spouse')} className="hover:scale-125 transition-transform" title="Thêm Vợ/Chồng">{person.gender === 'M' ? '👧' : '👦'}</button>
                      <button onClick={() => onAddRelative(person, 'child')} className="hover:scale-125 transition-transform" title="Thêm Con">👶🏻</button>
                      {(currentUserRole === 'super' || currentUserRole === 'sm') && (
                        <>
                          <span className="text-stone-300">|</span>
                          <button onClick={() => onManageRole(person, isAssignedMod)} className="hover:scale-125 transition-transform" title="Phân quyền quản trị nhánh">
                            {isAssignedMod ? '❌' : '⚡'}
                          </button>
                        </>
                      )}
                    </div>
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
                      bloodlineName={getShortName(person.full_name)} 
                      isAllowed={isAllowed}
                      onShowDetail={logic.setSelectedDetailId}
                      onFocus={logic.handleFocus}
                      renderExtraButtons={
                        <div className="bg-stone-100 border-t border-stone-200 py-2 px-3 flex justify-center items-center gap-2">
                          <button onClick={() => onEdit(spouse)} className="hover:scale-125 transition-transform" title="Chỉnh sửa">📝</button>
                        </div>
                      }
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
      {/* UI: SEARCH & ZOOM TOOLS */}
      <div className="absolute top-6 left-6 z-50 flex flex-col gap-4">
        <div className="w-72 relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={18} className="text-stone-400" /></div>
          <input type="text" className="block w-full pl-10 pr-10 py-3 border-2 border-[#704214]/10 rounded-2xl bg-white/90 backdrop-blur-md shadow-xl outline-none text-sm focus:border-[#704214]/40 transition-all" placeholder="Tìm theo tên hoặc biệt danh..." value={logic.searchTerm} onChange={(e) => logic.setSearchTerm(e.target.value)} />
          {logic.searchTerm && (<button onClick={() => logic.setSearchTerm('')} className="absolute inset-y-0 right-3 flex items-center"><X size={16} className="text-stone-400 hover:text-stone-600" /></button>)}
        </div>

        {logic.searchResults.length > 0 && (
          <div className="absolute top-20 left-0 w-72 bg-white rounded-2xl shadow-2xl border border-stone-100 overflow-hidden z-[60]">
            {logic.searchResults.map((m: any) => (
              <button key={m.id} onClick={() => logic.handleSelectMember(m.id)} className="w-full text-left px-4 py-3 hover:bg-stone-50 border-b last:border-0 border-stone-50 transition-colors flex flex-col">
                <span className="text-xs font-black text-[#704214]">{m.full_name?.toUpperCase()}</span>
                {m.alias && <span className="text-[9px] text-stone-400 italic">({m.alias})</span>}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => transformRef.current?.centerView(0.6)} className="w-12 h-12 bg-white rounded-2xl shadow-lg border border-stone-200 flex items-center justify-center text-[#704214] hover:bg-stone-50 transition-colors" title="Căn giữa cây"><Crosshair size={20} /></button>
      </div>

      {logic.focusId && (
        <button onClick={() => logic.setFocusId(null)} className="absolute top-6 right-6 z-50 bg-blue-600 text-white px-5 py-3 rounded-2xl font-black text-xs shadow-2xl flex items-center gap-2 hover:bg-blue-700 transition-all">
          <X size={16} /> THOÁT CHẾ ĐỘ TẬP TRUNG
        </button>
      )}

      <TransformWrapper ref={transformRef} initialScale={0.6} minScale={0.05} maxScale={2} centerOnInit={true} limitToBounds={false} wheel={{ step: 0.0005 }}>
        <TransformComponent wrapperStyle={{ width: "100%", height: "100%" }}>
          <div className="p-[800px] min-w-max relative">
            <Tree 
              label={<div className="inline-block px-16 py-6 bg-[#704214] text-white rounded-full text-xl font-black mb-6 shadow-2xl uppercase border-4 border-white tracking-[0.2em]">Tổ tiên</div>} 
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

      {selectedMember && <MemberDetailModal member={selectedMember} members={members} onClose={() => logic.setSelectedDetailId(null)} />}
    </div>
  );
};

export default TreeViewAdmin;
// src/components/About.tsx -- Version 1.1 (Thêm Album ảnh & Xem ảnh gốc)

import React, { useState } from 'react';
import { BookOpen, Info, Smartphone, ShieldCheck, Cpu, Mail, Phone, Image as ImageIcon, X } from 'lucide-react';

// Cấu trúc dữ liệu cho Hình ảnh
interface PhotoItem {
  url: string;
  caption: string;
}

interface AboutProps {
  aboutFamily?: string;
  familyPhotos?: PhotoItem[]; 
}

const About: React.FC<AboutProps> = ({ aboutFamily, familyPhotos = [] }) => {
  // State quản lý việc hiển thị ảnh gốc (Lightbox)
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Lọc bỏ các ảnh không có URL hợp lệ
  const validPhotos = familyPhotos.filter(photo => photo.url && photo.url.trim() !== "");

  return (
    <div className="h-full overflow-y-auto bg-stone-50 p-6 space-y-10 pb-20 relative">
      
      {/* MỤC 1: VỀ TỘC PHẢ */}
      <section className="max-w-3xl mx-auto space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
          <Info size={24} /> Giới thiệu dòng tộc
        </h2>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 text-stone-700 leading-relaxed italic whitespace-pre-wrap">
          {aboutFamily || "Thông tin về tộc phả hiện chưa được cập nhật. Trưởng tộc có thể bổ sung tại mục Quản trị."}
        </div>
      </section>

      {validPhotos.length > 0 && (
        <section className="max-w-3xl mx-auto space-y-4">
          <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
            <ImageIcon size={24} /> Hình ảnh Họ tộc
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {validPhotos.map((photo, index) => (
              <div 
                key={index} 
                className="flex flex-col gap-2 cursor-pointer group"
                onClick={() => setSelectedPhoto(photo.url)}
              >
                <div className="aspect-square bg-stone-200 rounded-2xl overflow-hidden border-4 border-white shadow-md relative">
                  <img 
                    src={photo.url} 
                    alt={photo.caption || `Hình ảnh họ tộc ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  {/* Hiệu ứng mờ khi di chuột vào ảnh */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
                {/* Hiển thị chú thích nếu có */}
                {photo.caption && (
                  <p className="text-center text-[10px] text-stone-600 italic px-1 break-words">
                    {photo.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MỤC 2: HƯỚNG DẪN SỬ DỤNG */}
      <section className="max-w-3xl mx-auto space-y-6">
        <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
          <BookOpen size={24} /> Hướng dẫn sử dụng
        </h2>

        {/* 2.1 Dành cho người xem (Viewer) */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Smartphone size={14} /> Dành cho khách xem
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
              <p className="font-bold text-sm text-stone-800 mb-2">Cài đặt Ứng dụng (Web App) trên Mobile</p>
              <ul className="text-xs text-stone-500 space-y-2 list-disc pl-4">
                <li><b>Android:</b> Mở Chrome ➔ Ba chấm (⋮) ➔ Cài đặt ứng dụng / Thêm vào màn hình chính.</li>
                <li><b>iOS:</b> Mở Safari ➔ Nút Chia sẻ (⎙) ➔ Thêm vào màn hình chính.</li>
              </ul>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
              <p className="font-bold text-sm text-stone-800 mb-2">Tính năng chính</p>
              <ul className="text-xs text-stone-500 space-y-2 list-disc pl-4">
                <li><b>Tìm kiếm:</b> Nhập tên/biệt danh để định vị nhanh thành viên.</li>
                <li><b>Tập trung (𖦏):</b> Click để xem riêng một nhánh gia phả.</li>
                <li><b>Ẩn nhánh (-):</b> Thu gọn bớt các chi con để đỡ rối mắt.</li>
                <li><b>Chi tiết:</b> Click vào ảnh để xem tiểu sử, ngày giỗ, ngày sinh...</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 2.2 Dành cho Trưởng tộc & Quản trị viên */}
        <div className="space-y-4">
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Dành cho Trưởng tộc & Mod
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-4 text-sm text-stone-600">
            <div>
              <p className="font-black text-blue-800 uppercase text-[10px] mb-1">Quyền Trưởng tộc</p>
              <p className="text-xs">Quản trị toàn bộ cây, phân quyền & cấp mã PIN (⚡) cho các Trưởng nhánh, thực hiện Sao lưu và Khôi phục dữ liệu qua tệp JSON.</p>
            </div>
            <div>
              <p className="font-black text-amber-800 uppercase text-[10px] mb-1">Quyền Quản trị nhánh</p>
              <p className="text-xs">Chỉnh sửa, xóa & thêm mới thành viên thuộc nhánh gia phả được Trưởng tộc giao quyền.</p>
            </div>
            <div>
              <p className="font-black text-green-800 uppercase text-[10px] mb-1">Lưu ý khi Cập nhật (CUD)</p>
              <p className="text-xs italic">Khi xóa một thành viên, đảm bảo người đó không còn con cái nào tồn tại. Ưu tiên thêm Vợ/Chồng trước khi thêm Con.</p>
            </div>
          </div>
        </div>
      </section>

      {/* MỤC 3: GIỚI THIỆU ỨNG DỤNG */}
      <footer className="max-w-3xl mx-auto pt-10 border-t border-stone-200">
        <div className="flex flex-col items-center text-center space-y-3">
          <h2 className="text-lg font-black text-stone-800 flex items-center gap-2 uppercase tracking-tighter">
            <Cpu size={20} /> Tộc Phả Serverless <span className="text-[10px] bg-stone-200 px-2 py-0.5 rounded-full">v1.0</span>
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold border border-green-200 uppercase tracking-widest">Miễn phí duy trì</span>
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-200 uppercase tracking-widest">Hoạt động Offline</span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[10px] font-bold border border-purple-200 uppercase tracking-widest">Thân thiện Mobile</span>
            <span className="bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full text-[10px] font-bold border border-yellow-200 uppercase tracking-widest">& Nhiều tính năng ưu việt khác...</span>
          </div>
          <div className="pt-6 space-y-1">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">DEVELOPER</p>
            <p className="font-bold text-stone-800 uppercase">Nguyễn Ngọc Anh</p>
            <div className="flex gap-4 justify-center text-stone-500">
              <a href="mailto:anhnn@dgd.vn" className="flex items-center gap-1 hover:text-blue-600 transition-colors text-xs font-bold underline decoration-blue-200">
                <Mail size={12} /> anhnn@dgd.vn
              </a>
              <a href="tel:0378696969" className="flex items-center gap-1 hover:text-green-600 transition-colors text-xs font-bold underline decoration-green-200">
                <Phone size={12} /> 0378.696969
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* MODAL XEM ẢNH GỐC (LIGHTBOX) */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" 
          onClick={() => setSelectedPhoto(null)}
        >
          <img 
            src={selectedPhoto} 
            className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" 
            alt="Full Resolution" 
          />
          <button 
            className="absolute top-6 right-6 text-white p-2 hover:bg-white/20 rounded-full transition-colors"
            onClick={(e) => {
              e.stopPropagation(); // Ngăn sự kiện click lan ra ngoài
              setSelectedPhoto(null);
            }}
          >
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default About;
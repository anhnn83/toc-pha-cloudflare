// src/components/About.tsx -- Version 2.1 (Fixed Mobile Overflow UI)

import React, { useState } from 'react';
import { 
  BookOpen, Info, Smartphone, ShieldCheck, 
  Cpu, Mail, Phone, Image as ImageIcon, X, 
  Cloud, Trash2, History, Database,
  Search,
  Atom,
  LayoutDashboard
} from 'lucide-react';

interface PhotoItem {
  url: string;
  caption: string;
}

interface AboutProps {
  aboutFamily?: string;
  familyPhotos?: PhotoItem[]; 
}

const About: React.FC<AboutProps> = ({ aboutFamily, familyPhotos = [] }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  const validPhotos = familyPhotos.filter(photo => photo.url && photo.url.trim() !== "");

  return (
    <div className="h-full overflow-y-auto bg-stone-50 p-6 space-y-10 pb-20 relative custom-scrollbar">
      
      {/* MỤC 1: GIỚI THIỆU HỌ TỘC */}
      <section className="max-w-3xl mx-auto space-y-4">
        <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
          <Info size={24} /> Giới thiệu họ tộc
        </h2>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-stone-200 text-stone-700 leading-relaxed italic whitespace-pre-wrap text-sm">
          {aboutFamily || "Thông tin về tộc phả hiện chưa được cập nhật. Trưởng tộc có thể bổ sung tại mục Quản trị hệ thống."}
        </div>
      </section>

      {/* ALBUM ẢNH TỘC PHẢ */}
      {validPhotos.length > 0 && (
        <section className="max-w-3xl mx-auto space-y-4">
          <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
            <ImageIcon size={24} /> Hình ảnh Họ tộc
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {validPhotos.map((photo, index) => (
              <div 
                key={index} 
                className="flex flex-col gap-2 cursor-pointer group"
                onClick={() => setSelectedPhoto(photo.url)}
              >
                <div className="aspect-square bg-stone-200 rounded-2xl overflow-hidden border-4 border-white shadow-md relative">
                  <img 
                    src={photo.url} 
                    alt={photo.caption || `Ảnh tộc ${index + 1}`} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300"></div>
                </div>
                {photo.caption && (
                  <p className="text-center text-[10px] text-stone-600 italic px-1 line-clamp-2">
                    {photo.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* MỤC 2: HƯỚNG DẪN SỬ DỤNG HỆ THỐNG CLOUDFLARE */}
      <section className="max-w-3xl mx-auto space-y-6">
        <h2 className="flex items-center gap-3 text-xl font-black text-[#704214] uppercase tracking-tighter border-b-2 border-[#704214]/20 pb-2">
          <BookOpen size={24} /> Hướng dẫn sử dụng
        </h2>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <Smartphone size={14} /> Dành cho Người dùng
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
              <p className="font-bold text-sm text-stone-800 mb-2 flex items-center gap-2"><Cloud size={16} className="text-blue-500"/>Thân thiện & thuận tiện</p>
              <ul className="text-xs text-stone-500 space-y-2 list-disc pl-4">
                <li>Các tính năng độc đáo: phân quyền quản trị nhánh, tính ngày giỗ gần nhất theo dương lịch, xác định đích tôn...</li>
                <li>Có thể cài đặt trực tiếp ứng dụng lên màn hình chính của điện thoại <b>[+]Add to Home Screen</b> để thuận tiện theo dõi.</li>
                <li>An toàn, miễn phí đăng tải & duy trì hoạt động nhờ tuân thủ & áp dụng tối ưu các chính sách của <b>Cloudflare</b>.</li>
              </ul>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-stone-100 shadow-sm">
              <p className="font-bold text-sm text-stone-800 mb-2 flex items-center gap-2"><Search size={16} className="text-blue-500"/>Tra cứu & Tương tác</p>
              <ul className="text-xs text-stone-500 space-y-2 list-disc pl-4">
                <li>Sử dụng thanh tìm kiếm để định vị thành viên qua tên hoặc biệt danh.</li>
                <li>Dùng nút <b>Tập trung (𖦏)</b> để lọc riêng một nhánh chi họ dể tiện theo dõi và tìm kiếm đích tôn của chi.</li>
                <li>Xem chi tiết: Click vào ảnh thành viên để xem đầy đủ các thông tin như: tiểu sử, gia đình, ngày giỗ...</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest flex items-center gap-2">
            <ShieldCheck size={14} /> Dành cho Trưởng tộc & Mod
          </h3>
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm space-y-5 text-sm text-stone-600">
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0"><ShieldCheck size={20}/></div>
              <div className="space-y-2">
                <p className="font-black text-blue-800 uppercase text-[10px] mb-2">Quyền uy Trưởng tộc (SM)</p>
                {/* BẢN VÁ: Loại bỏ whitespace-nowrap, căn chỉnh items-start, thêm màu sắc chuyên nghiệp */}
                <p className="text-[11px] sm:text-xs flex items-start gap-2 text-stone-600 leading-relaxed">
                  <Database size={14} className="mt-0.5 shrink-0 text-blue-500" /> 
                  <span><b className="text-stone-800">Cây gia phả</b> - Thêm/xóa/chỉnh sửa thành viên, ⚡Phân quyền quản trị nhánh chi họ.</span>
                </p>                
                <p className="text-[11px] sm:text-xs flex items-start gap-2 text-stone-600 leading-relaxed">
                  <ShieldCheck size={14} className="mt-0.5 shrink-0 text-blue-500" /> 
                  <span><b className="text-stone-800">Mod & Bảo mật</b> - Thêm/xóa Mod, thiết lập ViewPIN, ModPIN, đổi mã PIN.</span>
                </p>
                <p className="text-[11px] sm:text-xs flex items-start gap-2 text-stone-600 leading-relaxed">
                  <ImageIcon size={14} className="mt-0.5 shrink-0 text-blue-500" /> 
                  <span><b className="text-stone-800">Trang giới thiệu</b> - Cập nhật thông tin, hình ảnh chung của gia tộc.</span>
                </p>
                <p className="text-[11px] sm:text-xs flex items-start gap-2 text-stone-600 leading-relaxed">
                  <LayoutDashboard size={14} className="mt-0.5 shrink-0 text-blue-500" /> 
                  <span><b className="text-stone-800">Hệ thống</b> - Thùng rác (xóa 2 lớp), Sao lưu/Phục hồi dữ liệu, xem Nhật ký hệ thống.</span>
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-violet-50 rounded-lg text-pink-400 shrink-0"><Atom size={20}/></div>
              <div>
                <p className="font-black text-pink-400 uppercase text-[10px] mb-1">Quản trị phân nhánh (Mod)</p>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed mb-1">Trưởng tộc có thể phân quyền (⚡) cho nhiều Mod để hỗ trợ quản trị các thành viên trong nhánh chi họ.</p>
                <p className="text-[11px] sm:text-xs text-stone-600 font-medium">Nút trên thẻ Thành viên: 📝 Chỉnh sửa hồ sơ - 👧/👦 Thêm Vợ/Chồng - 👶🏻 Thêm con cái</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600 shrink-0"><Trash2 size={20}/></div>
              <div>
                <p className="font-black text-amber-800 uppercase text-[10px] mb-1">An toàn dữ liệu</p>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">Xóa dữ liệu 2 cấp an toàn, cơ chế Sao lưu & Phục hồi toàn bộ CSDL nhanh chóng, hạn chế truy cập bằng mã PIN và IP. </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="p-2 bg-green-50 rounded-lg text-green-600 shrink-0"><History size={20}/></div>
              <div>
                <p className="font-black text-green-800 uppercase text-[10px] mb-1">Nhật ký hệ thống (Audit Logs)</p>
                <p className="text-[11px] sm:text-xs text-stone-600 leading-relaxed">Mọi thao tác thêm/xóa/sửa đều được lưu vết thời gian thực để đảm bảo tính minh bạch của dữ liệu gia tộc.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER & THÔNG TIN DEVELOPER */}
      <footer className="max-w-3xl mx-auto pt-10 border-t border-stone-200">
        <div className="flex flex-col items-center text-center space-y-4">
          <h2 className="text-lg font-black text-stone-800 flex items-center gap-2 uppercase tracking-tighter">
            <Cpu size={20} /> Tộc Phả Cloudflare v1.0
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-[9px] font-bold border border-blue-200 uppercase tracking-widest">D1 Database</span>
            <span className="bg-purple-50 text-purple-700 px-3 py-1 rounded-full text-[9px] font-bold border border-purple-200 uppercase tracking-widest">R2 Storage</span>
            <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-[9px] font-bold border border-green-200 uppercase tracking-widest">Edge API</span>
            <span className="bg-green-50 text-pink-700 px-3 py-1 rounded-full text-[9px] font-bold border border-green-200 uppercase tracking-widest">PWA</span>
          </div>
          <div className="pt-6 space-y-1">
            <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest">DEVELOPED BY</p>
            <p className="font-bold text-stone-800 uppercase">Nguyễn Ngọc Anh</p>
            <div className="flex gap-4 justify-center text-stone-500">
              <a href="mailto:anhnn@dgd.vn" className="flex items-center gap-1 hover:text-blue-600 transition-colors text-xs font-bold underline decoration-blue-200">
                <Mail size={12} /> anhnn@dgd.vn
              </a>
              <a href="tel:0378696969" className="flex items-center gap-1 hover:text-green-600 transition-colors text-xs font-bold underline decoration-green-200">
                <Phone size={12} /> (+84) 378 69 69 69
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* LIGHTBOX XEM ẢNH */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-[200] bg-black/90 flex items-center justify-center p-4 animate-in zoom-in-95 duration-200" onClick={() => setSelectedPhoto(null)}>
          <img src={selectedPhoto} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" alt="Full Res" />
          <button className="absolute top-6 right-6 text-white p-2 hover:bg-white/20 rounded-full transition-colors" onClick={() => setSelectedPhoto(null)}>
            <X size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default About;
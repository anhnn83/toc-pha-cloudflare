// src/utils/lunarUtils.ts -- Version 2.0 (Tính ngày giỗ tương lai - Bỏ qua tháng nhuận)

import { Lunar } from 'lunar-javascript';

/**
 * Tìm ngày Dương Lịch của ngày giỗ Âm Lịch trong năm hiện tại hoặc năm sau.
 * Ghi chú: Chỉ lấy tháng chính (không tính tháng nhuận) và chỉ trả về ngày trong tương lai hoặc hôm nay.
 * @param lunarDateString Chuỗi định dạng "DD/MM" (VD: "10/03")
 * @returns Chuỗi ngày Dương lịch sắp tới định dạng "DD/MM/YYYY" hoặc null
 */
export const getNextSolarAnniversary = (lunarDateString: string | null | undefined): string | null => {
  if (!lunarDateString) return null;
  
  const parts = lunarDateString.split('/');
  if (parts.length < 2) return null;

  const day = parseInt(parts[0], 10);
  // Ép tuyệt đối trị để đảm bảo luôn là tháng chính (lunar-javascript quy định tháng < 0 là nhuận)
  const month = Math.abs(parseInt(parts[1], 10)); 
  
  const now = new Date();
  // Đưa giờ/phút/giây về 0 để so sánh chính xác theo ngày
  now.setHours(0, 0, 0, 0); 
  const currentYearSolar = now.getFullYear();

  try {
    // Bước 1: Tính ngày giỗ Âm Lịch dựa trên năm Dương Lịch hiện tại
    let annivLunar = Lunar.fromYmd(currentYearSolar, month, day);
    let annivSolar = annivLunar.getSolar();
    let annivDate = new Date(annivSolar.getYear(), annivSolar.getMonth() - 1, annivSolar.getDay());

    // Bước 2: Nếu ngày giỗ trong năm nay ĐÃ QUA, cộng thêm 1 năm để tính giỗ cho năm sau
    if (annivDate.getTime() < now.getTime()) {
      annivLunar = Lunar.fromYmd(currentYearSolar + 1, month, day);
      annivSolar = annivLunar.getSolar();
      annivDate = new Date(annivSolar.getYear(), annivSolar.getMonth() - 1, annivSolar.getDay());
    }

    // Bước 3: Định dạng kết quả đầu ra thành chuỗi DD/MM/YYYY
    const dd = String(annivDate.getDate()).padStart(2, '0');
    const mm = String(annivDate.getMonth() + 1).padStart(2, '0');
    const yyyy = annivDate.getFullYear();

    return `${dd}/${mm}/${yyyy}`;
  } catch (error) {
    // Trả về null nếu người dùng nhập ngày Âm lịch không tồn tại (VD: 31/02)
    return null; 
  }
};
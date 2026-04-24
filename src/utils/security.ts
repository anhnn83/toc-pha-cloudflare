// src/utils/security.ts
import CryptoJS from 'crypto-js';

/**
 * TASK: Cơ chế Hashing PIN (SHA-256)
 * Dùng để kiểm tra xem mã PIN nhập vào có khớp với mã PIN trong config.json không
 * mà không cần lưu mã PIN gốc.
 */
export const hashPIN = (pin: string): string => {
  return CryptoJS.SHA256(pin).toString();
};

/**
 * TASK: Cơ chế Giải mã PIN-to-Token (AES-256)
 * Giải mã chuỗi ciphertext từ config.json để lấy mã PAT thật.
 * @param encryptedToken Chuỗi token đã mã hóa từ config.json
 * @param pin Mã PIN 6 số người dùng nhập
 * @param salt Chuỗi muối bổ trợ để tăng cường bảo mật
 */
export const decryptToken = (encryptedToken: string, pin: string, salt: string): string | null => {
  try {
    // Tạo khóa giải mã từ PIN và Salt
    const key = hashPIN(pin + salt);
    
    // Thực hiện giải mã AES
    const bytes = CryptoJS.AES.decrypt(encryptedToken, key);
    const originalToken = bytes.toString(CryptoJS.enc.Utf8);
    
    // Nếu giải mã ra chuỗi rỗng hoặc lỗi, nghĩa là PIN sai
    return originalToken || null;
  } catch (error) {
    console.error("Lỗi giải mã Token:", error);
    return null;
  }
};

/**
 * TASK: Công cụ dành cho Owner để tạo chuỗi mã hóa ban đầu
 * Bạn có thể dùng hàm này để tạo ra chuỗi encryptedToken dán vào config.json
 */
export const encryptToken = (token: string, pin: string, salt: string): string => {
  const key = hashPIN(pin + salt);
  return CryptoJS.AES.encrypt(token, key).toString();
};
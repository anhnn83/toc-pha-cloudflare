// src/utils/security.ts -- version 1.2 (Tương thích Cloudflare & AdminSetup)

import CryptoJS from 'crypto-js';

/**
 * Băm mã PIN 6 số bằng thuật toán SHA-256.
 * Kết quả này được dùng để so khớp với pin_hash trong D1.
 */
export const hashPIN = (pin: string): string => {
  return CryptoJS.SHA256(pin).toString();
};

/**
 * Mã hóa Token (PAT) bằng AES với mã PIN và Muối.
 * Dùng cho công cụ AdminSetup.
 */
export const encryptToken = (token: string, pin: string, salt: string): string => {
  return CryptoJS.AES.encrypt(token, pin + salt).toString();
};

/**
 * Giải mã Token (PAT).
 */
export const decryptToken = (ciphertext: string, pin: string, salt: string): string | null => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, pin + salt);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || null;
  } catch (e) {
    return null;
  }
};
// src/components/AdminSetup.tsx
import React, { useState } from 'react';
import { encryptToken, hashPIN } from '../utils/security';

const AdminSetup = () => {
  const [pat, setPat] = useState('');
  const [pin, setPin] = useState('');
  const [salt] = useState('gia-toc-nguyen-2026'); // Chuỗi muối cố định của riêng bạn
  const [result, setResult] = useState<{ encryptedToken: string; hashedPin: string } | null>(null);

  const handleGenerate = () => {
    if (pat && pin.length === 6) {
      const encrypted = encryptToken(pat, pin, salt);
      const hashed = hashPIN(pin);
      setResult({ encryptedToken: encrypted, hashedPin: hashed });
    } else {
      alert("Vui lòng nhập PAT và mã PIN đúng 6 chữ số!");
    }
  };

  return (
    <div className="p-8 bg-stone-100 min-h-screen flex flex-col items-center justify-center font-sans">
      <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-md space-y-4">
        <h2 className="text-xl font-bold text-stone-800 border-b pb-2">🔑 Công cụ Khởi tạo Admin</h2>
        
        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-500 uppercase">1. Nhập GitHub PAT thật của bạn</p>
          <input 
            type="password" 
            className="w-full p-2 border rounded-lg text-sm"
            placeholder="ghp_xxxxxxxxxxxx"
            value={pat}
            onChange={(e) => setPat(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs font-bold text-stone-500 uppercase">2. Đặt mã PIN 6 số cho Super Mod</p>
          <input 
            type="text" 
            maxLength={6}
            className="w-full p-2 border rounded-lg text-sm tracking-[1em] font-mono text-center"
            placeholder="123456"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
        </div>

        <button 
          onClick={handleGenerate}
          className="w-full py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-colors"
        >
          TẠO CHUỖI CẤU HÌNH
        </button>

        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg space-y-4 animate-in fade-in">
            <div>
              <p className="text-[10px] text-green-600 font-black uppercase">Dán vào config.json - encryptedToken</p>
              <textarea 
                readOnly 
                className="w-full text-[10px] font-mono p-2 bg-white border mt-1 h-20 break-all"
                value={result.encryptedToken}
              />
            </div>
            <div>
              <p className="text-[10px] text-green-600 font-black uppercase">Dán vào config.json - hashedPin (Super)</p>
              <input 
                readOnly 
                className="w-full text-[10px] font-mono p-2 bg-white border mt-1"
                value={result.hashedPin}
              />
            </div>
            <p className="text-[10px] text-red-500 italic">* Sau khi copy xong hãy xóa Component này khỏi mã nguồn để đảm bảo an toàn.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSetup;
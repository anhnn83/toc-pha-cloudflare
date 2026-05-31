// src/main.tsx -- version 2.1 (Custom Service Worker Registration)

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// --- ĐOẠN CODE KÍCH HOẠT OFFLINE MODE THỦ CÔNG ---
// Xóa bỏ virtual:pwa-register để dùng file sw.js tự viết
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('🟢 Chế độ Offline (Service Worker) đã kích hoạt thành công. Phạm vi:', registration.scope);
      })
      .catch((error) => {
        console.error('🔴 Lỗi khi kích hoạt chế độ Offline:', error);
      });
  });
}
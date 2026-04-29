// src/main.tsx -- version 2.0

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Import cơ chế tự động đăng ký và cập nhật Service Worker từ vite-plugin-pwa
import { registerSW } from 'virtual:pwa-register'

// Kích hoạt tự động làm mới khi có bản cập nhật mới
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
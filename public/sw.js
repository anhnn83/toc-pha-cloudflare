// public/sw.js

const CACHE_NAME = 'giapha-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/data.json',
  '/config.json'
];

// Cài đặt SW và lưu trữ tài nguyên tĩnh
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Chiến lược: Ưu tiên Cache, cập nhật ngầm (Stale-While-Revalidate)
self.addEventListener('fetch', (event) => {
  // Chỉ xử lý các yêu cầu GET và thuộc giao thức http/https (bỏ qua chrome-extension)
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // KIỂM TRA HỢP LỆ: Chỉ cache nếu phản hồi thành công
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // BƯỚC QUAN TRỌNG: Clone ngay lập tức ở đây
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // Nếu mạng lỗi hoàn toàn, dùng bản cache
        return cachedResponse;
      });

      // Trả về bản cache ngay (nếu có) để App mở nhanh, hoặc đợi mạng
      return cachedResponse || fetchPromise;
    })
  );
});
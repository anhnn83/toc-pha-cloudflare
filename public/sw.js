// public/sw.js -- Offline Support Worker

const CACHE_NAME = 'giapha-assets-v1';
const API_CACHE_NAME = 'giapha-data-v1';

// Khi Service Worker được cài đặt, ép nó hoạt động ngay lập tức
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Dọn dẹp cache cũ nếu có phiên bản mới
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Chặn và xử lý mọi request gửi đi từ trình duyệt
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // 1. XỬ LÝ DỮ LIỆU API (Cây Gia Phả, Cài đặt hệ thống)
  // Chiến thuật: Network First, Fallback to Cache (Ưu tiên mạng, mất mạng thì lấy Cache)
  if (request.url.includes('/api/')) {
    if (request.method === 'GET') {
      event.respondWith(
        fetch(request)
          .then((response) => {
            // Nếu có mạng, lưu ngay bản copy mới nhất vào Cache
            const clonedResponse = response.clone();
            caches.open(API_CACHE_NAME).then((cache) => {
              cache.put(request, clonedResponse);
            });
            return response;
          })
          .catch(() => {
            // NẾU MẤT MẠNG -> Lấy dữ liệu cũ từ Cache trả về
            return caches.match(request).then((cachedResponse) => {
              if (cachedResponse) {
                return cachedResponse;
              }
              // Nếu không có cache (chưa vào web bao giờ mà đã tắt mạng) -> Chịu chết
              return new Response(JSON.stringify({ error: "Offline mode: No cached data" }), {
                status: 503,
                headers: { 'Content-Type': 'application/json' }
              });
            });
          })
      );
    }
    // Các thao tác Thêm/Sửa/Xóa (POST/PUT/DELETE) không cache, bắt buộc phải có mạng
    return;
  }

  // 2. XỬ LÝ FILE TĨNH (HTML, JS, CSS, Hình ảnh Avatar)
  // Chiến thuật: Stale-While-Revalidate (Lấy cache trả luôn cho nhanh, đồng thời tải ngầm bản mới)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        // Chỉ lưu cache các request hợp lệ (tránh cache lỗi)
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // Bỏ qua lỗi fetch khi mất mạng
      });

      // Trả về cache ngay lập tức nếu có, nếu không thì đợi fetch
      return cachedResponse || fetchPromise;
    })
  );
});
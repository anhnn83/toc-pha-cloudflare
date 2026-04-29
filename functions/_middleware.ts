// /functions/_middleware.ts -- version 1.2 (Fix UTF-8 Decoding & Whitelist Images)

interface Env {
  DB: D1Database;
  KV: KVNamespace;
  JWT_SECRET: string;
}

/**
 * Middleware bảo mật cấp hệ thống.
 * Chịu trách nhiệm chặn lọc Request, xác thực chữ ký JWT và phân quyền người dùng.
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next, env } = context;
  const url = new URL(request.url);

  // 1. Chỉ can thiệp vào các luồng API nội bộ
  if (!url.pathname.startsWith("/api/")) {
    return next();
  }

  // 2. Các trường hợp ngoại lệ cho phép truy cập công khai (Bypass)
  const isLoginRoute = url.pathname === "/api/auth/login";
  const isPublicGet = request.method === "GET" && (
    url.pathname.startsWith("/api/members") || 
    url.pathname.startsWith("/api/system/settings") ||
    url.pathname.startsWith("/api/images") // Cho phép xem ảnh công khai
  );

  if (isLoginRoute || isPublicGet) {
    return next();
  }

  // 3. Trích xuất Token từ Cookie (Bảo mật chống XSS)
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = Object.fromEntries(
    cookieHeader.split(";").map((c) => c.trim().split("="))
  );
  const token = cookies["session_token"];

  if (!token) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  try {
    // 4. Xác thực chữ ký và giải mã Payload JWT
    const payload = await verifyJWT(token, env.JWT_SECRET);
    
    if (!payload || !payload.role) {
      throw new Error("Invalid Token Payload");
    }

    // 5. Đính kèm thông tin định danh vào context để các API phía sau sử dụng
    // @ts-ignore
    context.data.user = {
      role: payload.role,
      branch_root_id: payload.branch_root_id || null,
      mod_name: payload.mod_name || "Admin"
    };

    return next();
  } catch (err) {
    return new Response(JSON.stringify({ error: "Session Expired" }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }
};

/**
 * Xác thực JWT và Giải mã UTF-8 chính xác.
 * Sửa lỗi vỡ font tiếng Việt (Lỗi số 8) khi dùng btoa/atob thuần túy.
 */
async function verifyJWT(token: string, secret: string): Promise<any | null> {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, payloadB64, signatureB64] = parts;
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    // Giải mã chữ ký
    const sigBinary = atob(signatureB64.replace(/-/g, '+').replace(/_/g, '/'));
    const signature = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      signature[i] = sigBinary.charCodeAt(i);
    }

    const isValid = await crypto.subtle.verify("HMAC", key, signature as any, data as any);
    if (!isValid) return null;

    // GIẢI MÃ PAYLOAD HỖ TRỢ UTF-8 (Fix lỗi Font tiếng Việt)
    const payloadBinary = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const payloadBytes = new Uint8Array(payloadBinary.length);
    for (let i = 0; i < payloadBinary.length; i++) {
      payloadBytes[i] = payloadBinary.charCodeAt(i);
    }
    const payload = JSON.parse(new TextDecoder().decode(payloadBytes));
    
    // Kiểm tra thời gian hết hạn (exp)
    if (payload.exp && Date.now() >= payload.exp * 1000) return null;

    return payload;
  } catch {
    return null;
  }
}
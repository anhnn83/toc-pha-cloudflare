// /functions/api/auth/login.ts -- version 2.1 (Added KV Rate Limiting)

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  KV: KVNamespace; // Khai báo thêm biến KV Namespace đã cấu hình trong wrangler.toml
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    // --- BƯỚC 1: KIỂM TRA RATE LIMIT (BẰNG IP) ---
    // Lấy IP của người dùng do Cloudflare cung cấp
    const clientIP = request.headers.get("CF-Connecting-IP") || "unknown_ip";
    const kvKey = `login_attempts:${clientIP}`;
    
    let attempts = 0;
    const attemptsStr = await env.KV.get(kvKey);
    if (attemptsStr) {
      attempts = parseInt(attemptsStr, 10);
    }

    // Nếu đã nhập sai từ 5 lần trở lên, khóa chặn luôn không cho đi tiếp
    if (attempts >= 5) {
      return new Response(
        JSON.stringify({ error: "Bạn đã nhập sai quá 5 lần. Để bảo mật, vui lòng thử lại sau 30 phút!" }), 
        { 
          status: 429, // 429: Too Many Requests
          headers: { "Content-Type": "application/json" }
        }
      );
    }
    // ------------------------------------------------

    const { pin } = await request.json() as any;
    if (!pin) throw new Error("Vui lòng nhập mã PIN");

    const pinHash = await sha256(pin);

    // --- BƯỚC 2: KIỂM TRA TÀI KHOẢN (TRƯỞNG TỘC / MOD) ---
    const user = await env.DB.prepare(
      "SELECT role, mod_name, branch_root_id FROM permissions WHERE pin_hash = ?"
    ).bind(pinHash).first() as { role: string; mod_name: string; branch_root_id: string } | null;

    if (user) {
      // Đăng nhập thành công -> Xóa lịch sử nhập sai của IP này
      await env.KV.delete(kvKey);

      // Ký JWT và trả về dữ liệu
      const token = await signJWT(user, env.JWT_SECRET || "default_secret_key");
      
      return new Response(JSON.stringify({
        success: true,
        role: user.role,
        mod_name: user.mod_name,
        branch_root_id: user.branch_root_id
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        }
      });
    }

    // --- BƯỚC 3: KIỂM TRA TÀI KHOẢN KHÁCH (GUEST) ---
    const guestSetting = await env.DB.prepare(
      "SELECT value FROM system_settings WHERE key = 'view_pin_hash'"
    ).first() as { value: string } | null;

    if (guestSetting && guestSetting.value === pinHash) {
      // Đăng nhập thành công -> Xóa lịch sử nhập sai của IP này
      await env.KV.delete(kvKey);

      const token = await signJWT({ role: 'guest' }, env.JWT_SECRET || "default_secret_key");
      
      return new Response(JSON.stringify({ success: true, role: 'guest' }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        }
      });
    }

    // --- BƯỚC 4: XỬ LÝ KHI NHẬP SAI MÃ PIN ---
    attempts += 1;
    // Ghi số lần nhập sai vào KV, tự động hết hạn (xóa) sau 1800 giây (30 phút)
    await env.KV.put(kvKey, attempts.toString(), { expirationTtl: 1800 });
    
    return new Response(
      JSON.stringify({ error: `Mã PIN không chính xác (Sai ${attempts}/5 lần)` }), 
      { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      }
    );

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};

// ==========================================
// CÁC HÀM TIỆN ÍCH (HELPERS)
// ==========================================

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Hàm tạo JWT độc lập sử dụng Web Crypto API (Không cần thư viện ngoài)
 */
async function signJWT(payload: any, secret: string) {
  const encoder = new TextEncoder();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  
  // Payload tự động hết hạn sau 24h
  const encodedPayload = base64UrlEncode(encoder.encode(JSON.stringify({ 
    ...payload, 
    exp: Math.floor(Date.now() / 1000) + 86400 
  })));

  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", key, data);
  const encodedSignature = base64UrlEncode(new Uint8Array(signature));

  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function base64UrlEncode(array: Uint8Array) {
  let base64 = btoa(String.fromCharCode(...array));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
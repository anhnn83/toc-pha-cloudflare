// /functions/api/auth/login.ts -- version 2.0 (Fix Missing Auth Payload)

interface Env {
  DB: D1Database;
  JWT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const { pin } = await request.json() as any;
    if (!pin) throw new Error("Vui lòng nhập mã PIN");

    const pinHash = await sha256(pin);

    // 1. Kiểm tra Mod / SM trong bảng permissions
    const user = await env.DB.prepare(
      "SELECT role, mod_name, branch_root_id FROM permissions WHERE pin_hash = ?"
    ).bind(pinHash).first() as { role: string; mod_name: string; branch_root_id: string } | null;

    if (user) {
      // Ký JWT và trả về đầy đủ các trường dữ liệu để Frontend định tuyến
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

    // 2. Kiểm tra View PIN của Khách (Guest)
    const guestSetting = await env.DB.prepare(
      "SELECT value FROM system_settings WHERE key = 'view_pin_hash'"
    ).first() as { value: string } | null;

    if (guestSetting && guestSetting.value === pinHash) {
      const token = await signJWT({ role: 'guest' }, env.JWT_SECRET || "default_secret_key");
      
      return new Response(JSON.stringify({ success: true, role: 'guest' }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": `session_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        }
      });
    }

    return new Response(JSON.stringify({ error: "Mã PIN không chính xác" }), { status: 401 });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
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
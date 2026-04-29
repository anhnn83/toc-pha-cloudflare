// /functions/api/system/security.ts -- version 1.5
interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

/**
 * Trung tâm xử lý lệnh Quản trị & Bảo mật.
 * Hỗ trợ các quyền: SM (Trưởng tộc) và Mod (Quản lý nhánh).
 */
export const onRequestPost: PagesFunction<Env, any, { user: any }> = async (context) => {
  const { request, env, data } = context;
  const user = data.user;

  if (!user || (user.role !== 'sm' && user.role !== 'mod')) {
    return new Response(JSON.stringify({ error: "Unauthorized." }), { status: 403 });
  }

  try {
    const { action, payload } = await request.json() as any;
    const authorName = user.mod_name || (user.role === 'sm' ? "Trưởng tộc" : "Mod");

    switch (action) {
      // 1. CẬP NHẬT TÊN GIA PHẢ (MAX 100 CHARS)
      case 'UPDATE_FAMILY_NAME': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        const name = (payload.name || "").trim().substring(0, 100);
        await upsertSetting(env.DB, 'family_name', name);
        await logAudit(env.DB, authorName, "Đổi tên gia phả", name);
        break;
      }

      // 2. CẬP NHẬT TIỂU SỬ DÒNG TỘC (MAX 3000 CHARS)
      case 'UPDATE_ABOUT_INTRO': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        const intro = (payload.intro || "").trim().substring(0, 3000);
        await upsertSetting(env.DB, 'about_family', intro);
        await logAudit(env.DB, authorName, "Cập nhật tiểu sử dòng tộc", "Đã thay đổi nội dung");
        break;
      }

      // 3. CẬP NHẬT DANH SÁCH ẢNH (Dùng cho việc sửa caption hoặc đổi thứ tự)
      case 'UPDATE_FAMILY_PHOTOS': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        // Payload.photos là mảng các object { url, caption }
        const photos = Array.isArray(payload.photos) ? payload.photos : [];
        if (photos.length > 12) throw new Error("Vượt quá giới hạn 12 ảnh cho phép");
        await upsertSetting(env.DB, 'family_photos', JSON.stringify(photos));
        await logAudit(env.DB, authorName, "Cập nhật Album ảnh", `Số lượng: ${photos.length}`);
        break;
      }

      // 4. XÓA ẢNH KHỎI ALBUM (XÓA VẬT LÝ TRÊN R2 & TRỪ DUNG LƯỢNG)
      case 'DELETE_FAMILY_PHOTO': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        const targetUrl = payload.url; // URL ảnh cần xóa
        if (!targetUrl) throw new Error("Thiếu URL ảnh");

        // BƯỚC A: Lấy danh sách ảnh hiện tại từ DB
        const currentPhotosRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'family_photos'").first() as any;
        let photos = currentPhotosRow ? JSON.parse(currentPhotosRow.value) : [];

        // BƯỚC B: Trích xuất tên file và xóa trên R2
        const fileName = targetUrl.split('/').pop()?.split('?')[0];
        if (fileName) {
          try {
            const objectMetadata = await env.BUCKET.head(fileName);
            if (objectMetadata) {
              const fileSize = objectMetadata.size;
              
              // Xóa file vật lý
              await env.BUCKET.delete(fileName);

              // Cập nhật sổ kế toán dung lượng
              const currentBytesRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'r2_storage_bytes'").first() as any;
              let currentBytes = currentBytesRow ? parseInt(currentBytesRow.value, 10) : 0;
              currentBytes = Math.max(0, currentBytes - fileSize);
              const newSizeMB = (currentBytes / (1024 * 1024)).toFixed(2) + " MB";

              await upsertSetting(env.DB, 'r2_storage_bytes', currentBytes.toString());
              await upsertSetting(env.DB, 'r2_storage_size', newSizeMB);
            }
          } catch (e) {
            console.error("Lỗi khi xóa ảnh R2 khỏi Album:", e);
          }
        }

        // BƯỚC C: Cập nhật lại danh sách ảnh mới (loại bỏ ảnh vừa xóa)
        const updatedPhotos = photos.filter((p: any) => p.url !== targetUrl);
        await upsertSetting(env.DB, 'family_photos', JSON.stringify(updatedPhotos));
        
        await logAudit(env.DB, authorName, "Xóa ảnh khỏi Album", fileName || "N/A");
        break;
      }

      case 'CHANGE_MY_PIN': {
        if (!payload.pin || payload.pin.length < 6) throw new Error("Mã PIN mới phải đủ 6 số");
        const pinHash = await sha256(payload.pin);
        await env.DB.prepare("UPDATE permissions SET pin_hash = ? WHERE mod_name = ?")
          .bind(pinHash, authorName).run();
        await logAudit(env.DB, authorName, "Tự đổi mã PIN", "Cá nhân");
        break;
      }

      case 'ADD_MOD': {
        if (user.role !== 'sm') throw new Error("Chỉ Trưởng tộc mới có quyền cấp Mod");
        if (!payload.pin || payload.pin.length < 6) throw new Error("Mã PIN Mod phải đủ 6 số");
        const pinHash = await sha256(payload.pin);
        const modId = `MOD_${Date.now()}`;
        await env.DB.prepare(`
          INSERT INTO permissions (id, pin_hash, role, branch_root_id, mod_name, created_by)
          VALUES (?, ?, 'mod', ?, ?, ?)
        `).bind(modId, pinHash, payload.rootId, payload.name, authorName).run();
        await logAudit(env.DB, authorName, "Cấp quyền Mod", `${payload.name} (Gốc: ${payload.rootId})`);
        break;
      }

      case 'CHANGE_MOD_PIN': {
        if (user.role !== 'sm') throw new Error("Chỉ Trưởng tộc mới có quyền đổi PIN Mod");
        const pinHash = await sha256(payload.pin);
        await env.DB.prepare("UPDATE permissions SET pin_hash = ? WHERE id = ? AND role = 'mod'")
          .bind(pinHash, payload.id).run();
        await logAudit(env.DB, authorName, "Đổi mã PIN Mod", `ID Mod: ${payload.id}`);
        break;
      }

      case 'REVOKE_MOD': {
        if (user.role !== 'sm') throw new Error("Chỉ Trưởng tộc mới có quyền thu hồi Mod");
        await env.DB.prepare("DELETE FROM permissions WHERE id = ? AND role = 'mod'")
          .bind(payload.id).run();
        await logAudit(env.DB, authorName, "Thu hồi quyền Mod", `ID Mod: ${payload.id}`);
        break;
      }

      case 'UPDATE_GUEST_PIN': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        const pinHash = payload.pin ? await sha256(payload.pin) : "";
        await upsertSetting(env.DB, 'view_pin_hash', pinHash);
        await logAudit(env.DB, authorName, "Cập nhật mã Khách", payload.pin ? "Khóa trang" : "Mở cửa");
        break;
      }

      case 'UPDATE_SM_PIN': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        const pinHash = await sha256(payload.pin);
        await env.DB.prepare("UPDATE permissions SET pin_hash = ? WHERE role = 'sm'").bind(pinHash).run();
        await logAudit(env.DB, authorName, "Thay đổi PIN SM", "Hệ thống");
        break;
      }

      case 'UPDATE_ABOUT': {
        if (user.role !== 'sm') throw new Error("Quyền SM yêu cầu");
        await upsertSetting(env.DB, 'about_family', payload.intro || "");
        await upsertSetting(env.DB, 'family_photos', JSON.stringify(payload.photos || []));
        await logAudit(env.DB, authorName, "Cập nhật trang About", "Nội dung & Ảnh");
        break;
      }

      case 'RESTORE_MEMBER': {
        const member = await env.DB.prepare("SELECT full_name FROM members WHERE id = ?").bind(payload.id).first() as any;
        await env.DB.prepare("UPDATE members SET is_deleted = 0 WHERE id = ?").bind(payload.id).run();
        await logAudit(env.DB, authorName, "Khôi phục thành viên", member?.full_name || payload.id);
        break;
      }

      case 'HARD_DELETE_MEMBER': {
        if (user.role !== 'sm') throw new Error("Chỉ Trưởng tộc mới có quyền xóa vĩnh viễn");
        
        const deps = await env.DB.prepare("SELECT id FROM members WHERE (father_id = ? OR mother_id = ?) AND is_deleted = 0 LIMIT 1")
          .bind(payload.id, payload.id).first();
        if (deps) throw new Error("Thành viên đang có con, không thể xóa cứng!");
        
        // PHẪU THUẬT 2: Lấy thêm avatar_url để kiểm tra ảnh trên R2
        const member = await env.DB.prepare("SELECT full_name, avatar_url FROM members WHERE id = ?").bind(payload.id).first() as any;
        
        // PHẪU THUẬT 3: Tích hợp logic dọn rác R2 y hệt như file [id].ts
        if (member && member.avatar_url) {
          const fileName = member.avatar_url.split('/').pop()?.split('?')[0];
          if (fileName) {
            try {
              const objectMetadata = await env.BUCKET.head(fileName);
              if (objectMetadata) {
                const fileSize = objectMetadata.size;
                
                // Xóa file vật lý
                await env.BUCKET.delete(fileName);

                // Cập nhật sổ kế toán dung lượng
                const currentBytesRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'r2_storage_bytes'").first() as any;
                let currentBytes = currentBytesRow ? parseInt(currentBytesRow.value, 10) : 0;
                currentBytes = Math.max(0, currentBytes - fileSize);
                const newSizeMB = (currentBytes / (1024 * 1024)).toFixed(2) + " MB";

                await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_bytes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(currentBytes.toString()).run();
                await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_size', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(newSizeMB).run();
              }
            } catch (e) {
              console.error("Lỗi dọn rác R2 trong quá trình xóa cứng:", e);
            }
          }
        }

        // Xóa bản ghi trong database D1
        await env.DB.prepare("DELETE FROM members WHERE id = ?").bind(payload.id).run();
        await logAudit(env.DB, authorName, "Xóa vĩnh viễn", member?.full_name || payload.id);
        break;
      }

      default:
        throw new Error("Hành động không được hỗ trợ");
    }

    return new Response(JSON.stringify({ success: true }), { 
      status: 200, headers: { "Content-Type": "application/json" } 
    });

  } catch (error: any) {
    let friendlyMessage = error.message;
    if (error.message.includes("UNIQUE constraint failed")) {
      friendlyMessage = "Lỗi: Mã PIN này đã có người sử dụng. Vui lòng chọn 6 số khác!";
    }
    return new Response(JSON.stringify({ error: friendlyMessage }), { 
      status: 400, headers: { "Content-Type": "application/json" } 
    });
  }
};

// --- HELPERS ---
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function logAudit(db: D1Database, author: string, action: string, target: string) {
  await db.prepare("INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)")
    .bind(author, action, target).run();
}

async function upsertSetting(db: D1Database, key: string, value: string) {
  await db.prepare(`
    INSERT INTO system_settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).bind(key, value).run();
}
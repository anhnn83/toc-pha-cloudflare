// /functions/api/members/[id].ts -- version 1.8 (Final Sync & R2 Fix)

interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
}

/**
 * PUT: Cập nhật thông tin thành viên.
 */
export const onRequestPut: PagesFunction<Env, "id", { user: any }> = async (context) => {
  const { request, env, params, data } = context;
  const memberId = params.id as string;
  const user = data.user;
  const authorName = user?.mod_name || "Hệ thống";

  try {
    const input = await request.json() as any;

    if (user.role === "mod") {
      const isInBranch = await verifyBranchBoundary(env.DB, memberId, user.branch_root_id);
      if (!isInBranch) return new Response(JSON.stringify({ error: "Không thuộc nhánh quản lý" }), { status: 403 });
    }

    const oldData = await env.DB.prepare("SELECT avatar_url FROM members WHERE id = ?").bind(memberId).first() as any;
    const oldAvatarUrl = oldData?.avatar_url as string | null;

    await env.DB.prepare(`
      UPDATE members 
      SET full_name = ?, gender = ?, father_id = ?, mother_id = ?, relation_status = ?, is_alive = ?, 
          birthday = ?, is_birth_approximate = ?, death_date = ?, is_death_approximate = ?, 
          lunar_death_date = ?, location = ?, alias = ?, biography = ?, notes = ?, 
          avatar_url = ?, rank_in_family = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(
      input.full_name, input.gender, input.father_id || null, input.mother_id || null,
      input.relation_status, input.is_alive, input.birthday || null, input.is_birth_approximate || 0,
      input.death_date || null, input.is_death_approximate || 0, input.lunar_death_date || null,
      input.location || null, input.alias || null, input.biography || null, input.notes || null, 
      input.avatar_url || null, input.rank_in_family || 1, memberId
    ).run();

    // Dọn dẹp R2 nếu thay đổi ảnh trực tiếp trong hồ sơ.ts]
    if (oldAvatarUrl && oldAvatarUrl !== input.avatar_url) {
      const fileName = oldAvatarUrl.split('/').pop()?.split('?')[0];
      if (fileName) {
        const objectMetadata = await env.BUCKET.head(fileName);
        if (objectMetadata) {
          const deletedSize = objectMetadata.size;
          await env.BUCKET.delete(fileName);

          const currentBytesRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'r2_storage_bytes'").first() as any;
          let currentBytes = currentBytesRow ? parseInt(currentBytesRow.value, 10) : 0;
          currentBytes = Math.max(0, currentBytes - deletedSize);
          const newSizeMB = (currentBytes / (1024 * 1024)).toFixed(2) + " MB";

          // Cập nhật dùng cú pháp đồng bộ với upload.ts
          await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_bytes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(currentBytes.toString()).run();
          await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_size', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(newSizeMB).run();
        }
      }
    }

    await env.DB.prepare("INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)")
      .bind(authorName, "Cập nhật hồ sơ", input.full_name).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (err) {
    return new Response(JSON.stringify({ error: "Lỗi cập nhật" }), { status: 400 });
  }
};

/**
 * DELETE: Quy trình xóa 2 bước. 
 * Bước 1: Xóa mềm (is_deleted=1). Bước 2: Xóa vĩnh viễn (Chỉ SM).
 */
export const onRequestDelete: PagesFunction<Env, "id", { user: any }> = async (context) => {
  const { env, params, data } = context;
  const memberId = params.id as string;
  const user = data.user;
  const authorName = user?.mod_name || "Hệ thống";

  try {
    const member = await env.DB.prepare("SELECT full_name, avatar_url, is_deleted FROM members WHERE id = ?")
      .bind(memberId).first() as any;

    if (!member) return new Response(JSON.stringify({ error: "Không tìm thấy" }), { status: 404 });

    if (user.role === "mod") {
      const isInBranch = await verifyBranchBoundary(env.DB, memberId, user.branch_root_id);
      if (!isInBranch) return new Response(JSON.stringify({ error: "Không thuộc nhánh quản lý" }), { status: 403 });
    }

    // GIAI ĐOẠN 1: ĐANG HOẠT ĐỘNG -> VÀO THÙNG RÁC (GIỮ LẠI ẢNH ĐỂ KHÔI PHỤC).ts]
    if (member.is_deleted === 0) {
      const hasChildren = await env.DB.prepare(
        "SELECT id FROM members WHERE (father_id = ? OR mother_id = ?) AND is_deleted = 0 LIMIT 1"
      ).bind(memberId, memberId).first();

      if (hasChildren) return new Response(JSON.stringify({ error: "Người này đang có con cái" }), { status: 409 });

      await env.DB.prepare("UPDATE members SET is_deleted = 1 WHERE id = ?").bind(memberId).run();
      await env.DB.prepare("INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)")
        .bind(authorName, "Xóa mềm", member.full_name).run();

      return new Response(JSON.stringify({ success: true, message: "Đã đưa vào thùng rác." }));
    }

    // GIAI ĐOẠN 2: TRONG THÙNG RÁC -> XÓA VĨNH VIỄN & R2 (CHỈ SM).ts]
    if (member.is_deleted === 1) {
      if (user.role !== "sm" && user.role !== "super") {
        return new Response(JSON.stringify({ error: "Chỉ Trưởng tộc mới được xóa vĩnh viễn" }), { status: 403 });
      }

      // Xử lý dọn dẹp R2 vật lý
      if (member.avatar_url) {
        // TRÍCH XUẤT TÊN FILE CHUẨN (Loại bỏ ?v=...).ts]
        const fileName = member.avatar_url.split('/').pop()?.split('?')[0];
        
        if (fileName) {
          const objectMetadata = await env.BUCKET.head(fileName);
          
          if (objectMetadata) {
            const fileSize = objectMetadata.size;
            
            // Xóa file trên R2
            await env.BUCKET.delete(fileName);

            // Cập nhật dung lượng chính xác vào DB.ts]
            const currentBytesRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'r2_storage_bytes'").first() as any;
            let currentBytes = currentBytesRow ? parseInt(currentBytesRow.value, 10) : 0;
            
            currentBytes = Math.max(0, currentBytes - fileSize);
            const newSizeMB = (currentBytes / (1024 * 1024)).toFixed(2) + " MB";

            await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_bytes', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(currentBytes.toString()).run();
            await env.DB.prepare("INSERT INTO system_settings (key, value) VALUES ('r2_storage_size', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(newSizeMB).run();
          }
        }
      }

      // Xóa sổ vĩnh viễn khỏi Database
      await env.DB.prepare("DELETE FROM members WHERE id = ?").bind(memberId).run();
      await env.DB.prepare("INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)")
        .bind(authorName, "Xóa vĩnh viễn", member.full_name).run();

      return new Response(JSON.stringify({ success: true, message: "Đã xóa vĩnh viễn và giải phóng R2." }));
    }

    return new Response(JSON.stringify({ error: "Lỗi logic xóa" }), { status: 400 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Lỗi hệ thống" }), { status: 500 });
  }
};

async function verifyBranchBoundary(db: D1Database, targetId: string, branchRootId: string): Promise<boolean> {
  if (targetId === branchRootId) return true;
  const query = `
    WITH RECURSIVE ancestors AS (
      SELECT id, father_id, mother_id FROM members WHERE id = ?
      UNION ALL
      SELECT m.id, m.father_id, m.mother_id FROM members m
      JOIN ancestors a ON m.id = a.father_id OR m.id = a.mother_id
    )
    SELECT 1 FROM ancestors WHERE id = ? LIMIT 1
  `;
  const result = await db.prepare(query).bind(targetId, branchRootId).first();
  return !!result;
}
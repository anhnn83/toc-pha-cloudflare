// /functions/api/system/restore.ts -- version 1.1

interface Env {
  DB: D1Database;
}

/**
 * POST: Khôi phục toàn bộ cơ sở dữ liệu từ tệp JSON sao lưu.
 * Quy trình: Xóa sạch dữ liệu hiện tại và tái thiết lập từ tệp upload.
 * Chỉ dành riêng cho Trưởng tộc (SM).
 */
export const onRequestPost: PagesFunction<Env, any, { user: any }> = async (context) => {
  const { request, env, data } = context;
  const user = data.user;

  // 1. Kiểm tra quyền hạn tối cao
  if (user.role !== "sm") {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 403 });
  }

  try {
    const body = await request.json() as any;
    const { family_tree_data } = body;
    
    if (!family_tree_data) {
      throw new Error("Cấu trúc tệp sao lưu không hợp lệ");
    }

    const { members, marriages, permissions, system_settings } = family_tree_data;

    // 2. Chuẩn bị danh sách lệnh thực thi hàng loạt (Batch) để đảm bảo tính toàn vẹn
    const statements: D1PreparedStatement[] = [
      env.DB.prepare("DELETE FROM members"),
      env.DB.prepare("DELETE FROM marriages"),
      env.DB.prepare("DELETE FROM permissions"),
      env.DB.prepare("DELETE FROM system_settings")
    ];

    // Chèn lại dữ liệu Thành viên
    for (const m of members) {
      statements.push(env.DB.prepare(`
        INSERT INTO members (
          id, full_name, gender, father_id, mother_id, generation, rank_in_family,
          is_alive, birthday, is_birth_approximate, death_date, is_death_approximate,
          relation_status, location, alias, biography, notes, avatar_url, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        m.id, m.full_name, m.gender, m.father_id, m.mother_id, m.generation, m.rank_in_family,
        m.is_alive, m.birthday, m.is_birth_approximate, m.death_date, m.is_death_approximate,
        m.relation_status, m.location, m.alias, m.biography, m.notes, m.avatar_url, m.is_deleted
      ));
    }

    // Chèn lại dữ liệu Hôn nhân
    for (const mar of marriages) {
      statements.push(env.DB.prepare("INSERT INTO marriages (member_id, spouse_id, status) VALUES (?, ?, ?)")
        .bind(mar.member_id, mar.spouse_id, mar.status));
    }

    // Chèn lại dữ liệu Phân quyền (Đã khắc phục lỗi unused variable)
    for (const p of permissions) {
      statements.push(env.DB.prepare(`
        INSERT INTO permissions (id, pin_hash, role, branch_root_id, mod_name, created_by)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(p.id, p.pin_hash, p.role, p.branch_root_id, p.mod_name, p.created_by));
    }

    // Chèn lại Cấu hình hệ thống
    for (const s of system_settings) {
      statements.push(env.DB.prepare("INSERT INTO system_settings (key, value) VALUES (?, ?)")
        .bind(s.key, s.value));
    }

    // 3. Thực thi toàn bộ lệnh trong một giao dịch duy nhất
    await env.DB.batch(statements);

    // 4. Ghi nhật ký hệ thống
    await env.DB.prepare("INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)")
      .bind(user.mod_name, "DATABASE_RESTORE", "FULL_RESTORE_SUCCESS").run();

    return new Response(JSON.stringify({ success: true, message: "Hệ thống đã được khôi phục trạng thái sao lưu" }));

  } catch (err: any) {
    return new Response(JSON.stringify({ error: `Lỗi khôi phục: ${err.message}` }), { status: 500 });
  }
};
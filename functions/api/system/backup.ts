// /functions/api/system/backup.ts -- version 1.0

interface Env {
  DB: D1Database;
}

/**
 * GET: Xuất toàn bộ dữ liệu cơ sở dữ liệu D1 dưới dạng JSON.
 * Chỉ dành riêng cho quyền Trưởng tộc (SM) để thực hiện sao lưu cục bộ.
 */
export const onRequestGet: PagesFunction<Env, any, { user: any }> = async (context) => {
  const { env, data } = context;
  const user = data.user;

  // 1. Kiểm tra quyền hạn tối cao
  if (user.role !== "sm") {
    return new Response(JSON.stringify({ error: "Quyền hạn không đủ để thực hiện sao lưu" }), { 
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 2. Truy vấn dữ liệu từ tất cả các bảng cốt lõi
    const [members, marriages, permissions, settings] = await Promise.all([
      env.DB.prepare("SELECT * FROM members").all(),
      env.DB.prepare("SELECT * FROM marriages").all(),
      env.DB.prepare("SELECT * FROM permissions").all(),
      env.DB.prepare("SELECT * FROM system_settings").all()
    ]);

    // 3. Đóng gói dữ liệu vào một đối tượng Snapshot duy nhất
    const backupData = {
      version: "1.0",
      timestamp: new Date().toISOString(),
      family_tree_data: {
        members: members.results,
        marriages: marriages.results,
        permissions: permissions.results,
        system_settings: settings.results
      },
      metadata: {
        exported_by: user.mod_name,
        total_members: members.results.length
      }
    };

    // 4. Trả về tệp JSON kèm Header ép buộc trình duyệt tải xuống
    const fileName = `giapha_backup_${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Lỗi trong quá trình kết xuất dữ liệu" }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
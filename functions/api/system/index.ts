// /functions/api/system/index.ts -- version 3.0

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env, any, { user: any }> = async (context) => {
  const { env, data } = context;
  const user = data.user;

  // 1. Chặn đứng các truy cập không phải Trưởng tộc (SM)
  if (!user || user.role !== 'sm') {
    return new Response(JSON.stringify({ error: "Unauthorized Access. SM Only." }), { 
      status: 403,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    // 2. Thực thi đa luồng (Parallel Queries) để lấy toàn bộ dữ liệu Dashboard
    const [
      modsData,
      recycleBinData,
      auditLogsData,
      settingsData
    ] = await Promise.all([
      // Lấy danh sách Mod
      env.DB.prepare("SELECT id, mod_name, branch_root_id, created_at FROM permissions WHERE role = 'mod'").all(),
      // Lấy danh sách thành viên trong thùng rác (Xóa mềm)
      env.DB.prepare("SELECT id, full_name, gender, created_at FROM members WHERE is_deleted = 1 ORDER BY updated_at DESC").all(),
      // Lấy 50 log thao tác gần nhất
      env.DB.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50").all(),
      // Lấy cấu hình hệ thống và thống kê
      env.DB.prepare("SELECT key, value FROM system_settings").all()
    ]);

    const settings = (settingsData.results as { key: string; value: string }[]) || [];
    
    // 3. Trích xuất các chỉ số giám sát (Analytics & Storage)
    const views = settings.find((s) => s.key === 'total_page_views')?.value || '0';
    const r2Size = settings.find((s) => s.key === 'r2_storage_size')?.value || '0 MB';

    // 4. Đóng gói Payload
    const dashboardData = {
      stats: {
        views: parseInt(views, 10),
        r2_size: r2Size
      },
      mods: modsData.results || [],
      recycleBin: recycleBinData.results || [],
      auditLogs: auditLogsData.results || [],
      settings: settings
    };

    return new Response(JSON.stringify(dashboardData), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
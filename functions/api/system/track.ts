// /functions/api/system/track.ts -- version 1.0

interface Env {
  DB: D1Database;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    // Tự động tăng giá trị lên 1, nếu chưa có thì khởi tạo là 1
    await context.env.DB.prepare(`
      INSERT INTO system_settings (key, value) VALUES ('total_page_views', '1')
      ON CONFLICT(key) DO UPDATE SET value = CAST(CAST(value AS INTEGER) + 1 AS TEXT), updated_at = CURRENT_TIMESTAMP
    `).run();

    return new Response(JSON.stringify({ success: true }));
  } catch (e) {
    // Không cần quăng lỗi mạnh vì đây chỉ là thao tác tracking chạy ngầm
    return new Response(JSON.stringify({ error: "Failed to track" }), { status: 500 });
  }
};
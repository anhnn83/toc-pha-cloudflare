// functions/api/system/settings.ts -version 1.1

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results } = await context.env.DB.prepare(
      "SELECT key, value FROM system_settings"
    ).all();

    return Response.json(results || []);
  } catch (err) {
    return Response.json([
      { key: "family_name", value: "Gia Phả Gia Tộc" },
      { key: "view_pin_hash", value: "" }, // Để rỗng tức là không khóa chế độ xem của khách
      { key: "about_family", value: "" },
      { key: "family_photos", value: "[]" }
    ]);
  }
};
// /functions/api/upload.ts -- version 2.0 (Tính dung lượng R2 & Fix URL nội bộ)

interface Env {
  BUCKET: R2Bucket;
  DB: D1Database; // Cấp quyền cho Upload truy cập Database để cập nhật dung lượng
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response(JSON.stringify({ error: "Không tìm thấy tệp tin" }), { status: 400 });
    }

    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return new Response(JSON.stringify({ error: "Dung lượng vượt quá 10MB" }), { status: 413 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return new Response(JSON.stringify({ error: "Chỉ hỗ trợ JPG, PNG, WEBP" }), { status: 415 });
    }

    const extension = file.name.split('.').pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${extension}`;

    // 1. Upload lên R2
    await env.BUCKET.put(fileName, file.stream(), {
      httpMetadata: { contentType: file.type }
    });

    // 2. Cập nhật dung lượng bộ nhớ R2 vào Database
    const currentBytesRow = await env.DB.prepare("SELECT value FROM system_settings WHERE key = 'r2_storage_bytes'").first() as any;
    const currentBytes = currentBytesRow ? parseInt(currentBytesRow.value, 10) : 0;
    const newBytes = currentBytes + file.size;
    const newSizeMB = (newBytes / (1024 * 1024)).toFixed(2) + " MB";
    
    // Lưu định dạng hiển thị cho Admin (MB)
    await env.DB.prepare(`
      INSERT INTO system_settings (key, value) VALUES ('r2_storage_size', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(newSizeMB).run();
    
    // Lưu số Bytes thực tế để tính toán chính xác ở những lần sau
    await env.DB.prepare(`
      INSERT INTO system_settings (key, value) VALUES ('r2_storage_bytes', ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).bind(newBytes.toString()).run();

    // 3. Trả về URL nội bộ (Fix lỗi không hiển thị ảnh khi chạy Local)
    // const urlObj = new URL(request.url);
    // const publicUrl = `${urlObj.origin}/api/images/${fileName}`;
    const publicUrl = `/api/images/${fileName}`;

    return new Response(JSON.stringify({ 
      success: true, 
      url: publicUrl,
      fileName: fileName 
    }), { status: 200 });

  } catch (err) {
    return new Response(JSON.stringify({ error: "Lỗi hệ thống khi xử lý tải tệp" }), { status: 500 });
  }
};
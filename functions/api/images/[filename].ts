// /functions/api/images/[filename].ts --version 1.0

interface Env {
  BUCKET: R2Bucket;
}

export const onRequestGet: PagesFunction<Env, "filename"> = async (context) => {
  const { env, params } = context;
  const fileName = params.filename as string;

  // Tránh lỗi khi trình duyệt request URL rỗng hoặc sai
  if (!fileName) {
    return new Response("Bad Request", { status: 400 });
  }

  try {
    const file = await env.BUCKET.get(fileName);

    if (!file) {
      return new Response("Image not found", { status: 404 });
    }

    const headers = new Headers();
    file.writeHttpMetadata(headers);
    headers.set("etag", file.httpEtag);
    
    // Tối ưu hóa: Bật cache trình duyệt 30 ngày để giảm tải cho R2
    headers.set("Cache-Control", "public, max-age=2592000, immutable");

    return new Response(file.body, {
      status: 200,
      headers,
    });
  } catch (err) {
    return new Response("Internal Server Error", { status: 500 });
  }
};
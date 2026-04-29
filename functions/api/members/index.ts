// /functions/api/members/index.ts -- version 2.4 (Fix Audit Log Author & Two-way Marriages)

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const { results: members } = await context.env.DB.prepare(
      "SELECT * FROM members WHERE is_deleted = 0"
    ).all();

    if (!members || members.length === 0) return Response.json([]);

    const { results: marriages } = await context.env.DB.prepare(
      "SELECT * FROM marriages"
    ).all();

    const finalResults = members.map((member: any) => {
      const relevantMarriages = (marriages || []).filter(
        (m: any) => m.member_id === member.id || m.spouse_id === member.id
      );

      const spouses = relevantMarriages.map((m: any) => {
        const spouseId = m.member_id === member.id ? m.spouse_id : m.member_id;
        return { id: spouseId, status: m.status };
      });

      return {
        ...member,
        spouses
      };
    });

    return Response.json(finalResults);
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};

export const onRequestPost: PagesFunction<Env, any, { user: any }> = async (context) => {
  const { request, env, data } = context;

  // Lấy tên người thao tác từ Token Payload thông qua Middleware (Sửa lỗi số 8)
  const authorName = data.user?.mod_name || "Hệ thống";

  try {
    const member = await request.json() as any;
    
    // 1. Chèn thành viên vào bảng members
    await env.DB.prepare(`
      INSERT INTO members (
        id, full_name, alias, gender, relation_status, is_alive, 
        father_id, mother_id, location, biography, notes, avatar_url, 
        rank_in_family, birthday, is_birth_approximate, death_date, 
        is_death_approximate, lunar_death_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      member.id, member.full_name, member.alias || null, member.gender,
      member.relation_status, member.is_alive, member.father_id || null, 
      member.mother_id || null, member.location || null, member.biography || null, 
      member.notes || null, member.avatar_url || null, member.rank_in_family || 1,
      member.birthday || null, member.is_birth_approximate || 0, 
      member.death_date || null, member.is_death_approximate || 0, 
      member.lunar_death_date || null
    ).run();

    // 2. XỬ LÝ QUAN HỆ HÔN NHÂN
    if (member.relation_status === 'in_law' && member._bloodlineSpouseId) {
      await env.DB.prepare(
        "INSERT INTO marriages (member_id, spouse_id, status) VALUES (?, ?, ?)"
      ).bind(
        member._bloodlineSpouseId,
        member.id,
        member._marriageStatus || 'current'
      ).run();
    }

    // 3. Ghi nhật ký audit với tên thật
    await env.DB.prepare(
      "INSERT INTO audit_logs (author_name, action, target_name) VALUES (?, ?, ?)"
    ).bind(authorName, "Thêm thành viên mới", member.full_name).run();

    return Response.json({ success: true });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
};
export const runtime = "edge";

import { NextRequest } from "next/server";
import { getDb } from "@/db";
import { players } from "@/db/schema";
import { and, eq, like, or } from "drizzle-orm";

// GET /api/players?team=<canonical-team-name>&q=<query>&limit=20
// 選手リスト検索 (タイトル予想 combobox 用)。
// - team: lib/teams.ts canonical 名で絞り込み (例: 阪神タイガース)
// - q: 名前 / フリガナの部分一致
// - limit: max 50, default 20
// - is_active=1 のみ返す (退団選手は新規予想で出さない)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const team = searchParams.get("team")?.trim();
    const q = searchParams.get("q")?.trim();
    const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
    const limit = Math.min(Math.max(isNaN(limitRaw) ? 20 : limitRaw, 1), 50);

    const db = getDb();
    const conditions = [eq(players.isActive, 1)];
    if (team) conditions.push(eq(players.teamName, team));
    if (q && q.length > 0) {
      const pattern = `%${q}%`;
      const qOr = or(like(players.name, pattern), like(players.nameKana, pattern));
      if (qOr) conditions.push(qOr);
    }

    const whereClause = conditions.length === 1 ? conditions[0] : and(...conditions);
    const rows = await db
      .select({
        id: players.id,
        name: players.name,
        nameKana: players.nameKana,
        teamName: players.teamName,
        position: players.position,
        uniformNumber: players.uniformNumber,
      })
      .from(players)
      .where(whereClause)
      .limit(limit);

    return new Response(
      JSON.stringify({
        players: rows,
        count: rows.length,
        // last_updated_at: Phase 3 で max(lastSeenAt) を返す
      }),
      {
        status: 200,
        headers: {
          "content-type": "application/json",
          "cache-control": "public, max-age=60, s-maxage=300",
        },
      },
    );
  } catch (e) {
    console.error("/api/players error:", e);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

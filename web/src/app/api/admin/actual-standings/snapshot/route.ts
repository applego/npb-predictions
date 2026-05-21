export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { actualTeamStandings } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-server";

interface StandingInput {
  seasonId: number;
  league: "central" | "pacific";
  rank: number;
  teamName: string;
  wins: number;
  losses: number;
  draws: number;
  isFinal?: boolean;
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const body = (await req.json()) as { standings: StandingInput[] };

  const inserted = await getDb()
    .insert(actualTeamStandings)
    .values(
      body.standings.map((s) => ({
        seasonId: s.seasonId,
        league: s.league,
        rank: s.rank,
        teamName: s.teamName,
        wins: s.wins,
        losses: s.losses,
        draws: s.draws,
        isFinal: s.isFinal ?? false,
      }))
    )
    .returning();

  return NextResponse.json({ inserted: inserted.length });
}

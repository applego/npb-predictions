export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { actualTitleSnapshots } from "@/db/schema";

interface TitleSnapshotInput {
  seasonId: number;
  league: "central" | "pacific";
  category:
    | "batting_avg"
    | "rbi"
    | "home_runs"
    | "wins"
    | "era"
    | "saves";
  playerName: string;
  teamName?: string;
  value?: number;
  isFinal?: boolean;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { snapshots: TitleSnapshotInput[] };

  const inserted = await getDb()
    .insert(actualTitleSnapshots)
    .values(
      body.snapshots.map((s) => ({
        seasonId: s.seasonId,
        league: s.league,
        category: s.category,
        playerName: s.playerName,
        teamName: s.teamName ?? null,
        value: s.value ?? null,
        isFinal: s.isFinal ?? false,
      }))
    )
    .returning();

  return NextResponse.json({ inserted: inserted.length });
}

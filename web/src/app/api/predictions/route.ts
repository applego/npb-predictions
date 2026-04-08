export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { predictions, rankingPicks, titlePicks } from "@/db/schema";

interface RankingPickInput {
  league: "central" | "pacific";
  rank: number;
  teamName: string;
}

interface TitlePickInput {
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
}

interface PredictionInput {
  userId: number;
  seasonId: number;
  rankings: RankingPickInput[];
  titles: TitlePickInput[];
}

export async function POST(req: Request) {
  const body = (await req.json()) as PredictionInput;

  const [prediction] = await getDb()
    .insert(predictions)
    .values({
      userId: body.userId,
      seasonId: body.seasonId,
    })
    .returning();

  if (body.rankings?.length) {
    await getDb().insert(rankingPicks).values(
      body.rankings.map((r) => ({
        predictionId: prediction.id,
        league: r.league,
        rank: r.rank,
        teamName: r.teamName,
      }))
    );
  }

  if (body.titles?.length) {
    await getDb().insert(titlePicks).values(
      body.titles.map((t) => ({
        predictionId: prediction.id,
        league: t.league,
        category: t.category,
        playerName: t.playerName,
        teamName: t.teamName ?? null,
      }))
    );
  }

  return NextResponse.json(prediction, { status: 201 });
}

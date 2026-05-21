export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { seasons } from "@/db/schema";
import { requireAdmin } from "@/lib/auth-server";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const body = (await req.json()) as {
    year: number;
    label: string;
    lockDate?: string;
  };

  const [season] = await getDb()
    .insert(seasons)
    .values({
      year: body.year,
      label: body.label,
      lockDate: body.lockDate ? new Date(body.lockDate) : null,
    })
    .returning();

  return NextResponse.json(season, { status: 201 });
}

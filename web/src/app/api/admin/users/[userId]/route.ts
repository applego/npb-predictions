export const runtime = "edge";

import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth-server";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin(req);
  if (auth instanceof Response) return auth;
  const { userId } = await params;
  const uid = parseInt(userId, 10);
  if (Number.isNaN(uid)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 });
  }

  const body = (await req.json()) as { sourceUrl?: string | null; source?: string | null };

  const [updated] = await getDb()
    .update(users)
    .set({
      ...(body.sourceUrl !== undefined && { sourceUrl: body.sourceUrl?.trim() || null }),
      ...(body.source !== undefined && { source: body.source?.trim() || null }),
    })
    .where(eq(users.id, uid))
    .returning();

  if (!updated) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export const runtime = "edge";

import { redirect } from "next/navigation";

export default function GamesIndex() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 3600 * 1000);
  const today = jst.toISOString().slice(0, 10);
  redirect(`/games/${today}`);
}

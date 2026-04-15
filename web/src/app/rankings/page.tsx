import { redirect } from "next/navigation";

// /rankings → default tab
export default function RankingsIndexPage() {
  redirect("/rankings/commentators");
}

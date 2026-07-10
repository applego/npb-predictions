import { redirect } from "next/navigation";

export const runtime = "edge";

export default function NewGroupPage() {
  redirect("/groups?create=1");
}

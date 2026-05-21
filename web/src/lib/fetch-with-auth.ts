// Client-side helper: attach Firebase ID Token to outgoing fetch requests.

import { getFirebaseAuth } from "@/lib/firebase";

async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (err) {
    console.warn("[auth] getIdToken failed:", err);
    return null;
  }
}

export async function fetchWithAuth(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getIdToken();
  const headers = new Headers(init.headers ?? {});
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return fetch(input, { ...init, headers });
}

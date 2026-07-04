// Edge-runtime compatible Firebase ID Token verification.
// Uses jose to verify against Google's public JWKS for Firebase Auth.

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from "jose";
import { getDb } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

const FIREBASE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/";

// Cached JWKS — `jose` handles HTTP caching headers internally.
const jwks = createRemoteJWKSet(new URL(FIREBASE_JWKS_URL));

export interface VerifiedToken {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  payload: JWTPayload;
}

export interface AppUser {
  id: number;
  name: string;
  slug: string;
  avatarUrl: string | null;
  role: string;
  firebaseUid: string;
  email: string | null;
}

function getProjectId(): string | null {
  return process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null;
}

function adminUids(): Set<string> {
  return new Set(
    (process.env.NEXT_PUBLIC_ADMIN_UIDS ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
}

// Email-based admin allow-list. applegorillappa@gmail.com is always an admin;
// NEXT_PUBLIC_ADMIN_EMAILS can add more (comma-separated). Kept in sync with
// the client-side check in AuthContext.tsx.
const DEFAULT_ADMIN_EMAILS = ["applegorillappa@gmail.com"];

function adminEmails(): Set<string> {
  return new Set(
    [
      ...DEFAULT_ADMIN_EMAILS,
      ...(process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(","),
    ]
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
  );
}

function extractBearerToken(req: Request): string | null {
  const header =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!header) return null;
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

export async function verifyIdToken(
  req: Request
): Promise<VerifiedToken | null> {
  const token = extractBearerToken(req);
  if (!token) return null;

  const projectId = getProjectId();
  if (!projectId) {
    console.error("[auth] NEXT_PUBLIC_FIREBASE_PROJECT_ID is not configured");
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `${FIREBASE_ISSUER_PREFIX}${projectId}`,
      audience: projectId,
      algorithms: ["RS256"],
    });
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      return null;
    }
    // auth_time must exist for genuine Firebase tokens
    if (typeof payload.auth_time !== "number") return null;
    return {
      uid: payload.sub,
      email: typeof payload.email === "string" ? payload.email : null,
      emailVerified: payload.email_verified === true,
      payload,
    };
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] Token verification failed:", err);
    }
    return null;
  }
}

function unauthorized(message = "Unauthorized"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function forbidden(message = "Forbidden"): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Verify the request's bearer token AND look up the linked app user.
 * Returns either an AppUser context or an HTTP Response (401) to return immediately.
 *
 * Usage:
 *   const auth = await requireAuth(req);
 *   if (auth instanceof Response) return auth;
 *   const { user } = auth;
 */
export async function requireAuth(
  req: Request
): Promise<{ user: AppUser; token: VerifiedToken } | Response> {
  const token = await verifyIdToken(req);
  if (!token) return unauthorized();

  const rows = await getDb()
    .select()
    .from(users)
    .where(eq(users.firebaseUid, token.uid))
    .limit(1);

  if (rows.length === 0) {
    return unauthorized(
      "User not linked. POST /api/auth/link-user to create the app user."
    );
  }
  const u = rows[0];
  if (!u.firebaseUid) {
    // Defensive: lookup matched but column is null (shouldn't happen with WHERE filter)
    return unauthorized();
  }
  return {
    user: {
      id: u.id,
      name: u.name,
      slug: u.slug,
      avatarUrl: u.avatarUrl,
      role: u.role,
      firebaseUid: u.firebaseUid,
      email: u.email,
    },
    token,
  };
}

/**
 * Same as requireAuth, but additionally requires the user to be an admin
 * (either via NEXT_PUBLIC_ADMIN_UIDS allow-list or users.role === "admin").
 */
export async function requireAdmin(
  req: Request
): Promise<{ user: AppUser; token: VerifiedToken } | Response> {
  const result = await requireAuth(req);
  if (result instanceof Response) return result;
  const tokenEmail =
    typeof result.token.email === "string" ? result.token.email.toLowerCase() : null;
  const isAdmin =
    adminUids().has(result.token.uid) ||
    result.user.role === "admin" ||
    (result.token.emailVerified &&
      tokenEmail !== null &&
      adminEmails().has(tokenEmail));
  if (!isAdmin) return forbidden("Admin only");
  return result;
}

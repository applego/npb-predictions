import { drizzle } from "drizzle-orm/d1";
import { getRequestContext } from "@cloudflare/next-on-pages";
import * as schema from "./schema";

export function getDb() {
  const { env } = getRequestContext();
  // D1Database type from Cloudflare Workers runtime
  // eslint-disable-next-line
  return drizzle((env as any).DB, { schema });
}

export type DbClient = ReturnType<typeof getDb>;

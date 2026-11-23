import { readdir, readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim() ?? "";
let pool: pg.Pool | undefined;
let local: Promise<PGlite> | undefined;

type Row = Record<string, unknown>;

export async function sql<T = Row>(text: string, params: unknown[] = []): Promise<T[]> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    return (await pool.query(text, params)).rows as T[];
  }
  local ??= startLocal().catch((error: unknown) => {
    local = undefined;
    throw error;
  });
  return (await (await local).query<T>(text, params)).rows;
}

export async function withDb<T>(fn: (query: typeof sql) => Promise<T>): Promise<T> {
  if (databaseUrl !== "") {
    pool ??= new pg.Pool({ connectionString: databaseUrl, max: 5 });
    const client = await pool.connect();
    const query = async <R = Row>(text: string, params: unknown[] = []) =>
      (await client.query(text, params)).rows as R[];
    try {
      await client.query("begin");
      const result = await fn(query);
      await client.query("commit");
      return result;
    } catch (error) {
      try { await client.query("rollback"); } catch { /* already aborted */ }
      throw error;
    } finally {
      client.release();
    }
  }
  const db = await (local ??= startLocal());
  const query = async <R = Row>(text: string, params: unknown[] = []) =>
    (await db.query<R>(text, params)).rows;
  await db.exec("begin");
  try {
    const result = await fn(query);
    await db.exec("commit");
    return result;
  } catch (error) {
    try { await db.exec("rollback"); } catch { /* already aborted */ }
    throw error;
  }
}

async function startLocal(): Promise<PGlite> {
  const db = new PGlite();
  const files = (await readdir("migrations").catch(() => [])).filter((f) => f.endsWith(".sql")).sort();
  for (const file of files) {
    await db.exec(await readFile(`migrations/${file}`, "utf8"));
  }
  return db;
}

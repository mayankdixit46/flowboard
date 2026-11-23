import { requireIdentity } from "../../../cursor/identity.js";
import { asBoard, summarize, type Board } from "../../../src/lib/board";
import { sql, withDb } from "../../../src/lib/db";

export const dynamic = "force-dynamic";

type Identity = Exclude<Awaited<ReturnType<typeof requireIdentity>>, Response>;

function stageOf(identity: Identity): "preview" | "production" {
  return identity.verified && identity.stage === "preview" ? "preview" : "production";
}

function actorName(identity: Identity): string {
  if (!identity.verified) return "";
  if (identity.kind === "key") return identity.name || "API key";
  return identity.name || "Someone";
}

function actorSub(identity: Identity): string {
  return identity.verified ? identity.sub : "";
}

type Activity = { actorName: string; summary: string; createdAt: string };

async function activityFor(stage: string): Promise<Activity[]> {
  const rows = await sql<{ actor_name: string; summary: string; created_at: Date | string }>(
    "select actor_name, summary, created_at from board_activity where stage = $1 order by id desc limit 30",
    [stage],
  );
  return rows.map((row) => ({
    actorName: row.actor_name,
    summary: row.summary,
    createdAt: new Date(row.created_at).toISOString(),
  }));
}

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "private, no-store" } });
}

export async function GET(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  const stage = stageOf(identity);
  const rows = await sql<{ document: Board; revision: number | string; updated_by: string }>(
    "select document, revision, updated_by from board where stage = $1",
    [stage],
  );
  const row = rows[0];
  return json({
    board: row ? row.document : null,
    revision: row ? Number(row.revision) : 0,
    updatedBy: row ? row.updated_by : "",
    viewerName: actorName(identity),
    activity: await activityFor(stage),
  });
}

export async function PUT(request: Request) {
  const identity = await requireIdentity(request);
  if (identity instanceof Response) return identity;
  const stage = stageOf(identity);
  const name = actorName(identity) || "Someone";
  const sub = actorSub(identity);
  let payload: unknown;
  try {
    const text = await request.text();
    if (text.length > 500000) return json({ error: "too_large" }, 413);
    payload = JSON.parse(text);
  } catch {
    return json({ error: "bad_json" }, 400);
  }
  const body = payload as { board?: unknown; baseRevision?: unknown };
  const board = asBoard(body.board);
  if (!board) return json({ error: "bad_board" }, 400);
  const baseRevision = Number(body.baseRevision);
  if (!Number.isInteger(baseRevision) || baseRevision < 0) return json({ error: "bad_revision" }, 400);

  const saved = await withDb(async (query) => {
    const current = await query<{ document: Board; revision: number | string; updated_by: string }>(
      "select document, revision, updated_by from board where stage = $1 for update",
      [stage],
    );
    const row = current[0];
    const revision = row ? Number(row.revision) : 0;
    if (revision !== baseRevision) {
      return { conflict: true as const, board: row ? row.document : null, revision, updatedBy: row ? row.updated_by : "" };
    }
    const summary = summarize(row ? row.document : null, board);
    const nextRevision = revision + 1;
    if (!row) {
      await query(
        "insert into board (stage, document, revision, updated_by) values ($1, $2::jsonb, $3, $4)",
        [stage, JSON.stringify(board), nextRevision, name],
      );
    } else {
      await query(
        "update board set document = $2::jsonb, revision = $3, updated_at = now(), updated_by = $4 where stage = $1",
        [stage, JSON.stringify(board), nextRevision, name],
      );
    }
    await query(
      "insert into board_activity (stage, revision, actor_name, actor_sub, summary) values ($1, $2, $3, $4, $5)",
      [stage, nextRevision, name, sub, summary],
    );
    return { conflict: false as const, revision: nextRevision, updatedBy: name };
  });

  if (saved.conflict) {
    return json({
      board: saved.board,
      revision: saved.revision,
      updatedBy: saved.updatedBy,
      viewerName: actorName(identity),
      activity: await activityFor(stage),
    }, 409);
  }
  return json({
    revision: saved.revision,
    updatedBy: saved.updatedBy,
    viewerName: actorName(identity),
    activity: await activityFor(stage),
  });
}

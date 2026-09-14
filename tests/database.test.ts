import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
const n = "00000000-0000-4000-8000-000000000001",
  k = "00000000-0000-4000-8000-000000000002",
  w = "00000000-0000-4000-8000-000000000003",
  o = "00000000-0000-4000-8000-000000000004",
  w2 = "00000000-0000-4000-8000-000000000005";
let db: PGlite;
let privateId: string, sharedId: string, namedId: string;
async function as(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function add(
  title: string,
  visibility = "private",
  recipient: string | null = null,
  parent: string | null = null,
) {
  return db.query<{ id: string }>(
    "insert into public.records(workspace_id,owner_id,domain,kind,title,visibility,recipient_id,parent_id) values($1,auth.uid(),$2,$3,$4,$5,$6,$7) returning id",
    [
      w,
      "personal",
      parent ? "comment" : "journal",
      title,
      visibility,
      recipient,
      parent,
    ],
  );
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  await db.exec(readFileSync("supabase/migrations/001_foundation.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/002_training.sql", "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [n, k, o]);
  await db.query(
    "insert into public.workspaces(id,name) values($1,'Juntos'),($2,'Other')",
    [w, w2],
  );
  await db.query(
    "insert into public.memberships(workspace_id,user_id,display_name) values($1,$2,'Neil'),($1,$3,'Kamilla'),($4,$5,'Other')",
    [w, n, k, w2, o],
  );
  await as(n);
  privateId = (await add("Neil private")).rows[0].id;
  sharedId = (await add("Together", "shared")).rows[0].id;
  namedId = (await add("For Kamilla", "recipient", k)).rows[0].id;
});
afterAll(async () => {
  await db.close();
});
describe("actual PostgreSQL RLS and write constraints", () => {
  it("owner can read private, named and shared records", async () => {
    await as(n);
    expect((await db.query("select * from records")).rows).toHaveLength(3);
  });
  it("other member can read shared/named but cannot see private titles", async () => {
    await as(k);
    const rows = (
      await db.query<{ title: string }>("select title from records")
    ).rows;
    expect(rows.map((r) => r.title).sort()).toEqual([
      "For Kamilla",
      "Together",
    ]);
  });
  it("outsider cannot read records or membership metadata", async () => {
    await as(o);
    expect((await db.query("select * from records")).rows).toHaveLength(0);
    expect(
      (await db.query("select * from memberships where workspace_id=$1", [w]))
        .rows,
    ).toHaveLength(0);
  });
  it("unauthenticated role cannot read records", async () => {
    await db.exec("reset role;set role anon");
    await expect(db.query("select * from records")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("cannot spoof ownership on insert", async () => {
    await as(k);
    await expect(
      db.query(
        "insert into records(workspace_id,owner_id,domain,kind,title) values($1,$2,'personal','journal','spoof')",
        [w, n],
      ),
    ).rejects.toThrow(/row-level security/);
  });
  it("member cannot update or delete another person’s shared record", async () => {
    await as(k);
    expect(
      (
        await db.query(
          "update records set body='spoof' where id=$1 returning id",
          [sharedId],
        )
      ).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query("delete from records where id=$1 returning id", [
          sharedId,
        ])
      ).rows,
    ).toHaveLength(0);
  });
  it("cannot change record owner", async () => {
    await as(n);
    await expect(
      db.query("update records set owner_id=$1 where id=$2", [k, privateId]),
    ).rejects.toThrow(/immutable/);
  });
  it("cannot make own workspace membership or bypass audit", async () => {
    await as(k);
    await expect(
      db.query(
        "update memberships set display_name='Changed' where user_id=$1",
        [k],
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(db.query("delete from audit_events")).rejects.toThrow(
      /permission denied/,
    );
  });
  it("cannot share to a person outside the workspace", async () => {
    await as(n);
    await expect(add("Foreign share", "recipient", o)).rejects.toThrow();
  });
  it("rejects a shared child of a private record", async () => {
    await as(n);
    await expect(add("Leaky child", "shared", null, privateId)).rejects.toThrow(
      /audience/,
    );
  });
  it("cannot link to another person’s private record", async () => {
    await as(k);
    await expect(
      add("Hidden link", "private", null, privateId),
    ).rejects.toThrow(/unavailable/);
  });
  it("supports a reply to a shared parent with the same audience", async () => {
    await as(k);
    expect(
      (await add("Shared reply", "shared", null, sharedId)).rows,
    ).toHaveLength(1);
  });
  it("supports reciprocal replies in a named-recipient conversation", async () => {
    await as(k);
    expect(
      (await add("Named reply", "recipient", n, namedId)).rows,
    ).toHaveLength(1);
  });
  it("blocks audience changes and deletion that orphan replies", async () => {
    await as(n);
    await expect(
      db.query("update records set visibility='private' where id=$1", [
        sharedId,
      ]),
    ).rejects.toThrow(/coordinated/);
    await expect(
      db.query("delete from records where id=$1", [sharedId]),
    ).rejects.toThrow(/foreign key/);
  });
  it("allows explicit sharing then revocation before replies", async () => {
    await as(n);
    const id = (await add("Revocable")).rows[0].id;
    await db.query("update records set visibility='shared' where id=$1", [id]);
    await as(k);
    expect(
      (await db.query("select id from records where id=$1", [id])).rows,
    ).toHaveLength(1);
    await as(n);
    await db.query("update records set visibility='private' where id=$1", [id]);
    await as(k);
    expect(
      (await db.query("select id from records where id=$1", [id])).rows,
    ).toHaveLength(0);
  });
  it("audits writes without content and isolates audit events by actor", async () => {
    await as(k);
    const rows = (
      await db.query<{ actor_id: string }>("select * from audit_events")
    ).rows;
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.actor_id === k)).toBe(true);
    expect(Object.keys(rows[0])).not.toContain("body");
  });
  it("validates workout numbers on direct database writes", async () => {
    await as(n);
    await expect(
      db.query(
        "insert into records(workspace_id,owner_id,domain,kind,title,metadata) values($1,$2,'performance','workout','Bad',$3)",
        [
          w,
          n,
          JSON.stringify({
            sets: [{ exercise: "Row", reps: -2, weight: 20, unit: "kg" }],
          }),
        ],
      ),
    ).rejects.toThrow(/Invalid workout/);
  });
  it("rejects malformed metadata even on non-workout records", async () => {
    await as(n);
    await expect(
      db.query(
        "insert into records(workspace_id,owner_id,domain,kind,title,metadata) values($1,$2,'studio','campaign','Bad payload',$3)",
        [w, n, JSON.stringify({ sets: "not an array" })],
      ),
    ).rejects.toThrow(/sets required/);
  });
  it("enforces durable AI request quota", async () => {
    await as(n);
    for (let i = 0; i < 30; i++)
      expect(
        (await db.query<{ ok: boolean }>("select consume_ai_request() as ok"))
          .rows[0].ok,
      ).toBe(true);
    expect(
      (await db.query<{ ok: boolean }>("select consume_ai_request() as ok"))
        .rows[0].ok,
    ).toBe(false);
  });
  it("revoked member loses reads, inserts, and AI quota access", async () => {
    await db.exec("reset role");
    await db.query("update memberships set active=false where user_id=$1", [k]);
    await as(k);
    expect((await db.query("select * from records")).rows).toHaveLength(0);
    await expect(add("After revocation")).rejects.toThrow(/row-level security/);
    expect(
      (await db.query<{ ok: boolean }>("select consume_ai_request() as ok"))
        .rows[0].ok,
    ).toBe(false);
  });
});

describe("training document privacy and revisions", () => {
  const id = "00000000-0000-4000-8000-000000000088";
  it("only the owner can read training even inside the same workspace", async () => {
    await as(n);
    await db.query(
      "insert into training_documents(id,owner_id,workspace_id,payload) values($1,$2,$3,$4)",
      [id, n, w, JSON.stringify({ kind: "program", name: "Private training" })],
    );
    await as(k);
    expect(
      (await db.query("select * from training_documents")).rows,
    ).toHaveLength(0);
    await expect(
      db.query(
        "insert into training_documents(id,owner_id,workspace_id,payload) values(gen_random_uuid(),$1,$2,$3)",
        [n, w, JSON.stringify({ kind: "prep" })],
      ),
    ).rejects.toThrow();
  });
  it("rejects other-owner updates and stale revisions", async () => {
    await as(k);
    expect(
      (
        await db.query(
          "update training_documents set revision=2 where id=$1 returning id",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
    await as(n);
    await db.query(
      "update training_documents set revision=2 where id=$1 and revision=1",
      [id],
    );
    expect(
      (
        await db.query(
          "update training_documents set revision=2 where id=$1 and revision=1 returning id",
          [id],
        )
      ).rows,
    ).toHaveLength(0);
    await expect(
      db.query("update training_documents set revision=2 where id=$1", [id]),
    ).rejects.toThrow();
  });
  it("does not allow transferring owner or workspace", async () => {
    await as(n);
    await expect(
      db.query(
        "update training_documents set revision=3,owner_id=$1 where id=$2",
        [k, id],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "update training_documents set revision=3,workspace_id=$1 where id=$2",
        [w2, id],
      ),
    ).rejects.toThrow();
  });
});

describe("private append-only protocol storage", () => {
  it("enforces owner isolation and immutable history in PostgreSQL", async () => {
    await db.exec("reset role");
    await db.exec(
      readFileSync("supabase/migrations/003_protocols.sql", "utf8"),
    );
    await as(n);
    const entity = "00000000-0000-4000-8000-000000000090";
    await db.query(
      `insert into health_events(id,entity_id,owner_id,workspace_id,revision,payload) values($1,$1,$2,$3,1,'{"kind":"protocol"}')`,
      [entity, n, w],
    );
    await as(k);
    expect((await db.query("select * from health_events")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(
        `insert into health_events(id,entity_id,owner_id,workspace_id,revision,payload) values(gen_random_uuid(),gen_random_uuid(),$1,$2,1,'{"kind":"lab"}')`,
        [n, w],
      ),
    ).rejects.toThrow();
    await as(n);
    await expect(
      db.exec(`update health_events set payload='{"kind":"lab"}'`),
    ).rejects.toThrow();
    await expect(db.exec("delete from health_events")).rejects.toThrow();
    await expect(
      db.query(
        `insert into health_events(id,entity_id,owner_id,workspace_id,revision,payload) values(gen_random_uuid(),$1,$2,$3,3,'{"kind":"protocol"}')`,
        [entity, n, w],
      ),
    ).rejects.toThrow();
    await db.query(
      `insert into health_events(id,entity_id,owner_id,workspace_id,revision,payload) values(gen_random_uuid(),$1,$2,$3,2,'{"kind":"protocol"}')`,
      [entity, n, w],
    );
    expect((await db.query("select * from health_events")).rows).toHaveLength(
      2,
    );
  });
});

describe("private report storage policies", () => {
  it("blocks another member from listing or writing report paths", async () => {
    await db.exec("reset role");
    await db.exec(
      `create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$ select (string_to_array($1,'/'))[1:array_length(string_to_array($1,'/'),1)-1] $$;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;`,
    );
    await db.exec(
      readFileSync("supabase/migrations/004_health_reports.sql", "utf8"),
    );
    await as(n);
    await db.query(
      "insert into storage.objects(bucket_id,name) values('health-reports',$1)",
      [n + "/example.pdf"],
    );
    await as(k);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values('health-reports',$1)",
        [n + "/other.pdf"],
      ),
    ).rejects.toThrow();
    await as(n);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      1,
    );
  });
});

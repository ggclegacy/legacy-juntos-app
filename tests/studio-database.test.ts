import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect, describe } from "vitest";
import { readFileSync } from "node:fs";
const n = "00000000-0000-4000-8000-000000000001",
  k = "00000000-0000-4000-8000-000000000002",
  w = "00000000-0000-4000-8000-000000000003",
  o = "00000000-0000-4000-8000-000000000004",
  w2 = "00000000-0000-4000-8000-000000000005";
let db: PGlite,
  privateId: string,
  sharedId: string,
  campaignId: string,
  versionId: string,
  jobId: string;
async function as(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function add(
  kind: string,
  title: string,
  visibility = "private",
  brand: string | null = null,
  campaign: string | null = null,
) {
  return (
    await db.query<{ id: string }>(
      "insert into studio_entries(workspace_id,owner_id,kind,title,visibility,brand_id,campaign_id) values($1,auth.uid(),$2,$3,$4,$5,$6) returning id",
      [w, kind, title, visibility, brand, campaign],
    )
  ).rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    "create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert on storage.objects to authenticated;",
  );
  await db.exec(readFileSync("supabase/migrations/001_foundation.sql", "utf8"));
  await db.exec(readFileSync("supabase/migrations/20260914050000_studio.sql", "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [n, k, o]);
  await db.query("insert into workspaces values($1,'Juntos'),($2,'Other')", [
    w,
    w2,
  ]);
  await db.query(
    "insert into memberships(workspace_id,user_id,display_name) values($1,$2,'Neil'),($1,$3,'Kamilla'),($4,$5,'Other')",
    [w, n, k, w2, o],
  );
  await as(n);
  privateId = await add("brand", "Private brand");
  sharedId = await add("brand", "Shared brand", "shared");
  campaignId = await add("campaign", "Shared campaign", "shared", sharedId);
}, 90000);
afterAll(async () => {
  await db.close();
});
describe("Studio PostgreSQL RLS, relationships and immutable provenance", () => {
  it("hides personal records from the partner and all records from outsiders", async () => {
    await as(k);
    expect(
      (await db.query("select * from studio_entries where id=$1", [privateId]))
        .rows,
    ).toHaveLength(0);
    expect((await db.query("select * from studio_entries")).rows).toHaveLength(
      2,
    );
    await as(o);
    expect((await db.query("select * from studio_entries")).rows).toHaveLength(
      0,
    );
  });
  it("rejects spoofed ownership and cross-workspace rows", async () => {
    await as(k);
    await expect(
      db.query(
        "insert into studio_entries(workspace_id,owner_id,kind,title) values($1,$2,'idea','Spoof')",
        [w, n],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into studio_entries(workspace_id,owner_id,kind,title) values($1,$2,'idea','Outside')",
        [w2, k],
      ),
    ).rejects.toThrow();
  });
  it("does not let a partner edit shared content", async () => {
    await as(k);
    expect(
      (
        await db.query(
          "update studio_entries set title='Hijacked' where id=$1 returning id",
          [sharedId],
        )
      ).rows,
    ).toHaveLength(0);
  });
  it("rejects broadening or changing links and rejects private-to-shared relationships", async () => {
    await as(n);
    await expect(
      db.query("update studio_entries set visibility='shared' where id=$1", [
        privateId,
      ]),
    ).rejects.toThrow();
    await expect(
      add("campaign", "Leak", "shared", privateId),
    ).rejects.toThrow();
    await expect(
      add("asset", "Wrong campaign", "private", null, privateId),
    ).rejects.toThrow();
  });
  it("allows private content under a shared campaign, but not the reverse", async () => {
    await as(k);
    expect(
      await add("content", "My draft", "private", sharedId, campaignId),
    ).toBeTruthy();
    await expect(
      add(
        "campaign",
        "Cannot link partner private brand",
        "private",
        privateId,
      ),
    ).rejects.toThrow();
  });
  it("requires private likeness references and explicit health extract consent at DB layer", async () => {
    await as(n);
    await expect(
      db.query(
        "insert into studio_entries(workspace_id,owner_id,kind,title,visibility,details) values($1,$2,'reference','Face','shared','{\"reference_type\":\"person\"}')",
        [w, n],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into studio_entries(workspace_id,owner_id,kind,title,details) values($1,$2,'idea','Prep','{\"source_kind\":\"performance_extract\"}')",
        [w, n],
      ),
    ).rejects.toThrow();
  });
  it("requires assignees to be members of the audience", async () => {
    await as(n);
    await expect(
      db.query("update studio_entries set details=$1 where id=$2", [
        JSON.stringify({ assignees: [k] }),
        privateId,
      ]),
    ).rejects.toThrow();
  });
  it("allows version-specific partner reviews and prevents forged authors", async () => {
    await as(n);
    const content = await add(
      "content",
      "Review me",
      "shared",
      sharedId,
      campaignId,
    );
    versionId = (
      await db.query<{ id: string }>(
        "insert into studio_versions(entry_id,text_content,mime_type,provenance) values($1,'Draft words','text/plain','uploaded') returning id",
        [content],
      )
    ).rows[0].id;
    await as(k);
    expect(
      (
        await db.query(
          "insert into studio_reviews(entry_id,version_id,decision,body) values($1,$2,'approved','Looks good') returning id",
          [content, versionId],
        )
      ).rows,
    ).toHaveLength(1);
    await expect(
      db.query(
        "insert into studio_reviews(entry_id,author_id,decision,body) values($1,$2,'approved','Forged')",
        [content, n],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into studio_reviews(entry_id,version_id,decision,body) values($1,$2,'approved','Wrong version')",
        [sharedId, versionId],
      ),
    ).rejects.toThrow();
  });
  it("prevents client-forged generated provenance and version mutation", async () => {
    await as(n);
    const a = await add("asset", "Original");
    await expect(
      db.query(
        "insert into studio_versions(entry_id,text_content,mime_type,provenance) values($1,'Fake','text/plain','generated')",
        [a],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "update studio_versions set text_content='Changed' where id=$1",
        [versionId],
      ),
    ).rejects.toThrow();
  });
  it("binds private media paths to the exact version and checks bucket RLS", async () => {
    await as(n);
    const a = await add("asset", "Private media"),
      v = "00000000-0000-4000-8000-000000000009",
      path = `${w}/${n}/${a}/${v}`;
    await expect(
      db.query(
        "insert into studio_versions(id,entry_id,object_key,mime_type,provenance) values($1,$2,'wrong','image/png','uploaded')",
        [v, a],
      ),
    ).rejects.toThrow();
    await db.query(
      "insert into studio_versions(id,entry_id,object_key,mime_type,provenance) values($1,$2,$3,'image/png','uploaded')",
      [v, a, path],
    );
    await db.query(
      "insert into storage.objects(bucket_id,name) values('studio-media',$1)",
      [path],
    );
    await as(k);
    expect((await db.query("select * from storage.objects")).rows).toHaveLength(
      0,
    );
    await expect(
      db.query(
        "insert into storage.objects(bucket_id,name) values('studio-media',$1)",
        [path],
      ),
    ).rejects.toThrow();
  });
  it("queues authorized requests but cannot forge completion or claim worker jobs", async () => {
    await as(n);
    const a = await add("asset", "Job asset");
    const req = JSON.stringify({ entry_id: a, provider_consent: true });
    jobId = (
      await db.query<{ id: string }>(
        "insert into studio_jobs(entry_id,request,provider,model) values($1,$2,'openai','test') returning id",
        [a, req],
      )
    ).rows[0].id;
    await expect(
      db.query("update studio_jobs set state='succeeded' where id=$1", [jobId]),
    ).rejects.toThrow();
    await expect(
      db.query("select * from studio_claim_job()"),
    ).rejects.toThrow();
    await as(k);
    expect((await db.query("select * from studio_jobs")).rows).toHaveLength(0);
  });
  it("leases a job once and quarantines expired submissions without receipts", async () => {
    await db.exec("reset role;set role service_role");
    expect(
      (await db.query("select * from studio_claim_job()")).rows,
    ).toHaveLength(1);
    expect(
      (await db.query("select * from studio_claim_job()")).rows,
    ).toHaveLength(0);
    await db.query(
      "update studio_jobs set lease_until=now()-interval '1 minute' where id=$1",
      [jobId],
    );
    expect(
      (await db.query("select * from studio_claim_job()")).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query<{ state: string }>(
          "select state from studio_jobs where id=$1",
          [jobId],
        )
      ).rows[0].state,
    ).toBe("needs_attention");
  });
  it("preserves receipt and resumes polling when a worker lease expires", async () => {
    await db.query(
      "update studio_jobs set state='running',provider_task_id='receipt',lease_until=now()-interval '1 minute' where id=$1",
      [jobId],
    );
    const rows = (
      await db.query<{ provider_task_id: string; attempts: number }>(
        "select * from studio_claim_job()",
      )
    ).rows;
    expect(rows[0].provider_task_id).toBe("receipt");
    expect(rows[0].attempts).toBe(1);
  });
  it("allows manual metrics only and no fabricated social connection/publication", async () => {
    await as(n);
    await db.query(
      "insert into studio_metrics(entry_id,platform,metric,value,period_start,period_end) values($1,'instagram','views',42,'2026-09-01','2026-09-13')",
      [sharedId],
    );
    await expect(
      db.query(
        "insert into studio_metrics(entry_id,platform,metric,value,period_start,period_end,source) values($1,'instagram','views',42,'2026-09-01','2026-09-13','api')",
        [sharedId],
      ),
    ).rejects.toThrow();
    await expect(
      db.query(
        "insert into studio_social_connections(entry_id,platform,account_label,external_account_id) values($1,'instagram','Fake','1')",
        [sharedId],
      ),
    ).rejects.toThrow();
  });
  it("revoked membership immediately loses entry, media and review access", async () => {
    await db.exec("reset role");
    await db.query("update memberships set active=false where user_id=$1", [k]);
    await as(k);
    expect((await db.query("select * from studio_entries")).rows).toHaveLength(
      0,
    );
    expect((await db.query("select * from studio_reviews")).rows).toHaveLength(
      0,
    );
  });
});

import { PGlite } from "@electric-sql/pglite";
import { beforeAll, afterAll, it, expect } from "vitest";
import { readFileSync } from "node:fs";
let db: PGlite;
const n = "00000000-0000-4000-8000-000000000001",
  k = "00000000-0000-4000-8000-000000000002",
  w = "00000000-0000-4000-8000-000000000003",
  o = "00000000-0000-4000-8000-000000000004",
  w2 = "00000000-0000-4000-8000-000000000005";
let privateId: string,
  sharedId: string,
  conversationId: string,
  privateTurn: string;
async function as(id: string) {
  await db.exec("reset role");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec("set role authenticated");
}
async function teach(
  title: string,
  visibility = "private",
  recipient: string | null = null,
) {
  return (
    await db.query<{ id: string }>(
      "insert into apollo_memories(workspace_id,owner_id,title,content,category,visibility,recipient_id) values($1,auth.uid(),$2,'A campaign workflow','workflow',$3,$4) returning id",
      [w, title, visibility, recipient],
    )
  ).rows[0].id;
}
beforeAll(async () => {
  db = new PGlite();
  await db.exec(
    `create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`,
  );
  for (const file of [
    "001_foundation.sql",
    "002_training.sql",
    "003_protocols.sql",
    "005_nutrition.sql",
    "006_apollo_memory.sql",
    "007_apollo_intelligence.sql",
  ])
    await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
  await db.query("insert into auth.users values($1),($2),($3)", [n, k, o]);
  await db.query(
    "insert into workspaces(id,name) values($1,'Juntos'),($2,'Other')",
    [w, w2],
  );
  await db.query(
    "insert into memberships(workspace_id,user_id,display_name) values($1,$2,'Neil'),($1,$3,'Kamilla'),($4,$5,'Other')",
    [w, n, k, w2, o],
  );
  await as(n);
  privateId = await teach("Private campaign");
  sharedId = await teach("Shared campaign", "shared");
  await teach("Named campaign", "recipient", k);
}, 60000);
afterAll(async () => {
  await db.close();
});
it("isolates private memory but permits explicit shared/named access", async () => {
  await as(n);
  expect((await db.query("select * from apollo_memories")).rows).toHaveLength(
    3,
  );
  await as(k);
  expect((await db.query("select * from apollo_memories")).rows).toHaveLength(
    2,
  );
  expect(
    (await db.query("select * from apollo_memory_versions")).rows,
  ).toHaveLength(0);
  await as(o);
  expect((await db.query("select * from apollo_memories")).rows).toHaveLength(
    0,
  );
  await db.exec("reset role;set role anon");
  await expect(db.query("select * from apollo_memories")).rejects.toThrow(
    /permission denied/,
  );
});
it("prevents owner spoofing, foreign recipients, and edits to partner memories", async () => {
  await as(k);
  expect(
    (
      await db.query(
        "update apollo_memories set content='Tampered',revision=2 where id=$1 returning id",
        [sharedId],
      )
    ).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into apollo_memories(workspace_id,owner_id,title,content,category) values($1,$2,'Spoof','content','fact')",
      [w, n],
    ),
  ).rejects.toThrow(/row-level security/);
  await expect(teach("Outside", "recipient", o)).rejects.toThrow();
  await as(n);
  await expect(
    db.query("update apollo_memories set owner_id=$1,revision=2 where id=$2", [
      k,
      privateId,
    ]),
  ).rejects.toThrow(/immutable/);
});
it("recall and direct source lookup exclude private and named items from Juntos", async () => {
  await as(n);
  const shared = (
    await db.query<{ title: string }>(
      "select * from recall_apollo('campaign','shared',array['memory'],12)",
    )
  ).rows;
  expect(shared.map((x) => x.title)).toEqual(["Shared campaign"]);
  const personal = (
    await db.query(
      "select * from recall_apollo('campaign','private',array['memory'],12)",
    )
  ).rows;
  expect(personal).toHaveLength(3);
  await as(k);
  expect(
    (
      await db.query(
        "select * from recall_apollo('campaign','private',array['memory'],12)",
      )
    ).rows,
  ).toHaveLength(2);
  await as(o);
  expect(
    (
      await db.query(
        "select * from recall_apollo('campaign','private',array['memory'],12)",
      )
    ).rows,
  ).toHaveLength(0);
});
it("correction creates owner-only history, rejects stale writes and invalidates dependencies", async () => {
  await as(n);
  await db.query(
    "update apollo_memories set content='New direction',revision=2 where id=$1",
    [privateId],
  );
  expect(
    (
      await db.query(
        "select * from apollo_memory_versions where memory_id=$1",
        [privateId],
      )
    ).rows,
  ).toHaveLength(2);
  await expect(
    db.query("update apollo_memories set revision=2 where id=$1", [privateId]),
  ).rejects.toThrow(/revision conflict/);
  const dep = JSON.stringify([{ kind: "memory", id: privateId, version: "1" }]);
  expect(
    (await db.query("select * from check_apollo_sources('private',$1)", [dep]))
      .rows,
  ).toHaveLength(0);
  await db.query(
    "update apollo_memories set visibility='shared',revision=3 where id=$1",
    [privateId],
  );
  await as(k);
  expect(
    (
      await db.query(
        "select * from apollo_memory_versions where memory_id=$1",
        [privateId],
      )
    ).rows,
  ).toHaveLength(0);
  await as(n);
  await db.query(
    "update apollo_memories set visibility='private',revision=4 where id=$1",
    [privateId],
  );
  await as(k);
  expect(
    (await db.query("select * from apollo_memories where id=$1", [privateId]))
      .rows,
  ).toHaveLength(0);
});
it("retiring suppresses recall; deleting removes revision history", async () => {
  await as(n);
  await db.query(
    "update apollo_memories set status='archived',revision=5 where id=$1",
    [privateId],
  );
  expect(
    (
      await db.query(
        "select * from apollo_sources('private',array['memory']) where id=$1",
        [privateId],
      )
    ).rows,
  ).toHaveLength(0);
  await db.query("delete from apollo_memories where id=$1", [privateId]);
  await db.exec("reset role");
  expect(
    (
      await db.query(
        "select * from apollo_memory_versions where memory_id=$1",
        [privateId],
      )
    ).rows,
  ).toHaveLength(0);
});
it("persists private transcripts with atomic revision and prohibits unauthorized append", async () => {
  await as(n);
  conversationId = (
    await db.query<{ id: string }>(
      "insert into apollo_conversations(workspace_id,owner_id,title,context) values($1,$2,'My campaign','private') returning id",
      [w, n],
    )
  ).rows[0].id;
  privateTurn = (
    await db.query<{ id: string }>(
      "select append_apollo_turn($1,0,'Private campaign question','Synthetic answer','[]') as id",
      [conversationId],
    )
  ).rows[0].id;
  expect((await db.query("select * from apollo_turns")).rows).toHaveLength(1);
  await expect(
    db.query("select append_apollo_turn($1,0,'Stale','Answer','[]')", [
      conversationId,
    ]),
  ).rejects.toThrow(/changed/);
  await expect(
    db.query("update apollo_conversations set context='shared'"),
  ).rejects.toThrow(/permission denied/);
  await as(k);
  expect((await db.query("select * from apollo_turns")).rows).toHaveLength(0);
  await expect(
    db.query("select append_apollo_turn($1,1,'Spoof','Answer','[]')", [
      conversationId,
    ]),
  ).rejects.toThrow(/changed/);
});
it("never recalls private conversation in Juntos, and validates timestamp dependencies", async () => {
  await as(n);
  expect(
    (
      await db.query(
        "select * from recall_apollo('campaign','shared',array['conversation'],12)",
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query(
        "select * from recall_apollo('campaign','private',array['conversation'],12)",
      )
    ).rows,
  ).toHaveLength(1);
  const version = (
    await db.query<{ v: string }>(
      "select to_jsonb(created_at)#>>'{}' as v from apollo_turns where id=$1",
      [privateTurn],
    )
  ).rows[0].v;
  expect(
    (
      await db.query("select * from check_apollo_sources('private',$1)", [
        JSON.stringify([{ kind: "conversation", id: privateTurn, version }]),
      ])
    ).rows,
  ).toHaveLength(1);
  await db.query("delete from apollo_conversations where id=$1", [
    conversationId,
  ]);
  expect((await db.query("select * from apollo_turns")).rows).toHaveLength(0);
});
it("searches bilingual teachings and omits superseded nutrition records", async () => {
  await as(n);
  await teach("Recuperação e treino de pernas");
  expect(
    (
      await db.query(
        "select * from recall_apollo('treino','private',array['memory'],12)",
      )
    ).rows.length,
  ).toBeGreaterThan(0);
  const id = "00000000-0000-4000-8000-000000000099";
  await db.query(
    'insert into nutrition_events(id,entity_id,owner_id,workspace_id,revision,payload) values($1,$1,$2,$3,1,\'{"kind":"food","name":"OldApple"}\')',
    [id, n, w],
  );
  await db.query(
    'insert into nutrition_events(id,entity_id,owner_id,workspace_id,revision,payload) values(gen_random_uuid(),$1,$2,$3,2,\'{"kind":"food","name":"NewPear"}\')',
    [id, n, w],
  );
  expect(
    (
      await db.query(
        "select * from recall_apollo('OldApple','private',array['nutrition'],12)",
      )
    ).rows,
  ).toHaveLength(0);
  expect(
    (
      await db.query(
        "select * from recall_apollo('NewPear','private',array['nutrition'],12)",
      )
    ).rows,
  ).toHaveLength(1);
  expect(
    (
      await db.query(
        "select * from recall_apollo('NewPear','shared',array['nutrition'],12)",
      )
    ).rows,
  ).toHaveLength(0);
  await as(k);
  expect(
    (
      await db.query(
        "select * from recall_apollo('NewPear','private',array['nutrition'],12)",
      )
    ).rows,
  ).toHaveLength(0);
});
it("revoked members lose memory and recall", async () => {
  await db.exec("reset role");
  await db.query("update memberships set active=false where user_id=$1", [k]);
  await as(k);
  expect(
    (
      await db.query(
        "select * from recall_apollo('campaign','private',array['memory'],12)",
      )
    ).rows,
  ).toHaveLength(0);
  await expect(teach("Revoked")).rejects.toThrow(/row-level security/);
});

const vector = Array.from({ length: 512 }, (_, i) => (i === 0 ? 1 : 0));
const embeddingModel = "text-embedding-3-small:512:source-v1";
async function indexMemory(id: string, context = "private") {
  return db.query(
    "insert into apollo_embeddings(owner_id,workspace_id,context,kind,source_id,source_version,model,embedding) select auth.uid(),$1,$2,'memory',id,revision::text,$4,$5 from apollo_memories where id=$3",
    [w, context, id, embeddingModel, vector],
  );
}
it("recalls paraphrases using a synthetic vector while keeping audience indexes separate", async () => {
  await as(n);
  const id = await teach("Restoring energy after hard sessions");
  await indexMemory(id);
  const found = await db.query<{ id: string }>(
    "select id from hybrid_recall_apollo('How should I recover?', 'private',array['memory'],$1,$2)",
    [vector, embeddingModel],
  );
  expect(found.rows.map((r) => r.id)).toContain(id);
  expect(
    (
      await db.query(
        "select * from hybrid_recall_apollo('How should I recover?','shared',array['memory'],$1,$2)",
        [vector, embeddingModel],
      )
    ).rows.map((r) => (r as { id: string }).id),
  ).not.toContain(id);
  await as(k);
  expect(
    (await db.query("select * from apollo_embeddings where source_id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  await expect(indexMemory(id, "shared")).resolves.toBeDefined(); // RLS yields no source rows.
  await as(n);
  await expect(indexMemory(id, "shared")).rejects.toThrow(
    /Source changed or unavailable/,
  );
});
it("purges both users' derived vectors when a shared teaching changes", async () => {
  await as(n);
  const id = await teach("Joint launch direction", "shared");
  await indexMemory(id, "shared");
  await as(k);
  await indexMemory(id, "shared");
  await as(n);
  await db.query(
    "update apollo_memories set content='Updated direction',revision=revision+1 where id=$1",
    [id],
  );
  expect(
    (await db.query("select * from apollo_embeddings where source_id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  await as(k);
  expect(
    (await db.query("select * from apollo_embeddings where source_id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      "insert into apollo_embeddings(owner_id,workspace_id,context,kind,source_id,source_version,model,embedding) values(auth.uid(),$1,'shared','memory',$2,'1',$3,$4)",
      [w, id, embeddingModel, vector],
    ),
  ).rejects.toThrow(/Source changed/);
});
it("retrieves from a synthetic archive and removes deleted vectors", async () => {
  await as(n);
  for (let i = 0; i < 36; i++) await teach(`Monthly archive ${i}`);
  const id = await teach("An archived decision about next season");
  await indexMemory(id);
  const results = await db.query<{ id: string }>(
    "select id from hybrid_recall_apollo('future season decision','private',array['memory'],$1,$2)",
    [vector, embeddingModel],
  );
  expect(results.rows.map((r) => r.id)).toContain(id);
  await db.query("delete from apollo_memories where id=$1", [id]);
  expect(
    (await db.query("select * from apollo_embeddings where source_id=$1", [id]))
      .rows,
  ).toHaveLength(0);
  const status = await db.query<{ total: number; indexed: number }>(
    "select * from apollo_index_status('private',array['memory'],$1)",
    [embeddingModel],
  );
  expect(Number(status.rows[0].total)).toBeGreaterThan(36);
});
it("validates persistent conversation connections at the data boundary", async () => {
  await as(n);
  const record = (
    await db.query<{ id: string }>(
      "insert into records(workspace_id,owner_id,domain,kind,title) values($1,auth.uid(),'business','project','Launch') returning id",
      [w],
    )
  ).rows[0].id;
  await db.query(
    "insert into apollo_conversations(workspace_id,owner_id,title,context,record_ids) values($1,auth.uid(),'My launch','private',$2)",
    [w, [record]],
  );
  await expect(
    db.query(
      "insert into apollo_conversations(workspace_id,owner_id,title,context,record_ids) values($1,auth.uid(),'Shared launch','shared',$2)",
      [w, [record]],
    ),
  ).rejects.toThrow(/unavailable/);
  await as(k);
  await expect(
    db.query(
      "insert into apollo_conversations(workspace_id,owner_id,title,context,record_ids) values($1,auth.uid(),'Other launch','private',$2)",
      [w, [record]],
    ),
  ).rejects.toThrow(/unavailable/);
});

import { createClient } from "@supabase/supabase-js";
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function actor(request: Request) {
  const token = request.headers
    .get("authorization")
    ?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError(401, "Sign in to continue.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL,
    key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key)
    throw new ApiError(503, "Account connection is not configured.");
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user)
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  const expectedUser = request.headers.get("x-expected-user");
  if (expectedUser && expectedUser !== user.id)
    throw new ApiError(
      401,
      "Your account changed. Return to your training space before retrying.",
    );
  const { data: membership, error: memberError } = await db
    .from("memberships")
    .select("*")
    .eq("user_id", user.id)
    .eq("active", true)
    .single();
  if (memberError || !membership)
    throw new ApiError(
      403,
      "Your account needs an invitation to this workspace.",
    );
  return { db, user, membership };
}
export async function body(request: Request, limit = 32000) {
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.byteLength;
    if (length > limit) {
      await reader.cancel();
      throw new ApiError(413, "This entry is too long.");
    }
    chunks.push(part.value);
  }
  const buffer = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const raw = new TextDecoder().decode(buffer);
  try {
    return JSON.parse(raw);
  } catch {
    throw new ApiError(400, "The request could not be read.");
  }
}
export function failure(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ApiError
          ? error.message
          : "Something went wrong. Your changes were not saved.",
    },
    {
      status: error instanceof ApiError ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}

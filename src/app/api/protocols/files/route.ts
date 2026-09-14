import { actor, body, failure, ApiError } from "@/lib/server";
import { z } from "zod";
const bucket = "health-reports";
const filename = z.string().regex(/^[a-f0-9-]{36}_[a-zA-Z0-9._-]{1,100}$/);
export async function GET(request: Request) {
  try {
    const { db, user } = await actor(request);
    const file = new URL(request.url).searchParams.get("file");
    if (file) {
      const parsed = filename.safeParse(file);
      if (!parsed.success) throw new ApiError(400, "Invalid report reference.");
      const { data, error } = await db.storage
        .from(bucket)
        .createSignedUrl(`${user.id}/${parsed.data}`, 60, { download: true });
      if (error) throw new ApiError(404, "Report unavailable.");
      return Response.json(
        { signedUrl: data.signedUrl },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
    const { data, error } = await db.storage
      .from(bucket)
      .list(user.id, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });
    if (error)
      throw new ApiError(
        503,
        "Private report storage is unavailable. Apply migration 004.",
      );
    return Response.json(
      { files: data.map((f) => ({ name: f.name, created_at: f.created_at })) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: Request) {
  try {
    const { db, user } = await actor(request);
    const input = z
      .object({
        name: z.string().min(1).max(200),
        type: z.enum(["application/pdf", "image/png", "image/jpeg"]),
        base64: z
          .string()
          .regex(/^[A-Za-z0-9+/]*={0,2}$/)
          .max(7000000),
      })
      .strict()
      .safeParse(await body(request, 7100000));
    if (!input.success)
      throw new ApiError(400, "Choose a PDF, PNG, or JPEG up to 5 MB.");
    const bytes = Buffer.from(input.data.base64, "base64");
    if (!bytes.length || bytes.length > 5 * 1024 * 1024)
      throw new ApiError(413, "Choose a report up to 5 MB.");
    const valid =
      input.data.type === "application/pdf"
        ? bytes.subarray(0, 5).toString() === "%PDF-"
        : input.data.type === "image/png"
          ? bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    if (!valid)
      throw new ApiError(
        400,
        "The report content does not match its file type.",
      );
    const ext =
      input.data.type === "application/pdf"
        ? "pdf"
        : input.data.type === "image/png"
          ? "png"
          : "jpg";
    const stem =
      input.data.name
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .slice(0, 70) || "report";
    const name = `${crypto.randomUUID()}_${stem}.${ext}`;
    const { error } = await db.storage
      .from(bucket)
      .upload(`${user.id}/${name}`, bytes, {
        contentType: input.data.type,
        upsert: false,
      });
    if (error)
      throw new ApiError(
        503,
        "Report was not saved. Check private storage configuration and retry.",
      );
    return Response.json(
      { file: name },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

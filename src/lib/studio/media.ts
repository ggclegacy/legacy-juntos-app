export const mediaTypes = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "audio/mpeg",
  "audio/wav",
  "application/pdf",
] as const;
export function sniffMedia(bytes: Uint8Array, mime: string) {
  const b = Buffer.from(bytes);
  if (b.length < 12) return false;
  if (mime === "image/png")
    return b
      .subarray(0, 8)
      .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (mime === "image/jpeg")
    return b[0] === 255 && b[1] === 216 && b[2] === 255;
  if (mime === "image/webp")
    return (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WEBP"
    );
  if (mime === "audio/wav")
    return (
      b.toString("ascii", 0, 4) === "RIFF" &&
      b.toString("ascii", 8, 12) === "WAVE"
    );
  if (mime === "audio/mpeg")
    return (
      b.toString("ascii", 0, 3) === "ID3" ||
      (b[0] === 255 && (b[1] & 224) === 224)
    );
  if (mime === "video/mp4") return b.toString("ascii", 4, 8) === "ftyp";
  return mime === "application/pdf" && b.toString("ascii", 0, 5) === "%PDF-";
}
export async function boundedBytes(response: Response, limit = 104857600) {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Missing media body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) {
      await reader.cancel();
      throw new Error("Media exceeds size limit");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

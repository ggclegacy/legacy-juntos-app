"use client";
import { useEffect, useRef, useState } from "react";
export function BarcodeScanner({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null),
    callback = useRef(onCode);
  useEffect(() => {
    callback.current = onCode;
  }, [onCode]);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    void import("@zxing/browser")
      .then(async ({ BrowserMultiFormatReader }) => {
        if (cancelled || !video.current) return;
        const reader = new BrowserMultiFormatReader();
        const controls = await reader.decodeFromConstraints(
          { video: { facingMode: "environment" }, audio: false },
          video.current,
          (result, _, control) => {
            if (result && !cancelled) {
              control.stop();
              callback.current(result.getText());
            }
          },
        );
        stop = () => controls.stop();
        if (cancelled) stop();
      })
      .catch(() => {
        if (!cancelled)
          setError(
            "Camera unavailable. Allow camera access or enter the barcode below.",
          );
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, []);
  return (
    <div className="nutrition-scanner">
      <video ref={video} muted playsInline aria-label="Barcode camera" />
      {error ? (
        <p role="alert">{error}</p>
      ) : (
        <p>
          Position the barcode inside the camera. You can also enter it below.
        </p>
      )}
    </div>
  );
}
export async function prepareImage(file: File): Promise<string> {
  if (file.size > 15 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 15 MB.");
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.width * image.height > 40000000)
      throw new Error("This photo is too large. Choose a smaller image.");
    const canvas = document.createElement("canvas");
    const factor = Math.min(1, 1024 / Math.max(image.width, image.height));
    canvas.width = Math.round(image.width * factor);
    canvas.height = Math.round(image.height * factor);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

"use client";
import { useEffect } from "react";

/** Progressive enhancement: resting CSS depth works on touch and without JS. */
export function useMaterialMotion() {
  useEffect(() => {
    const preference = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let frame = 0,
      active: HTMLElement | null = null;
    const reset = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      if (active) {
        active.style.removeProperty("--rx");
        active.style.removeProperty("--ry");
        active.style.removeProperty("--light-x");
        active.style.removeProperty("--light-y");
        active.removeAttribute("data-lit");
        active = null;
      }
    };
    const move = (event: PointerEvent) => {
      if (!preference.matches || event.pointerType === "touch") return;
      const card = (event.target as HTMLElement).closest<HTMLElement>(
        ".pathway, .dream, .brief, .business-actions button",
      );
      if (!card) {
        reset();
        return;
      }
      if (active !== card) {
        reset();
        active = card;
      }
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (!active) return;
        const box = active.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - box.left) / box.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - box.top) / box.height),
        );
        active.style.setProperty("--rx", `${(0.5 - y) * 5}deg`);
        active.style.setProperty("--ry", `${(x - 0.5) * 6}deg`);
        active.style.setProperty("--light-x", `${x * 100}%`);
        active.style.setProperty("--light-y", `${y * 100}%`);
        active.setAttribute("data-lit", "true");
        frame = 0;
      });
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", reset);
    window.addEventListener("blur", reset);
    preference.addEventListener("change", reset);
    return () => {
      reset();
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", reset);
      window.removeEventListener("blur", reset);
      preference.removeEventListener("change", reset);
    };
  }, []);
}

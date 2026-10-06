"use client";

// Full-screen image viewer for project galleries.
// Each image is shown whole (object-fit: contain) and never enlarged past its
// own pixel size, so small source photos stay sharp instead of being stretched.
// Keyboard: ← → to move, Esc to close. Clicking the dark backdrop closes it.

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export default function ImageLightbox({
  images,
  index,
  alt,
  onIndex,
  onClose,
}: {
  images: string[];
  index: number;
  alt: string;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const count = images.length;
  const prev = useCallback(() => onIndex((index - 1 + count) % count), [index, count, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % count), [index, count, onIndex]);
  // Pixel size per image, learnt as each one loads.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onClose, prev, next]);

  // Preload the neighbours so moving through the gallery is instant.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      const src = images[(i + count) % count];
      if (src) new window.Image().src = src;
    }
  }, [index, images, count]);

  const src = images[index];
  const natural = sizes[src] ?? null;
  const btn = "absolute top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center backdrop-blur-sm transition-colors";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — image ${index + 1} of ${count}`}
      className="fixed inset-0 z-[100] flex flex-col bg-black/[0.97]"
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 text-white/80 text-sm" onClick={(e) => e.stopPropagation()}>
        <span className="font-mono text-xs">
          {index + 1} / {count}
          {natural && <span className="text-white/45 ml-3">{natural.w}×{natural.h}px</span>}
        </span>
        <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" className="w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center">
          <X size={20} />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 sm:px-16">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={src}
          src={src}
          alt={`${alt} — image ${index + 1}`}
          onClick={(e) => e.stopPropagation()}
          onLoad={(e) => {
            const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
            setSizes((m) => (m[src] ? m : { ...m, [src]: { w, h } }));
          }}
          className="rounded-md shadow-2xl select-none"
          style={{
            objectFit: "contain",
            maxHeight: "100%",
            maxWidth: "100%",
            // Never upscale past the photo's own size — that's what makes small images look blurry.
            width: natural ? Math.min(natural.w, 1600) : undefined,
            height: "auto",
          }}
        />
        {count > 1 && (
          <>
            <button type="button" aria-label="Previous image" className={`${btn} left-3 sm:left-5`} onClick={(e) => { e.stopPropagation(); prev(); }}>
              <ChevronLeft size={22} />
            </button>
            <button type="button" aria-label="Next image" className={`${btn} right-3 sm:right-5`} onClick={(e) => { e.stopPropagation(); next(); }}>
              <ChevronRight size={22} />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex gap-2 overflow-x-auto px-4 sm:px-6 py-3 justify-start sm:justify-center" onClick={(e) => e.stopPropagation()}>
          {images.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => onIndex(i)}
              aria-label={`Show image ${i + 1}`}
              className="flex-none rounded overflow-hidden"
              style={{ width: 72, height: 48, border: i === index ? "2px solid var(--color-saffron)" : "1px solid rgba(255,255,255,0.2)", opacity: i === index ? 1 : 0.6 }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s} alt="" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

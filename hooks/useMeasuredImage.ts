"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContainerSize, NaturalSize } from "@/lib/zoom-crop";

export function useMeasuredImage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [container, setContainer] = useState<ContainerSize>({
    width: 0,
    height: 0,
  });
  const [natural, setNatural] = useState<NaturalSize>({ width: 0, height: 0 });

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      setNatural({ width: img.naturalWidth, height: img.naturalHeight });
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setContainer({ width: rect.width, height: rect.height });
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const ready =
    container.width > 0 &&
    container.height > 0 &&
    natural.width > 0 &&
    natural.height > 0;

  return { containerRef, container, natural, onImageLoad, ready };
}

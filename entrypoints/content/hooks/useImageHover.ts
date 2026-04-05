import { useState, useEffect, useRef } from "react";

export interface HoveredImage {
  element: HTMLImageElement;
  rect: DOMRect;
  src: string;
  alt: string;
}

export function useImageHover(buttonHoveredRef: React.MutableRefObject<boolean>) {
  const [hoveredImage, setHoveredImage] = useState<HoveredImage | null>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    function onEnter(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLImageElement)) return;
      // 改用 naturalWidth/naturalHeight，因为有些图片 CSS 缩放了
      if (target.naturalWidth < 60 || target.naturalHeight < 60) return; // 忽略小图标

      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      const rect = target.getBoundingClientRect();
      setHoveredImage({
        element: target,
        rect: rect,
        src: target.src,
        alt: target.alt,
      });
    }

    function onLeave(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!(target instanceof HTMLImageElement)) return;
      // 延迟 200ms 隐藏，检查按钮是否被悬停
      leaveTimer.current = setTimeout(() => {
        if (!buttonHoveredRef.current) {
          setHoveredImage(null);
        }
      }, 200);
    }

    // 监听 scroll/resize 时更新 rect
    function onScroll() {
      setHoveredImage((prev) =>
        prev
          ? { ...prev, rect: prev.element.getBoundingClientRect() }
          : null
      );
    }

    document.addEventListener("mouseover", onEnter, true);
    document.addEventListener("mouseout", onLeave, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      document.removeEventListener("mouseover", onEnter, true);
      document.removeEventListener("mouseout", onLeave, true);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
    };
  }, [buttonHoveredRef]);

  return hoveredImage;
}

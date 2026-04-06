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

      // 更严格的图片过滤
      if (isLikelyIcon(target)) return;

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

/**
 * 判断图片是否很可能是图标/装饰性小图
 */
function isLikelyIcon(img: HTMLImageElement): boolean {
  const { naturalWidth, naturalHeight, src, className, alt } = img;

  // 1. 尺寸过滤（更严格）
  if (naturalWidth < 100 || naturalHeight < 100) return true;

  // 2. 尺寸比例过滤（极端比例的图片很可能是装饰性的）
  const aspectRatio = naturalWidth / naturalHeight;
  if (aspectRatio > 10 || aspectRatio < 0.1) return true;

  // 3. URL/文件名过滤（常见图标/装饰图特征）
  const iconKeywords = [
    "icon", "logo", "avatar", "thumbnail", "thumb", "sprite",
    "loading", "spinner", "placeholder", "blank", "pixel",
    "favicon", "button", "btn", "arrow", "chevron",
    "check", "cross", "close", "menu", "hamburger",
    "-16", "-24", "-32", "-48", "-64", "@2x", "@3x",
    ".svg", "data:image/svg", "data:image/png;base64",
  ];
  const lowerSrc = src.toLowerCase();
  const lowerClass = className.toLowerCase();
  const lowerAlt = alt.toLowerCase();

  for (const keyword of iconKeywords) {
    if (lowerSrc.includes(keyword)) return true;
    if (lowerClass.includes(keyword)) return true;
    if (lowerAlt.includes(keyword)) return true;
  }

  // 4. CSS 类名过滤
  if (lowerClass.includes("icon") || lowerClass.includes("svg")) return true;

  return false;
}

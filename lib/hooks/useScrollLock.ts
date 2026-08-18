"use client";

import { useEffect, useRef } from "react";

/**
 * Robust scroll lock hook for modal dialogs and bottom sheets.
 * Prevents background scroll leakage, rubber-banding, and layout jump
 * across Desktop Chrome/Firefox/Safari and Mobile Android/iOS WebViews.
 */
export function useScrollLock(isLocked: boolean = true) {
  const scrollYRef = useRef<number>(0);

  useEffect(() => {
    if (!isLocked || typeof window === "undefined") return;

    scrollYRef.current = window.scrollY;

    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyPosition = document.body.style.position;
    const originalBodyTop = document.body.style.top;
    const originalBodyWidth = document.body.style.width;
    const originalBodyPaddingRight = document.body.style.paddingRight;
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;

    // Compensate scrollbar width to prevent layout shift on desktop
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.documentElement.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "contain";
    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.width = "100%";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.position = originalBodyPosition;
      document.body.style.top = originalBodyTop;
      document.body.style.width = originalBodyWidth;
      document.body.style.paddingRight = originalBodyPaddingRight;

      window.scrollTo({
        top: scrollYRef.current,
        behavior: "instant" as ScrollBehavior,
      });
    };
  }, [isLocked]);
}

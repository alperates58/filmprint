"use client";
import { useEffect } from "react";

/**
 * Ensures the window scroll position is reset to top (0, 0) on page load.
 * Fixes issues where previous modal unmounts or browser restoration scrolls
 * the user into the middle of the detail page.
 */
export function ScrollToTop() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: "instant" as ScrollBehavior,
      });
    }
  }, []);

  return null;
}

"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseModalHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef?: React.RefObject<HTMLElement | null>;
}

/**
 * Handles modal history pushState, popstate (Android/browser back button),
 * Escape key dismiss, and focus restoration without leaving zombie history entries.
 */
export function useModalHistory({ isOpen, onClose, modalRef }: UseModalHistoryOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const isClosingViaBackRef = useRef<boolean>(false);

  // Focus saving & restoration
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined") {
        previousActiveElement.current = document.activeElement as HTMLElement;
      }
    } else {
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === "function") {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen]);

  // History & Keyboard handling
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    isClosingViaBackRef.current = false;

    // Push a transient state for back button interception
    window.history.pushState({ modalOpen: true }, "");

    const handlePopState = (e: PopStateEvent) => {
      isClosingViaBackRef.current = true;
      onClose();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeyDown);

      // Clean up the modal history entry if closed via UI (X button / backdrop click / ESC)
      // and NOT via the browser back button
      if (!isClosingViaBackRef.current && window.history.state?.modalOpen) {
        window.history.back();
      }
    };
  }, [isOpen, onClose]);
}

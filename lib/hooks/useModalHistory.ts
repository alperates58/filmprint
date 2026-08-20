"use client";

import { useEffect, useRef, useCallback } from "react";

interface UseModalHistoryOptions {
  isOpen: boolean;
  onClose: () => void;
  modalRef?: React.RefObject<HTMLElement | null>;
  isNavigatingRef?: React.RefObject<boolean>;
}

/**
 * Handles modal history pushState, popstate (Android/browser back button),
 * Escape key dismiss, and focus restoration without leaving zombie history entries.
 */
export function useModalHistory({ isOpen, onClose, modalRef, isNavigatingRef }: UseModalHistoryOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const isClosingViaBackRef = useRef<boolean>(false);
  const didPushStateRef = useRef<boolean>(false);
  const initialPathRef = useRef<string>("");

  // Focus saving & restoration
  useEffect(() => {
    if (isOpen) {
      if (typeof document !== "undefined") {
        previousActiveElement.current = document.activeElement as HTMLElement;
      }
      if (typeof window !== "undefined") {
        initialPathRef.current = window.location.pathname + window.location.search;
      }
    } else {
      if (isNavigatingRef?.current) return;

      const currentPath = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
      if (
        currentPath === initialPathRef.current &&
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === "function" &&
        document.body.contains(previousActiveElement.current)
      ) {
        previousActiveElement.current.focus();
      }
    }
  }, [isOpen, isNavigatingRef]);

  // History & Keyboard handling
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;

    isClosingViaBackRef.current = false;
    didPushStateRef.current = false;
    const initialPath = window.location.pathname + window.location.search;

    // Push a transient state for back button interception if not already pushed
    if (!window.history.state?.modalOpen) {
      window.history.pushState({ modalOpen: true }, "");
      didPushStateRef.current = true;
    }

    const handlePopState = () => {
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

      if (isNavigatingRef?.current) return;

      const currentPath = window.location.pathname + window.location.search;
      // Clean up the modal history entry if closed via UI on the same page
      // and NOT via navigation to a new route or the browser/Android back button
      if (
        currentPath === initialPath &&
        !isClosingViaBackRef.current &&
        didPushStateRef.current &&
        window.history.state?.modalOpen
      ) {
        window.history.back();
      }
    };
  }, [isOpen, onClose, isNavigatingRef]);
}

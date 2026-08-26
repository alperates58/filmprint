"use client";

import React, { useEffect, useState, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  isRouteEligibleForAds,
  isDeviceTargetEligible,
  isAudienceTargetEligible,
} from "@/lib/monetization/placements";
import { hasAdStorageConsent } from "@/lib/monetization/consent";
import { PublicMonetizationConfig, SafePlacementConfig } from "@/lib/monetization/types";
import { checkClientAuthAndEntitlement } from "@/lib/monetization/client-auth";

interface AdPlacementProps {
  slot: string;
  className?: string;
  previewMode?: boolean;
}

declare global {
  interface Window {
    adsbygoogle?: any[];
  }
}

export function AdPlacement({ slot, className = "", previewMode = false }: AdPlacementProps) {
  const pathname = usePathname();
  const [config, setConfig] = useState<PublicMonetizationConfig | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isAdFree, setIsAdFree] = useState<boolean>(false);
  const [adPushed, setAdPushed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect mobile viewport on client
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch or retrieve public monetization config & auth state
  useEffect(() => {
    fetch("/api/monetization/config")
      .then((res) => res.json())
      .then((data) => setConfig(data))
      .catch(() => {
        // Fallback
      });

    checkClientAuthAndEntitlement()
      .then((res) => {
        setIsAuthenticated(res.isAuthenticated);
        setIsAdFree(res.isAdFree);
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsAdFree(false);
      });
  }, []);

  const placement: SafePlacementConfig | undefined = config?.placements?.[slot];
  const isEffectivePreview = previewMode || Boolean(config?.adminPreviewMode);

  // If in Preview Mode, render placeholder without executing ads
  if (isEffectivePreview) {
    return (
      <div
        className={`w-full my-6 rounded-2xl border-2 border-dashed border-accent/40 bg-surface-1/80 p-6 flex flex-col items-center justify-center text-center select-none shadow-sm ${className}`}
        style={{ minHeight: "140px" }}
      >
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent/15 border border-accent/30 text-accent font-mono text-xs font-semibold uppercase tracking-wider mb-2">
          <span>📢</span>
          <span>REKLAM ALANI ÖNİZLEME (PREVIEW)</span>
        </div>
        <p className="text-sm font-display font-bold text-text-primary">
          {placement?.name || slot}
        </p>
        <p className="text-xs font-mono text-text-muted mt-1">
          Slot Key: <span className="text-text-secondary">{slot}</span> | Hedef:{" "}
          <span className="text-text-secondary">
            {placement?.deviceTarget === "MOBILE"
              ? "Mobil"
              : placement?.deviceTarget === "DESKTOP"
              ? "Masaüstü"
              : "Tüm Cihazlar"}
          </span>{" "}
          | Kitle:{" "}
          <span className="text-text-secondary">
            {placement?.audience === "ANONYMOUS_ONLY" ? "Yalnızca Anonim" : "Tüm Kullanıcılar"}
          </span>
        </p>
        {placement?.reportingDimensionId && (
          <p className="text-[11px] font-mono text-emerald-400 mt-1">
            Ad Unit ID: {placement.reportingDimensionId}
          </p>
        )}
      </div>
    );
  }

  // Live Gating Checks
  // Users with AD_FREE entitlement NEVER receive ads (AD_FREE invariant)
  if (isAdFree) {
    return null;
  }

  if (!config || !config.master || !config.adClientId || !placement || !placement.enabled) {
    return null;
  }

  // 1. Route Check
  if (!isRouteEligibleForAds(pathname)) {
    return null;
  }

  // 2. Audience Check (Anonymous-First policy)
  const isAuth = isAuthenticated === true;
  if (!isAudienceTargetEligible(placement.audience, isAuth)) {
    return null;
  }

  // 3. Device Check
  if (!isDeviceTargetEligible(placement.deviceTarget, isMobile)) {
    return null;
  }

  // 4. Consent Check
  const consentGranted = hasAdStorageConsent() || config.cmpConfigured;
  if (!consentGranted) {
    return null;
  }

  // 5. Must have assigned reporting dimension / ad unit
  if (!placement.reportingDimensionId) {
    return null;
  }

  // Safely trigger Google ad push on mount
  useEffect(() => {
    if (adPushed) return;
    try {
      if (typeof window !== "undefined") {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        setAdPushed(true);
      }
    } catch (e) {
      console.warn("[AdPlacement] adsbygoogle push error:", e);
    }
  }, [adPushed]);

  return (
    <div
      ref={containerRef}
      className={`w-full my-6 flex flex-col items-center justify-center overflow-hidden transition-all ${className}`}
      style={{ minHeight: "120px" }}
    >
      <span className="text-[10px] uppercase font-mono tracking-widest text-text-muted/60 mb-1.5 block text-center select-none">
        Reklam
      </span>
      <div className="w-full max-w-4xl mx-auto flex justify-center bg-surface-1/40 rounded-xl overflow-hidden border border-border/40 p-2">
        <ins
          className="adsbygoogle"
          style={{ display: "block", minWidth: "280px", minHeight: "90px" }}
          data-ad-client={config.adClientId}
          data-ad-slot={placement.reportingDimensionId}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </div>
  );
}

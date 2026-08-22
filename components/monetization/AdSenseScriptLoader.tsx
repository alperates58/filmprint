"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Script from "next/script";
import { isRouteEligibleForAds } from "@/lib/monetization/placements";
import { hasAdStorageConsent } from "@/lib/monetization/consent";
import { PublicMonetizationConfig } from "@/lib/monetization/types";
import { checkIsAuthenticatedClient } from "@/lib/monetization/client-auth";

let cachedClientConfig: PublicMonetizationConfig | null = null;
let lastConfigFetchTime = 0;

export function AdSenseScriptLoader() {
  const pathname = usePathname();
  const [config, setConfig] = useState<PublicMonetizationConfig | null>(cachedClientConfig);
  const [canLoadScript, setCanLoadScript] = useState(false);

  // Fetch public config on mount or if stale (>60s)
  useEffect(() => {
    const now = Date.now();
    if (cachedClientConfig && now - lastConfigFetchTime < 60000) {
      setConfig(cachedClientConfig);
      return;
    }

    fetch("/api/monetization/config")
      .then((res) => res.json())
      .then((data) => {
        cachedClientConfig = data;
        lastConfigFetchTime = Date.now();
        setConfig(data);
      })
      .catch(() => {
        // Fallback: no ads
      });
  }, []);

  // Evaluate script loading eligibility on route change
  useEffect(() => {
    let isMounted = true;

    async function evaluateEligibility() {
      if (!config || !config.master || !config.adClientId) {
        if (isMounted) setCanLoadScript(false);
        return;
      }

      // Policy Guard 1: Hard excluded routes never load script
      if (!isRouteEligibleForAds(pathname)) {
        if (isMounted) setCanLoadScript(false);
        return;
      }

      // Policy Guard 2: Logged-in users receive no ads by default (Anonymous-First)
      const isAuth = await checkIsAuthenticatedClient();
      if (isAuth) {
        if (isMounted) setCanLoadScript(false);
        return;
      }

      // Policy Guard 3: Consent check (ad_storage granted or CMP ready)
      if (config.adminPreviewMode) {
        if (isMounted) setCanLoadScript(false);
        return;
      }

      const consentGranted = hasAdStorageConsent() || config.cmpConfigured;
      if (isMounted) setCanLoadScript(consentGranted);
    }

    evaluateEligibility();

    return () => {
      isMounted = false;
    };
  }, [pathname, config]);

  if (!canLoadScript || !config?.adClientId) {
    return null;
  }

  return (
    <Script
      id="google-adsense-script"
      strategy="lazyOnload"
      crossOrigin="anonymous"
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.adClientId}`}
    />
  );
}

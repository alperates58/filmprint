"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { hasAnalyticsConsent } from "@/lib/analytics/client";

interface GoogleAnalyticsProps {
  measurementId?: string | null;
  enabled?: boolean;
}

export function GoogleAnalytics({ measurementId, enabled = false }: GoogleAnalyticsProps) {
  const [isConsented, setIsConsented] = useState(true);

  useEffect(() => {
    setIsConsented(hasAnalyticsConsent());
  }, []);

  // Strict architectural guard: configuration enabled + measurementId present
  if (!measurementId || !enabled) {
    return null;
  }

  return (
    <>
      {/* Global Site Tag (gtag.js) */}
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
      />
      <Script
        id="google-analytics-consent-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());

            gtag('consent', 'default', {
              'analytics_storage': '${isConsented ? "granted" : "denied"}',
              'ad_storage': 'denied',
              'ad_user_data': 'denied',
              'ad_personalization': 'denied'
            });

            gtag('config', '${measurementId}', {
              page_path: window.location.pathname,
              anonymize_ip: true,
              send_page_view: true
            });
          `,
        }}
      />
    </>
  );
}

import { MetadataRoute } from "next";
import { getSeoSystemConfig } from "@/lib/growth/settings";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const config = await getSeoSystemConfig();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://sineai.com.tr";

  // If master SEO is completely disabled or environment is explicitly development/staging
  if (!config.seoMasterEnabled) {
    return {
      rules: {
        userAgent: "*",
        disallow: "/",
      },
      sitemap: `${baseUrl}/sitemap.xml`,
    };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/film/",
          "/dizi/",
          "/filmler/tur/",
          "/diziler/tur/",
          "/how-it-works",
          "/about",
          "/contact",
          "/legal/",
        ],
        disallow: [
          "/admin",
          "/admin/",
          "/api",
          "/api/",
          "/auth",
          "/auth/",
          "/login",
          "/library",
          "/library/",
          "/profile",
          "/profile/",
          "/tv/profile",
          "/tv/profile/",
          "/calibrate",
          "/calibrate/",
          "/tv/calibration",
          "/tv/calibration/",
          "/recommendations",
          "/recommendations/",
          "/tv/recommendations",
          "/tv/recommendations/",
          "/night",
          "/night/",
          "/watch-later",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}

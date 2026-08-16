import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { BottomNav } from "@/components/ui/BottomNav";

export const viewport: Viewport = {
  themeColor: "#0b0d14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "SineAI — Zevkini Öğrenen Yapay Zekâ Destekli Film ve Dizi Rehberi",
  description:
    "Zevkini öğrenen yapay zekâ destekli film ve dizi rehberi. Şeffaf algoritma, Film DNA ve kişiselleştirilmiş öneriler.",
  applicationName: "SineAI",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SineAI",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased bg-bg-base text-text-primary selection:bg-accent selection:text-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <PwaRegister />
        <div className="min-h-screen flex flex-col pb-20 md:pb-0">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}

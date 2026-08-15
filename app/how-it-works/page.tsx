import React from "react";
import type { Metadata } from "next";
import { Header } from "@/components/ui/Header";
import { Footer } from "@/components/ui/Footer";
import { HeroSection } from "@/components/how-it-works/HeroSection";
import { HowItWorksSteps } from "@/components/how-it-works/HowItWorksSteps";
import { FormulaSection } from "@/components/how-it-works/FormulaSection";
import { QualityGuards } from "@/components/how-it-works/QualityGuards";
import { InteractionTimeline } from "@/components/how-it-works/InteractionTimeline";
import { LiveReasoningDemo } from "@/components/how-it-works/LiveReasoningDemo";
import { DoAndDont } from "@/components/how-it-works/DoAndDont";
import { FaqAccordion } from "@/components/how-it-works/FaqAccordion";
import { FinalCta } from "@/components/how-it-works/FinalCta";

export const metadata: Metadata = {
  title: "Nasıl Çalışıyor? — Şeffaf Algoritma ve Matematiksel Modeller | Filmprint",
  description:
    "Filmprint'in tarafsız ve bilimsel film öneri motorunun arkasındaki Bayesian kalite puanlaması, Film DNA vektörleşmesi ve açıklanabilir yapay zeka formüllerini inceleyin.",
  openGraph: {
    title: "Filmprint Nasıl Çalışıyor? — Şeffaf ve Kanıta Dayalı Öneri Motoru",
    description:
      "Şişirilmiş puanlar ve sponsorlu listeler yok. Filmprint, film zevkinizi matematiksel formüllerle modeller ve her öneriyi gerekçelendirir.",
  },
};

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans selection:bg-accent selection:text-white overflow-x-hidden">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-16 sm:space-y-20 w-full">
        {/* 1. Hero Section with Trust Badges */}
        <HeroSection />

        {/* 2. 4-Step Process Flow */}
        <HowItWorksSteps />

        {/* 3. Mathematical Formulas (Formula 1, 2, 3, 4) */}
        <FormulaSection />

        {/* 4. 6 Quality & Integrity Guards */}
        <QualityGuards />

        {/* 5. Interaction Timeline */}
        <InteractionTimeline />

        {/* 6. Live Reasoning & Grounded Evidence Demo */}
        <LiveReasoningDemo />

        {/* 7. Do's and Don'ts Matrix */}
        <DoAndDont />

        {/* 8. Technical FAQ Accordion */}
        <FaqAccordion />

        {/* 9. Final Call to Action */}
        <FinalCta />
      </main>

      <Footer />
    </div>
  );
}

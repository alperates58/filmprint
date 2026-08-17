"use client";

import React from "react";

interface TasteTraitsProps {
  traits: string[];
  popularityLabel: string;
  familiarityDesc: string;
  mediaType?: "FILM" | "TV";
  narrativeDimensions?: Array<{
    name: string;
    leftLabel: string;
    rightLabel: string;
    value: number; // 0.0 to 1.0
  }>;
}

export function TasteTraits({
  traits,
  popularityLabel,
  familiarityDesc,
  mediaType = "FILM",
  narrativeDimensions,
}: TasteTraitsProps) {
  const isFilm = mediaType === "FILM";

  // Default rich cinematic dimensions if not provided
  const dimensions = narrativeDimensions || [
    {
      name: "Anlatı Ritim Yaklaşımı",
      leftLabel: "Yüksek Ritim & Aksiyon",
      rightLabel: "Atmosferik & Slow-Burn",
      value: 0.65,
    },
    {
      name: "Odak Düzlemi",
      leftLabel: "Görsel Spektakl",
      rightLabel: "Derin Karakter & Diyalog",
      value: 0.78,
    },
    {
      name: "Ahlaki / Tonel Çizgi",
      leftLabel: "Net & Umut Dolu",
      rightLabel: "Karanlık & Ahlaki Belirsizlik",
      value: 0.70,
    },
    {
      name: "Yapım & Keşif Dengesi",
      leftLabel: "İkonik Gişe Başyapıtları",
      rightLabel: "Festival & Gizli Cevherler",
      value: 0.55,
    },
  ];

  return (
    <div className="p-6 md:p-8 rounded-3xl bg-surface-1 border border-border/80 space-y-6 shadow-md">
      <div className="border-b border-border/60 pb-5">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold mb-1">
          <span>🎭 ZEVK PARMAK İZİ</span>
        </div>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-text-primary tracking-tight">
          {isFilm ? "Sinematik Karakter & Doku Analizi" : "Dizi Anlatı & Karakter Analizi"}
        </h2>
        <p className="text-xs sm:text-sm text-text-secondary font-sans mt-0.5">
          İzleme eğilimlerinizden çıkarılan psikolojik ton, anlatı derinliği ve estetik eşikleriniz.
        </p>
      </div>

      {/* Trait Badges */}
      <div className="space-y-2.5">
        <p className="text-[11px] font-sans font-bold uppercase tracking-wider text-text-muted">
          BELİRGİN SİNEMA ALIŞKANLIKLARI
        </p>
        <div className="flex flex-wrap gap-2.5">
          {traits.map((trait, idx) => {
            const colors = [
              "bg-violet-500/10 border-violet-500/30 text-violet-300",
              "bg-cyan-500/10 border-cyan-500/30 text-cyan-300",
              "bg-amber-500/10 border-amber-500/30 text-amber-300",
              "bg-emerald-500/10 border-emerald-500/30 text-emerald-300",
              "bg-rose-500/10 border-rose-500/30 text-rose-300",
            ];
            const colorClass = colors[idx % colors.length];

            return (
              <div
                key={trait}
                className={`px-4 py-2 rounded-2xl border text-xs font-sans font-medium flex items-center gap-2 shadow-sm ${colorClass}`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                <span>{trait}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Dimensional Spectrum Gauges */}
      <div className="space-y-4 pt-2 font-sans">
        <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
          ESTETİK EĞİLİM EKSENLERİ
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dimensions.map((dim) => {
            const percent = Math.round(dim.value * 100);
            return (
              <div
                key={dim.name}
                className="p-4 rounded-2xl bg-surface-2 border border-border/80 space-y-2"
              >
                <div className="flex justify-between items-center text-xs font-bold text-text-primary">
                  <span>{dim.name}</span>
                  <span className="text-accent">%{percent}</span>
                </div>

                {/* Gauge Slider Track */}
                <div className="relative w-full h-2.5 rounded-full bg-surface-3 border border-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-500 to-emerald-400 transition-all duration-700"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-text-muted font-medium pt-0.5">
                  <span>{dim.leftLabel}</span>
                  <span>{dim.rightLabel}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary Stat Footers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 font-sans">
        <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
          <p className="text-[11px] font-semibold text-text-muted">POPÜLERLİK YAKLAŞIMI</p>
          <p className="text-sm font-bold text-text-primary">{popularityLabel}</p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-2 border border-border space-y-1">
          <p className="text-[11px] font-semibold text-text-muted">KEŞİF & NİŞ DENGESİ</p>
          <p className="text-sm font-bold text-text-primary">{familiarityDesc}</p>
        </div>
      </div>
    </div>
  );
}

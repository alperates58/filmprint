"use client";

import React, { useState } from "react";

interface RankItem {
  key: string;
  label: string;
  icon: string;
  count: number;
}

interface AdminRankDistributionProps {
  rankDistribution: RankItem[];
  tvRankDistribution?: RankItem[];
}

export function AdminRankDistribution({
  rankDistribution,
  tvRankDistribution = [],
}: AdminRankDistributionProps) {
  const [selectedMedia, setSelectedMedia] = useState<"FILM" | "TV">("FILM");
  const [isExpanded, setIsExpanded] = useState(false);

  const currentDistribution = selectedMedia === "FILM" ? rankDistribution : tvRankDistribution;
  const totalUsersWithRank = currentDistribution.reduce((acc, r) => acc + r.count, 0);
  const activeRanks = currentDistribution.filter((r) => r.count > 0);

  return (
    <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4 shadow-md">
      {/* Header & Media Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base font-bold text-text-primary">
              Kullanıcı Rütbe Dağılımı
            </h2>
            <span className="text-[11px] font-mono text-accent bg-accent/10 px-2.5 py-0.5 rounded-full border border-accent/20">
              {activeRanks.length} Aktif / {totalUsersWithRank} Kullanıcı
            </span>
          </div>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            Kullanıcıların film ve dizi değerlendirme rütbelerine göre kümelenmesi
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Media Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface-elevated border border-border font-mono text-xs">
            <button
              type="button"
              onClick={() => setSelectedMedia("FILM")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                selectedMedia === "FILM"
                  ? "bg-accent text-white font-bold shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span>🎬</span>
              <span>Film Rütbeleri (19)</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedMedia("TV")}
              className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1 ${
                selectedMedia === "TV"
                  ? "bg-accent text-white font-bold shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              <span>📺</span>
              <span>Dizi Rütbeleri (16)</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-mono text-accent hover:text-accent/80 flex items-center gap-1 py-1.5 px-3 rounded-xl bg-surface-elevated border border-border transition-colors whitespace-nowrap"
          >
            <span>{isExpanded ? "▲ Daralt" : `▼ Tüm Rütbeler (${currentDistribution.length})`}</span>
          </button>
        </div>
      </div>

      {/* Segmented Distribution Bar */}
      {totalUsersWithRank > 0 && (
        <div className="space-y-1.5">
          <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden flex border border-border/60">
            {activeRanks.map((r, i) => {
              const pct = (r.count / totalUsersWithRank) * 100;
              const opacities = ["bg-accent", "bg-accent/80", "bg-accent/60", "bg-accent/40", "bg-accent/25"];
              const bgClass = opacities[i % opacities.length];
              return (
                <div
                  key={r.key}
                  style={{ width: `${pct}%` }}
                  title={`${r.label}: ${r.count} kullanıcı (%${Math.round(pct)})`}
                  className={`h-full ${bgClass} transition-all border-r border-background/40 last:border-0`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Active Ranks Compact Chips */}
      {activeRanks.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {activeRanks.map((r) => {
            const pct = totalUsersWithRank > 0 ? Math.round((r.count / totalUsersWithRank) * 100) : 0;
            return (
              <div
                key={r.key}
                className="p-2.5 rounded-xl bg-surface-elevated border border-accent/30 flex items-center gap-2.5 min-w-0"
              >
                <span className="text-xl select-none">{r.icon}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-mono font-bold text-text-primary truncate" title={r.label}>
                    {r.label}
                  </p>
                  <p className="text-[11px] font-mono text-accent font-semibold">
                    {r.count} <span className="text-[9px] font-normal text-text-muted">Kullanıcı (%{pct})</span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs font-mono text-text-muted italic">Bu kategoride henüz rütbeli kullanıcı bulunmuyor.</p>
      )}

      {/* Expandable Full Ranks Grid */}
      {isExpanded && (
        <div className="pt-3 border-t border-border/60 space-y-2 animate-fadeIn">
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            TÜM {selectedMedia === "FILM" ? "FİLM" : "DİZİ"} RÜTBE KATALOGU ({currentDistribution.length} KADEME)
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {currentDistribution.map((r) => {
              const hasUsers = r.count > 0;
              return (
                <div
                  key={r.key}
                  className={`p-2 rounded-lg border text-center space-y-0.5 min-w-0 ${
                    hasUsers
                      ? "bg-accent/10 border-accent/40 text-text-primary font-bold"
                      : "bg-surface-elevated/40 border-border/40 text-text-muted opacity-50"
                  }`}
                >
                  <div className="text-sm select-none">{r.icon}</div>
                  <p className="text-[11px] font-mono truncate" title={r.label}>
                    {r.label}
                  </p>
                  <p className={`text-xs font-mono ${hasUsers ? "text-accent font-bold" : "text-text-muted"}`}>
                    {r.count}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

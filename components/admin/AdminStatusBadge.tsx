"use client";

import React from "react";

export type AdminStatusType =
  | "RUNNING"
  | "PAUSED"
  | "CIRCUIT_OPEN"
  | "DAILY_LIMIT"
  | "INITIAL_FILL"
  | "INCREMENTAL"
  | "ACTIVE"
  | "IDLE"
  | "ERROR"
  | "ADMIN"
  | "USER"
  | "REGISTERED"
  | "ANONYMOUS"
  | "GOOGLE"
  | "CREDENTIALS";

interface AdminStatusBadgeProps {
  status: string;
  label?: string;
  size?: "sm" | "md";
}

export function AdminStatusBadge({ status, label, size = "sm" }: AdminStatusBadgeProps) {
  const normalized = (status || "").toUpperCase();

  let colorClasses = "bg-surface-2 text-text-muted border-border";
  let dotColor = "bg-text-muted";
  let displayLabel = label || status;

  switch (normalized) {
    case "RUNNING":
    case "ACTIVE":
    case "SAĞLIKLI":
    case "CONNECTED":
      colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/25";
      dotColor = "bg-emerald-400 animate-pulse";
      displayLabel = label || (normalized === "RUNNING" ? "Çalışıyor" : "Aktif");
      break;

    case "PAUSED":
    case "IDLE":
    case "DURDURULDU":
      colorClasses = "bg-surface-2 text-text-secondary border-border";
      dotColor = "bg-text-muted";
      displayLabel = label || "Duraklatıldı";
      break;

    case "CIRCUIT_OPEN":
    case "ERROR":
    case "FAILED":
      colorClasses = "bg-red-500/10 text-red-400 border-red-500/25";
      dotColor = "bg-red-400";
      displayLabel = label || (normalized === "CIRCUIT_OPEN" ? "Devre Kesildi (Hata)" : "Hata");
      break;

    case "DAILY_LIMIT":
    case "WARNING":
    case "RATE_LIMITED":
      colorClasses = "bg-amber-500/10 text-amber-400 border-amber-500/25";
      dotColor = "bg-amber-400";
      displayLabel = label || (normalized === "DAILY_LIMIT" ? "Günlük Limit" : "Uyarı");
      break;

    case "INITIAL_FILL":
      colorClasses = "bg-indigo-500/10 text-indigo-400 border-indigo-500/25";
      dotColor = "bg-indigo-400";
      displayLabel = label || "İlk Doldurma";
      break;

    case "INCREMENTAL":
      colorClasses = "bg-sky-500/10 text-sky-400 border-sky-500/25";
      dotColor = "bg-sky-400";
      displayLabel = label || "Artımlı Güncelleme";
      break;

    case "ADMIN":
    case "SUPER_ADMIN":
      colorClasses = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
      dotColor = "bg-indigo-400";
      displayLabel = label || "Yönetici";
      break;

    case "REGISTERED":
      colorClasses = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      dotColor = "bg-emerald-400";
      displayLabel = label || "Kayıtlı";
      break;

    case "ANONYMOUS":
      colorClasses = "bg-surface-2 text-text-muted border-border";
      dotColor = "bg-text-muted";
      displayLabel = label || "Anonim";
      break;

    case "GOOGLE":
      colorClasses = "bg-blue-500/10 text-blue-400 border-blue-500/25";
      dotColor = "bg-blue-400";
      displayLabel = label || "Google";
      break;

    default:
      break;
  }

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-[11px] gap-1.5" : "px-2.5 py-1 text-xs gap-2";

  return (
    <span
      className={`inline-flex items-center rounded-lg border font-sans font-medium leading-none ${sizeClasses} ${colorClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor} flex-shrink-0`} />
      <span>{displayLabel}</span>
    </span>
  );
}

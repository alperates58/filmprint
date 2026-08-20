"use client";

import React, { useEffect, useRef } from "react";

export type ShareFormatMode = "STORY" | "POST" | "PASSPORT";

export interface ShareCardData {
  userId?: string;
  userName: string;
  userAvatar?: string;
  rankLabel?: string;
  rankBadgeIcon?: string;
  confidencePercent: number;
  sampleCount: number;
  archetypes: Array<{ name: string; isPrimary?: boolean; icon?: string }>;
  genres: Array<{ name: string; score: number }>;
  topEra?: string;
  aiQuote?: string;
  lovedMovies?: Array<{ title: string; releaseYear?: number | null }>;
  isTv?: boolean;
}

interface ShareCardCanvasProps {
  data: ShareCardData;
  mode: ShareFormatMode;
  onBlobReady?: (blob: Blob) => void;
  className?: string;
}

export function ShareCardCanvas({
  data,
  mode,
  onBlobReady,
  className = "",
}: ShareCardCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Dimensions based on mode
    let width = 1080;
    let height = 1920; // Default: Story 9:16

    if (mode === "POST") {
      width = 1080;
      height = 1080; // Square 1:1
    } else if (mode === "PASSPORT") {
      width = 1200;
      height = 800; // Passport/ID Card 3:2
    }

    canvas.width = width;
    canvas.height = height;

    // Render Canvas based on mode
    renderCard(ctx, width, height, data, mode).then(() => {
      if (onBlobReady) {
        canvas.toBlob((blob) => {
          if (blob) onBlobReady(blob);
        }, "image/png");
      }
    });
  }, [data, mode, onBlobReady]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-auto rounded-2xl shadow-2xl ${className}`}
      style={{ maxHeight: mode === "STORY" ? "65vh" : "50vh", objectFit: "contain" }}
    />
  );
}

async function renderCard(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: ShareCardData,
  mode: ShareFormatMode
) {
  // 1. Deep Obsidian Background & Glows
  ctx.fillStyle = "#090A0F";
  ctx.fillRect(0, 0, width, height);

  // Radial Ambient Glows
  const grad1 = ctx.createRadialGradient(width * 0.8, height * 0.15, 50, width * 0.8, height * 0.15, width * 0.6);
  grad1.addColorStop(0, "rgba(139, 92, 246, 0.28)"); // Violet glow
  grad1.addColorStop(1, "transparent");
  ctx.fillStyle = grad1;
  ctx.fillRect(0, 0, width, height);

  const grad2 = ctx.createRadialGradient(width * 0.2, height * 0.8, 50, width * 0.2, height * 0.8, width * 0.5);
  grad2.addColorStop(0, "rgba(6, 182, 212, 0.22)"); // Cyan glow
  grad2.addColorStop(1, "transparent");
  ctx.fillStyle = grad2;
  ctx.fillRect(0, 0, width, height);

  if (mode === "PASSPORT") {
    renderPassport(ctx, width, height, data);
    return;
  }

  if (mode === "POST") {
    renderPost(ctx, width, height, data);
    return;
  }

  // DEFAULT: Instagram Story (9:16)
  renderStory(ctx, width, height, data);
}

function renderStory(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: ShareCardData
) {
  const margin = 80;

  // Header Brand
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("SINEAI", margin, 140);

  ctx.fillStyle = "#8B5CF6";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("FILM DNA KİMLİĞİ", margin + 180, 136);

  // Top Card Container
  drawRoundedRect(ctx, margin, 200, width - margin * 2, 420, 36, "rgba(22, 24, 34, 0.9)", "rgba(255, 255, 255, 0.12)");

  // Avatar Placeholder / Frame
  const avatarX = margin + 40;
  const avatarY = 240;
  const avatarSize = 130;
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 28, "#1E1B4B", "rgba(139, 92, 246, 0.5)");

  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const initial = data.userName ? data.userName.charAt(0).toUpperCase() : "🎬";
  ctx.fillText(initial, avatarX + avatarSize / 2, avatarY + avatarSize / 2);

  // Name & Rank
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText(truncateText(ctx, data.userName || "Sinefil", 560), margin + 200, 290);

  // Rank Pill
  const rank = data.rankLabel || "Sinema Kaşifi";
  const badge = data.rankBadgeIcon || "🏆";
  drawRoundedRect(ctx, margin + 200, 320, 300, 48, 24, "rgba(245, 158, 11, 0.15)", "rgba(245, 158, 11, 0.4)");
  ctx.fillStyle = "#FBBF24";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText(`${badge} ${rank}`, margin + 225, 353);

  // Confidence & Sample Stats
  const statY = 430;
  drawRoundedRect(ctx, margin + 40, statY, width - margin * 2 - 80, 140, 24, "rgba(15, 17, 26, 0.8)", "rgba(255, 255, 255, 0.08)");

  // Stat 1: Confidence
  ctx.fillStyle = "#10B981";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(`%${data.confidencePercent}`, margin + 80, statY + 68);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "600 20px sans-serif";
  ctx.fillText("PROFİL GÜVENİ", margin + 80, statY + 104);

  // Stat 2: Analyzed
  ctx.fillStyle = "#8B5CF6";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(`${data.sampleCount}`, margin + 480, statY + 68);
  ctx.fillStyle = "#94A3B8";
  ctx.font = "600 20px sans-serif";
  ctx.fillText(data.isTv ? "DİZİ ANALİZİ" : "FİLM ANALİZİ", margin + 480, statY + 104);

  // Section 2: Top Archetypes
  let currentY = 670;
  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("SİNEMATİK ARKETİPLER", margin, currentY);

  currentY += 25;
  let archX = margin;
  const archetypes = data.archetypes.slice(0, 3);
  for (const arch of archetypes) {
    const text = `${arch.icon ? arch.icon + " " : ""}${arch.name}`;
    ctx.font = "bold 26px sans-serif";
    const textWidth = ctx.measureText(text).width;
    const pillWidth = textWidth + 40;

    drawRoundedRect(ctx, archX, currentY, pillWidth, 56, 20, arch.isPrimary ? "rgba(139, 92, 246, 0.25)" : "rgba(30, 41, 59, 0.7)", arch.isPrimary ? "rgba(167, 139, 250, 0.6)" : "rgba(255, 255, 255, 0.1)");

    ctx.fillStyle = arch.isPrimary ? "#DDD6FE" : "#CBD5E1";
    ctx.fillText(text, archX + 20, currentY + 37);

    archX += pillWidth + 18;
  }

  // Section 3: Genre Affinity Bars
  currentY += 120;
  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("BASKIN TÜR REZONANSI", margin, currentY);

  currentY += 40;
  const topGenres = data.genres.slice(0, 4);
  const barColors = ["#8B5CF6", "#06B6D4", "#EC4899", "#F59E0B"];

  for (let i = 0; i < topGenres.length; i++) {
    const genre = topGenres[i];
    const scorePct = Math.round(genre.score * 100);
    const barWidth = width - margin * 2;

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 26px sans-serif";
    ctx.fillText(genre.name, margin, currentY);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`%${scorePct}`, width - margin, currentY);
    ctx.textAlign = "left";

    // Progress track
    drawRoundedRect(ctx, margin, currentY + 14, barWidth, 16, 8, "rgba(30, 41, 59, 0.8)");
    // Progress fill
    const fillWidth = Math.max(20, (barWidth * scorePct) / 100);
    drawRoundedRect(ctx, margin, currentY + 14, fillWidth, 16, 8, barColors[i % barColors.length]);

    currentY += 72;
  }

  // Section 4: AI Sinephile Narrative Card
  currentY += 20;
  const narrativeHeight = 330;
  drawRoundedRect(ctx, margin, currentY, width - margin * 2, narrativeHeight, 30, "rgba(22, 24, 34, 0.95)", "rgba(139, 92, 246, 0.35)");

  ctx.fillStyle = "#8B5CF6";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("✨ YAPAY ZEKÂ SİNEFİL ÖZETİ", margin + 35, currentY + 48);

  const quoteText = data.aiQuote || "Karakterlerin ahlaki ikilemlerle sınandığı, yüksek atmosferik tansiyona sahip ve akıl oyunlarıyla örülü senaryolara özel bir zaafın var.";
  ctx.fillStyle = "#F1F5F9";
  ctx.font = "italic 30px sans-serif";
  wrapText(ctx, `“${quoteText.replace(/\*\*(.*?)\*\*/g, "$1")}”`, margin + 35, currentY + 105, width - margin * 2 - 70, 46);

  // Footer: Call to Action & Watermark
  const footerY = height - 140;
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 32px sans-serif";
  ctx.fillText("Senin Film DNA'n ne söylüyor?", width / 2, footerY);

  ctx.fillStyle = "#A78BFA";
  ctx.font = "600 24px sans-serif";
  ctx.fillText("sineai.com.tr", width / 2, footerY + 42);
  ctx.textAlign = "left";
}

function renderPost(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: ShareCardData
) {
  const margin = 60;

  // Header Brand
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 36px sans-serif";
  ctx.fillText("SINEAI", margin, 90);

  ctx.fillStyle = "#8B5CF6";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("FILM DNA KİMLİĞİ", margin + 145, 87);

  // Profile Header Box
  drawRoundedRect(ctx, margin, 125, width - margin * 2, 240, 24, "rgba(22, 24, 34, 0.9)", "rgba(255, 255, 255, 0.1)");

  const avatarX = margin + 30;
  const avatarY = 155;
  const avatarSize = 100;
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 20, "#1E1B4B", "rgba(139, 92, 246, 0.5)");

  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 44px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.userName ? data.userName.charAt(0).toUpperCase() : "🎬", avatarX + avatarSize / 2, avatarY + avatarSize / 2);

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 42px sans-serif";
  ctx.fillText(truncateText(ctx, data.userName || "Sinefil", 480), margin + 150, 195);

  const rank = data.rankLabel || "Sinema Kaşifi";
  const badge = data.rankBadgeIcon || "🏆";
  drawRoundedRect(ctx, margin + 150, 220, 260, 40, 20, "rgba(245, 158, 11, 0.15)", "rgba(245, 158, 11, 0.4)");
  ctx.fillStyle = "#FBBF24";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`${badge} ${rank}`, margin + 170, 248);

  // Confidence Pill
  drawRoundedRect(ctx, margin + 150, 280, 260, 40, 20, "rgba(16, 185, 129, 0.15)", "rgba(16, 185, 129, 0.4)");
  ctx.fillStyle = "#34D399";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText(`%${data.confidencePercent} Güven (${data.sampleCount} ${data.isTv ? "Dizi" : "Film"})`, margin + 170, 308);

  // Archetypes
  let currentY = 410;
  let archX = margin;
  for (const arch of data.archetypes.slice(0, 3)) {
    const text = `${arch.icon ? arch.icon + " " : ""}${arch.name}`;
    ctx.font = "bold 22px sans-serif";
    const textWidth = ctx.measureText(text).width;
    const pillWidth = textWidth + 32;

    drawRoundedRect(ctx, archX, currentY, pillWidth, 48, 16, arch.isPrimary ? "rgba(139, 92, 246, 0.25)" : "rgba(30, 41, 59, 0.7)", arch.isPrimary ? "rgba(167, 139, 250, 0.6)" : "rgba(255, 255, 255, 0.1)");
    ctx.fillStyle = arch.isPrimary ? "#DDD6FE" : "#CBD5E1";
    ctx.fillText(text, archX + 16, currentY + 32);

    archX += pillWidth + 14;
  }

  // Genre Bars
  currentY = 500;
  const topGenres = data.genres.slice(0, 3);
  const barColors = ["#8B5CF6", "#06B6D4", "#EC4899"];

  for (let i = 0; i < topGenres.length; i++) {
    const genre = topGenres[i];
    const scorePct = Math.round(genre.score * 100);
    const barWidth = width - margin * 2;

    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 22px sans-serif";
    ctx.fillText(genre.name, margin, currentY);

    ctx.fillStyle = "#94A3B8";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`%${scorePct}`, width - margin, currentY);
    ctx.textAlign = "left";

    drawRoundedRect(ctx, margin, currentY + 10, barWidth, 14, 7, "rgba(30, 41, 59, 0.8)");
    const fillWidth = Math.max(20, (barWidth * scorePct) / 100);
    drawRoundedRect(ctx, margin, currentY + 10, fillWidth, 14, 7, barColors[i % barColors.length]);

    currentY += 58;
  }

  // AI Quote Box
  currentY += 10;
  drawRoundedRect(ctx, margin, currentY, width - margin * 2, 190, 20, "rgba(22, 24, 34, 0.95)", "rgba(139, 92, 246, 0.3)");

  ctx.fillStyle = "#8B5CF6";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText("✨ YAPAY ZEKÂ TESPİTİ", margin + 25, currentY + 36);

  const quoteText = data.aiQuote || "Öngörülebilir gişe formülleri yerine yönetmen vizyonunu ve karakter derinliğini ödüllendiriyorsun.";
  ctx.fillStyle = "#F1F5F9";
  ctx.font = "italic 22px sans-serif";
  wrapText(ctx, `“${quoteText.replace(/\*\*(.*?)\*\*/g, "$1")}”`, margin + 25, currentY + 76, width - margin * 2 - 50, 32);

  // Footer CTA
  const footerY = height - 60;
  ctx.textAlign = "center";
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("Kendi Film DNA'nı keşfet → sineai.com.tr", width / 2, footerY);
  ctx.textAlign = "left";
}

function renderPassport(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  data: ShareCardData
) {
  const margin = 60;

  // Passport Outer Frame
  drawRoundedRect(ctx, margin, margin, width - margin * 2, height - margin * 2, 28, "#13141F", "rgba(139, 92, 246, 0.5)");

  // Gold Header Banner
  ctx.fillStyle = "#D97706";
  ctx.font = "bold 22px monospace";
  ctx.fillText("SINEAI REPUBLIC OF CINEMA — OFFICIAL PASSPORT", margin + 40, margin + 55);

  // Avatar Left
  const avatarX = margin + 40;
  const avatarY = margin + 85;
  const avatarSize = 160;
  drawRoundedRect(ctx, avatarX, avatarY, avatarSize, avatarSize, 20, "#1E1B4B", "#F59E0B");

  ctx.fillStyle = "#FBBF24";
  ctx.font = "bold 64px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(data.userName ? data.userName.charAt(0).toUpperCase() : "🎬", avatarX + avatarSize / 2, avatarY + avatarSize / 2);

  // Identity Specs
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  const fields = [
    { label: "SİNEFİL KİMLİĞİ / NAME", val: data.userName || "Sinefil" },
    { label: "DERECELENDİRME / GRADE", val: `${data.rankBadgeIcon || "🏆"} ${data.rankLabel || "Sinema Ustası"}` },
    { label: "DNA GÜVENLİK / TRUST", val: `%${data.confidencePercent} (${data.sampleCount} ${data.isTv ? "Dizi" : "Film"})` },
    { label: "BASKIN DÖNEM / ERA", val: data.topEra || "1990'lar Kült Sineması" },
  ];

  let specY = margin + 115;
  for (const f of fields) {
    ctx.fillStyle = "#64748B";
    ctx.font = "bold 16px monospace";
    ctx.fillText(f.label, margin + 240, specY);

    ctx.fillStyle = "#F8FAFC";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText(f.val, margin + 240, specY + 32);

    specY += 68;
  }

  // Stamp 1: Archetypes
  const stampX = width - margin - 320;
  const stampY = margin + 100;
  drawRoundedRect(ctx, stampX, stampY, 280, 220, 20, "rgba(139, 92, 246, 0.1)", "rgba(139, 92, 246, 0.4)");
  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 18px monospace";
  ctx.fillText("RESMİ VİZE / ARKETİP", stampX + 20, stampY + 38);

  let archY = stampY + 80;
  for (const arch of data.archetypes.slice(0, 3)) {
    ctx.fillStyle = "#E2E8F0";
    ctx.font = "bold 20px sans-serif";
    ctx.fillText(`• ${arch.name}`, stampX + 20, archY);
    archY += 40;
  }

  // Barcode / Verification Strip at bottom
  const barY = height - margin - 120;
  ctx.fillStyle = "#334155";
  ctx.fillRect(margin + 40, barY, width - margin * 2 - 80, 3);

  ctx.fillStyle = "#94A3B8";
  ctx.font = "18px monospace";
  ctx.fillText(`ID: ${data.userId || "SIN-882910"} << SINEAI-VERIFIED << TASTE-SCORE-${data.confidencePercent}`, margin + 40, barY + 40);

  ctx.fillStyle = "#A78BFA";
  ctx.font = "bold 20px sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("sineai.com.tr", width - margin - 40, barY + 40);
  ctx.textAlign = "left";
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillColor?: string,
  strokeColor?: string
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 0 && ctx.measureText(truncated + "...").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "...";
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let lineCount = 0;

  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + " ";
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && n > 0) {
      ctx.fillText(line, x, y);
      line = words[n] + " ";
      y += lineHeight;
      lineCount++;
      if (lineCount >= 4) {
        ctx.fillText(line + "...", x, y);
        return;
      }
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line, x, y);
}

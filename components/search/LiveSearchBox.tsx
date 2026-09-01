"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getTmdbImageUrl } from "@/lib/tmdb/image";

interface SearchResultItem {
  id: string;
  tmdbId: number;
  mediaType: "FILM" | "TV";
  title: string;
  originalTitle: string | null;
  posterPath: string | null;
  releaseYear: number | null;
  voteAverage: number;
  genres: string[];
  slug: string;
}

interface LiveSearchBoxProps {
  placeholder?: string;
  className?: string;
  onSelect?: () => void;
}

export function LiveSearchBox({
  placeholder = "Film, dizi ara...",
  className = "",
  onSelect,
}: LiveSearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/live?q=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.results || []);
          setIsOpen(true);
        }
      } catch (err) {
        console.error("Live search fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen && results.length > 0 && e.key === "ArrowDown") {
      setIsOpen(true);
      return;
    }

    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        const selected = results[selectedIndex];
        setIsOpen(false);
        if (onSelect) onSelect();
        router.push(selected.slug);
      } else if (query.trim().length > 0) {
        setIsOpen(false);
        if (onSelect) onSelect();
        router.push(`/arama?q=${encodeURIComponent(query.trim())}`);
      }
    }
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <span className="absolute left-3.5 text-text-muted text-sm pointer-events-none">
          🔍
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label="Canlı Arama"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className="w-full h-10 pl-10 pr-9 rounded-2xl bg-surface-2/80 hover:bg-surface-2 focus:bg-surface-1 border border-border focus:border-accent/60 text-xs sm:text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all font-sans"
        />

        {/* Loading Spinner or Clear Button */}
        <div className="absolute right-3 flex items-center">
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-text-muted hover:text-text-primary text-xs p-1 transition-colors"
              aria-label="Aramayı Temizle"
            >
              ✕
            </button>
          ) : null}
        </div>
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-surface-1/95 backdrop-blur-xl border border-border/80 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fadeIn max-h-[420px] flex flex-col">
          <div className="overflow-y-auto overscroll-contain divide-y divide-border/40 scrollbar-none flex-1">
            {results.length > 0 ? (
              results.map((item, index) => {
                const posterUrl = item.posterPath ? getTmdbImageUrl(item.posterPath, "w185") : null;
                const isSelected = selectedIndex === index;

                return (
                  <Link
                    key={`${item.mediaType}-${item.id}`}
                    href={item.slug}
                    onClick={() => {
                      setIsOpen(false);
                      if (onSelect) onSelect();
                    }}
                    className={`flex items-center gap-3 p-2.5 sm:p-3 transition-colors ${
                      isSelected ? "bg-accent/15" : "hover:bg-surface-2/80"
                    }`}
                  >
                    {/* Poster Thumbnail */}
                    <div className="w-9 h-13 sm:w-10 sm:h-14 rounded-lg bg-surface-2 overflow-hidden relative flex-shrink-0 border border-border/60">
                      {posterUrl ? (
                        <Image
                          src={posterUrl}
                          alt={item.title}
                          fill
                          sizes="40px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs text-text-muted">
                          🎬
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.2 text-[9px] font-mono font-bold rounded ${
                            item.mediaType === "FILM"
                              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                          }`}
                        >
                          {item.mediaType === "FILM" ? "FİLM" : "DİZİ"}
                        </span>
                        {item.releaseYear && (
                          <span className="text-[11px] font-mono text-text-muted">
                            {item.releaseYear}
                          </span>
                        )}
                        {item.voteAverage > 0 && (
                          <span className="text-[11px] font-bold text-amber-400 flex items-center gap-0.5">
                            <span>★</span>
                            <span>{item.voteAverage.toFixed(1)}</span>
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm font-semibold text-text-primary truncate font-sans">
                        {item.title}
                      </p>

                      {item.originalTitle && item.originalTitle !== item.title && (
                        <p className="text-[11px] text-text-muted italic truncate font-sans">
                          {item.originalTitle}
                        </p>
                      )}
                    </div>
                  </Link>
                );
              })
            ) : !isLoading ? (
              <div className="p-6 text-center text-text-muted text-xs space-y-1">
                <p>Eşleşen sonuç bulunamadı.</p>
                <p className="text-[11px] text-text-secondary">Farklı bir arama terimi veya oyuncu adı deneyin.</p>
              </div>
            ) : null}
          </div>

          {/* Footer Action: Detailed Search */}
          <div className="p-2.5 bg-surface-2/60 border-t border-border/60 flex items-center justify-between text-xs font-sans">
            <Link
              href={`/arama?q=${encodeURIComponent(query.trim())}`}
              onClick={() => {
                setIsOpen(false);
                if (onSelect) onSelect();
              }}
              className="w-full text-center py-1.5 px-3 rounded-xl bg-accent-subtle hover:bg-accent/20 border border-accent/30 text-accent font-semibold flex items-center justify-center gap-1.5 transition-all"
            >
              <span>🔍</span>
              <span>"{query.trim()}" için Detaylı Arama Yap →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

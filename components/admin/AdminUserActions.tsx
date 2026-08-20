"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

export interface AdminUserActionsProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
    accountType: string;
  };
  variant?: "table" | "header";
  redirectAfterDelete?: boolean;
}

export function AdminUserActions({
  user,
  variant = "table",
  redirectAfterDelete = false,
}: AdminUserActionsProps) {
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // Edit form state
  const [name, setName] = useState(user.name || "");
  const [email, setEmail] = useState(user.email || "");
  const [accountType, setAccountType] = useState(user.accountType || "REGISTERED");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          accountType,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Güncelleme başarısız oldu.");
      }

      setIsEditOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || "Bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Silme işlemi başarısız oldu.");
      }

      setIsDeleteOpen(false);
      if (redirectAfterDelete) {
        router.push("/admin/users");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      setError(err?.message || "Silme sırasında bir hata oluştu.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Trigger Buttons */}
      {variant === "table" ? (
        <div className="flex items-center justify-end gap-1.5 font-sans">
          <button
            type="button"
            onClick={() => {
              setName(user.name || "");
              setEmail(user.email || "");
              setAccountType(user.accountType || "REGISTERED");
              setIsEditOpen(true);
            }}
            title="Kullanıcıyı Düzenle"
            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface-2 transition-colors text-xs"
          >
            ✏️
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            title="Kullanıcıyı Sil"
            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors text-xs"
          >
            🗑️
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 font-sans">
          <button
            type="button"
            onClick={() => {
              setName(user.name || "");
              setEmail(user.email || "");
              setAccountType(user.accountType || "REGISTERED");
              setIsEditOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-surface-2 border border-border text-text-primary hover:border-accent/40 font-sans text-xs font-semibold hover:bg-surface-3 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>✏️</span>
            <span>Düzenle</span>
          </button>
          <button
            type="button"
            onClick={() => setIsDeleteOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 hover:bg-rose-500/25 font-sans text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm"
          >
            <span>🗑️</span>
            <span>Kullanıcıyı Sil</span>
          </button>
        </div>
      )}

      {/* Edit User Modal */}
      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-surface-1 border border-border rounded-3xl p-6 shadow-2xl space-y-5 text-text-primary">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <span className="text-accent font-bold">✏️</span>
                <h3 className="font-display font-bold text-base text-text-primary">Kullanıcıyı Düzenle</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="text-text-muted hover:text-text-primary text-xs"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-sans">
                {error}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 font-sans text-xs">
              <div className="space-y-1.5">
                <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                  Ad Soyad
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Kullanıcı Adı"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                  E-posta Adresi
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@alanadi.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-text-muted font-medium uppercase font-mono text-[10px]">
                  Hesap Türü
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-2 border border-border text-text-primary focus:outline-none focus:border-accent text-xs"
                >
                  <option value="REGISTERED">Kayıtlı Kullanıcı (REGISTERED)</option>
                  <option value="ANONYMOUS">Anonim Ziyaretçi (ANONYMOUS)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary font-medium transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent-hover transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {isDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-surface-1 border border-rose-500/30 rounded-3xl p-6 shadow-2xl space-y-4 text-text-primary font-sans">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 text-xl font-bold mx-auto">
              ⚠️
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-display font-bold text-base text-text-primary">
                Kullanıcıyı Silmek İstediğinize Emin Misiniz?
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                <span className="font-bold text-white">{user.name || user.email || user.id}</span> kullanıcısı sistemden kalıcı olarak silinecektir. Bu işlemle birlikte kullanıcının tüm kütüphane kayıtları, oylamaları ve DNA profilleri geri alınamaz şekilde temizlenir.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-sans">
                {error}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteOpen(false)}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-surface-2 border border-border text-text-secondary hover:text-text-primary font-medium text-xs transition-colors"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isSubmitting ? "Siliniyor..." : "Evet, Kullanıcıyı Sil"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

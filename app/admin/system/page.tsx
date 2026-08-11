import React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminSystemData } from "@/lib/admin/data";

export default async function AdminSystemPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminSystemData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Sistem ve Altyapı Durumu
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            Çalışma zamanı, veritabanı bağlantısı ve servis versiyonları
          </p>
        </div>

        {data && data.system ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-md">
                <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted font-mono">
                  Uygulama Bilgisi
                </h2>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Versiyon:</span>
                    <span className="font-bold text-text-primary">{data.system.applicationVersion}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Ortam (NODE_ENV):</span>
                    <span className="font-bold text-accent uppercase">{data.system.environment}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Node.js Runtime:</span>
                    <span className="text-text-primary">{data.system.nodeVersion}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Uptime:</span>
                    <span className="text-text-primary">{data.system.uptimeSeconds} saniye</span>
                  </div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-3 shadow-md">
                <h2 className="font-display text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted font-mono">
                  Veritabanı & Migration
                </h2>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Motor:</span>
                    <span className="font-bold text-text-primary">PostgreSQL 16 (Prisma ORM)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Bağlantı:</span>
                    <span className="font-bold text-success">SAĞLIKLI (CONNECTED)</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-border/40">
                    <span className="text-text-muted">Önbellekteki Film:</span>
                    <span className="font-bold text-text-primary">{data.system.database.cachedMovies}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-text-muted">Migration Stratejisi:</span>
                    <span className="text-text-secondary">prisma migrate deploy</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-surface border border-border/80 space-y-4 shadow-md">
              <h2 className="font-display text-base font-bold text-text-primary">
                Güvenlik ve Gizlilik İncelemesi
              </h2>
              <ul className="space-y-2 text-xs text-text-secondary font-mono list-disc list-inside">
                <li>Secret API anahtarları (TMDB, DeepSeek) veritabanında AES-256-GCM ile şifrelenmektedir.</li>
                <li>Sunucu tarafı encryption master key (`MASTER_ENCRYPTION_KEY`) asla istemciye iletilmez.</li>
                <li>Admin oturumu özel `filmprint_admin_session` HttpOnly çerezi üzerinden yürütülmektedir.</li>
                <li>Parolalar Node.js scrypt kriptografik algoritması ile tuzlanarak saklanmaktadır.</li>
              </ul>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted font-mono text-xs">
            Sistem verileri yüklenemedi.
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

import React from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";
import { getAdminUsersData } from "@/lib/admin/data";

export default async function AdminUsersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const data = await getAdminUsersData();

  return (
    <AdminLayout adminEmail={session.email}>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-text-primary">
            Anonim Kullanıcı Yönetimi
          </h1>
          <p className="text-xs text-text-secondary font-mono mt-0.5">
            Sistemdeki tüm anonim kalibrasyon kullanıcıları ve ilerleme durumları
          </p>
        </div>

        <div className="rounded-2xl bg-surface border border-border/80 overflow-hidden shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border/60 bg-surface-elevated/50 text-[11px] font-mono text-text-muted uppercase">
                  <th className="py-3 px-4">Kullanıcı ID</th>
                  <th className="py-3 px-4">Kayıt Tarihi</th>
                  <th className="py-3 px-4">Son Görülme</th>
                  <th className="py-3 px-4 text-center">Etkileşim</th>
                  <th className="py-3 px-4 text-center">Film DNA</th>
                  <th className="py-3 px-4 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {data.users.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-elevated/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-text-primary">
                      {user.id.slice(0, 13)}...
                    </td>
                    <td className="py-3 px-4 text-text-muted font-mono">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-text-muted font-mono">
                      {new Date(user.lastSeenAt).toLocaleDateString("tr-TR")}
                    </td>
                    <td className="py-3 px-4 text-center font-mono font-semibold text-text-primary">
                      {user.interactionCount}
                    </td>
                    <td className="py-3 px-4 text-center font-mono">
                      {user.hasTasteProfile ? (
                        <span className="px-2 py-0.5 rounded-md bg-accent/15 text-accent text-[10px] font-bold border border-accent/30">
                          HAZIR (%{Math.round(user.confidence * 100)})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted text-[10px] border border-border">
                          EKSİK
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="px-3 py-1.5 rounded-lg bg-surface-elevated hover:bg-border text-text-primary text-[11px] font-mono transition-colors border border-border"
                      >
                        Detay
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

import React from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminMediaManager } from "@/components/admin/AdminMediaManager";
import { getAdminSession } from "@/lib/admin/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminLayout adminEmail={session.email}>
      <AdminMediaManager />
    </AdminLayout>
  );
}

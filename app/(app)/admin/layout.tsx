import { getTranslations } from "next-intl/server";
import { countOpenReports, getAdmin } from "@/lib/admin";
import { AdminTabs } from "./AdminTabs";

// Khung chung của khu quản trị. Việc chặn quyền thật sự nằm ở RLS và ở từng trang, từng server action;
// ở đây chỉ để người không phải quản trị không thấy thanh mục.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  const t = await getTranslations();
  if (!admin) return <p className="card text-muted">{t("admin.forbidden")}</p>;

  const openReports = await countOpenReports(admin.supabase);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <AdminTabs
        label={t("nav.admin")}
        tabs={[
          { href: "/admin/lessons", label: t("admin.tabs.lessons") },
          { href: "/admin/audio", label: t("admin.tabs.audio") },
          { href: "/admin/reports", label: t("admin.tabs.reports"), badge: openReports },
        ]}
      />
      {children}
    </div>
  );
}

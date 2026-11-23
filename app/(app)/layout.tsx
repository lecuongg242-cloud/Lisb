import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { BottomNav, TopNav, type NavItem } from "@/components/AppNav";
import { getProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile();
  const t = await getTranslations();
  const items: NavItem[] = [
    { href: "/", label: t("nav.home") },
    { href: "/course", label: t("nav.course"), match: ["/lesson"] },
    { href: "/review", label: t("nav.review") },
    { href: "/settings", label: t("nav.settings") },
    ...(profile.role === "admin" ? [{ href: "/admin/lessons", label: t("nav.admin"), match: ["/admin"] }] : []),
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-10 border-b border-line bg-page/90 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex flex-col leading-none">
            <span className="text-xl font-bold text-brand">{t("app.name")}</span>
            <span className="mt-1 hidden text-[11px] font-medium tracking-wide text-muted sm:block">{t("app.tagline")}</span>
          </Link>
          <TopNav items={items} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28 sm:pb-12">{children}</main>

      <BottomNav items={items} />
    </div>
  );
}

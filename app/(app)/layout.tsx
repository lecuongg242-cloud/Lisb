import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getProfile } from "@/lib/data";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getProfile();
  const t = await getTranslations();
  const items = [
    { href: "/", label: t("nav.home") },
    { href: "/course", label: t("nav.course") },
    { href: "/review", label: t("nav.review") },
    { href: "/settings", label: t("nav.settings") },
    ...(profile.role === "admin" ? [{ href: "/admin/lessons", label: t("nav.admin") }] : []),
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col">
      <header className="flex items-center justify-between px-4 pt-5 pb-2">
        <Link href="/" className="text-xl font-bold text-brand">
          {t("app.name")}
        </Link>
        <nav className="hidden gap-1 sm:flex" aria-label="Chính">
          {items.map((item) => (
            <Link key={item.href} href={item.href} className="rounded-xl px-3 py-2 text-sm font-medium text-muted hover:bg-line/60 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="flex-1 px-4 pt-3 pb-28 sm:pb-10">{children}</main>

      <nav
        aria-label="Chính"
        className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        {items.map((item) => (
          <Link key={item.href} href={item.href} className="flex min-h-14 flex-1 items-center justify-center px-1 text-center text-xs font-medium text-muted">
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

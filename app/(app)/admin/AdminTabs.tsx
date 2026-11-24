"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type AdminTab = { href: string; label: string; badge?: number };

/** Các mục của khu quản trị: bài học, âm thanh, báo lỗi. */
export function AdminTabs({ tabs, label }: { tabs: AdminTab[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="flex gap-2 overflow-x-auto pb-1">
      {tabs.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold ${active ? "border-brand bg-brand-soft text-brand-dark" : "border-line bg-surface text-muted hover:border-brand"}`}
          >
            {tab.label}
            {!!tab.badge && <span className="rounded-full bg-bad-bg px-2 py-0.5 text-xs font-bold text-bad-text">{tab.badge}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

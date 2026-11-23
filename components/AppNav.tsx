"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavItem = { href: string; label: string; match?: string[] };

function isActive(pathname: string, item: NavItem): boolean {
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) => (p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/")));
}

/** Thanh điều hướng ngang cho màn hình rộng: mục đang mở được gạch chân màu thương hiệu. */
export function TopNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="hidden items-center gap-1 sm:flex" aria-label="Chính">
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative rounded-xl px-3.5 py-2 text-sm font-semibold transition hover:text-ink ${active ? "text-ink" : "text-muted"}`}
          >
            {item.label}
            {active && <span className="absolute inset-x-3.5 -bottom-0.5 h-0.5 rounded-full bg-brand" />}
          </Link>
        );
      })}
    </nav>
  );
}

/** Thanh điều hướng dưới đáy cho điện thoại. */
export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Chính"
      className="fixed inset-x-0 bottom-0 z-10 flex border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
    >
      {items.map((item) => {
        const active = isActive(pathname, item);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`relative flex min-h-14 flex-1 items-center justify-center px-1 text-center text-xs font-semibold ${active ? "text-brand-dark" : "text-muted"}`}
          >
            {active && <span className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-brand" />}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

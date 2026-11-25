"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";

const TABS: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Today", icon: "today" },
  { href: "/plans", label: "Plans", icon: "plans" },
  { href: "/review", label: "Review", icon: "review" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

/** Bottom tab bar on phones (thumb reach), a top bar on wider screens. The + in the middle starts a new plan. */
export function TabBar() {
  return <TabBarFrame path={usePathname()} />;
}

/** The bar itself; the Suspense fallback renders it with no tab marked. */
export function TabBarFrame({ path }: { path: string }) {
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const tab = (t: (typeof TABS)[number]) => (
    <Link
      key={t.href}
      href={t.href}
      aria-current={active(t.href) ? "page" : undefined}
      className={`press flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-xs md:flex-none md:flex-row md:gap-1.5 md:px-2 md:text-sm ${
        active(t.href) ? "font-extrabold text-brand" : "font-semibold text-muted hover:text-ink"
      }`}
    >
      <Icon name={t.icon} className="size-6 md:size-5" />
      {t.label}
    </Link>
  );
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-white pb-[max(env(safe-area-inset-bottom),10px)] md:top-0 md:bottom-auto md:border-t-0 md:border-b md:pb-0"
    >
      <div className="mx-auto flex max-w-xl items-center px-2 pt-1.5 md:h-16 md:justify-between md:px-4 md:pt-0">
        <span className="hidden text-xl font-extrabold tracking-tight text-brand md:inline">Stride</span>
        <div className="flex flex-1 items-center md:flex-none md:gap-1">
          {TABS.slice(0, 2).map(tab)}
          <Link
            href="/new"
            aria-label="Plan something new"
            className="press mx-2 -mt-7 grid size-14 place-items-center rounded-full border-4 border-ground bg-brand text-white hover:bg-brand-deep md:order-last md:mx-0 md:mt-0 md:size-auto md:rounded-xl md:border-0 md:px-4 md:py-2 md:font-extrabold"
          >
            <Icon name="plus" className="size-7 md:hidden" />
            <span className="hidden md:inline">New plan</span>
          </Link>
          {TABS.slice(2).map(tab)}
        </div>
      </div>
    </nav>
  );
}

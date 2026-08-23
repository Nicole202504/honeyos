import {
  ChatCircleIcon,
  HeartIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router-dom";

import { cn } from "../lib/utils";

const navigation = [
  { to: "/", label: "聊天", icon: ChatCircleIcon, end: true },
  { to: "/memories", label: "记得的事", icon: SparkleIcon },
  { to: "/relationship", label: "我们", icon: HeartIcon },
  { to: "/settings", label: "设置", icon: SlidersHorizontalIcon },
];

function DesktopNavigation() {
  return (
    <nav
      className="mt-8 grid gap-1"
      aria-label="主要页面"
    >
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(
            "flex min-h-12 items-center gap-3 rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
            isActive && "bg-[var(--surface-subtle)] text-[var(--foreground)]",
          )}
        >
          <Icon size={21} weight="regular" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

function MobileNavigation() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_94%,transparent)] px-2 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
      aria-label="主要页面"
    >
      {navigation.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) => cn(
            "flex min-h-[4rem] flex-col items-center justify-center gap-1 text-[10px] font-medium text-[var(--foreground-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus)]",
            isActive && "text-[var(--accent)]",
          )}
        >
          <Icon size={22} weight="regular" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="grid min-h-[100dvh] grid-cols-1 bg-[var(--background)] md:grid-cols-[16.5rem_minmax(0,1fr)]">
      <aside className="hidden h-[100dvh] min-w-0 flex-col border-r border-[var(--border)] bg-[var(--surface-raised)] px-4 py-6 md:flex">
        <NavLink
          to="/"
          className="flex min-h-11 items-center px-3 text-[15px] font-semibold tracking-[-0.02em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          HoneyOS
        </NavLink>
        <DesktopNavigation />
        <p className="mt-auto px-3 text-xs leading-5 text-[var(--foreground-faint)]">对话与记忆只保存在这台电脑。</p>
      </aside>

      <main className="h-[100dvh] min-w-0 overflow-y-auto pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
        <Outlet />
      </main>

      <MobileNavigation />
    </div>
  );
}

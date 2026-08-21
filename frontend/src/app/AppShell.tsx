import {
  ChatCircleIcon,
  ClockCounterClockwiseIcon,
  HeartIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { NavLink, Outlet } from "react-router-dom";

import { profilePrefix } from "../api/client";
import { HoneyAvatar } from "../components/honey/HoneyAvatar";
import { cn } from "../lib/utils";
import { useHoneyStore } from "../runtime/honey-store";

const navigation = [
  { to: "/", label: "聊天", icon: ChatCircleIcon, end: true },
  { to: "/memories", label: "记得的事", icon: SparkleIcon },
  { to: "/relationship", label: "我们", icon: HeartIcon },
  { to: "/history", label: "记录", icon: ClockCounterClockwiseIcon },
  { to: "/settings", label: "设置", icon: SlidersHorizontalIcon },
];

function NavigationItems() {
  return navigation.map(({ to, label, icon: Icon, end }) => (
    <NavLink
      key={to}
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-medium text-[var(--foreground-muted)] transition-colors",
          "hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
          isActive && "bg-[var(--surface-raised)] text-[var(--accent)] shadow-[0_8px_24px_rgba(34,36,44,0.08)]",
        )
      }
    >
      <Icon size={22} weight="regular" />
      <span>{label}</span>
    </NavLink>
  ));
}

export function AppShell() {
  const name = useHoneyStore((state) => state.name);
  const status = useHoneyStore((state) => state.status);
  const legacyUrl = `${profilePrefix() || ""}/`;

  return (
    <div className="grid min-h-[100dvh] grid-cols-1 md:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden min-h-[100dvh] border-r border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_86%,transparent)] px-4 py-5 backdrop-blur-xl md:flex md:flex-col">
        <a href={legacyUrl} className="flex min-h-12 items-center gap-3 rounded-xl px-2 text-lg font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]">
          <HoneyAvatar name="HoneyOS" className="size-10" />
          HoneyOS
        </a>
        <div className="mt-8 flex items-center gap-3 px-2">
          <HoneyAvatar name={name} />
          <div className="min-w-0">
            <strong className="block truncate text-sm">{name}</strong>
            <span className="block truncate text-xs text-[var(--foreground-muted)]">{status}</span>
          </div>
        </div>
        <nav className="mt-7 grid gap-1" aria-label="主要页面">
          <NavigationItems />
        </nav>
        <a className="mt-auto rounded-xl px-3 py-3 text-xs leading-5 text-[var(--foreground-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]" href={legacyUrl}>
          返回当前界面
        </a>
      </aside>

      <main className="min-h-[100dvh] min-w-0 overflow-y-auto pb-[calc(84px+env(safe-area-inset-bottom))] md:h-[100dvh] md:pb-0">
        <Outlet />
      </main>

      <nav className="fixed inset-x-3 bottom-[calc(10px+env(safe-area-inset-bottom))] z-20 grid grid-cols-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--surface-raised)_90%,transparent)] p-1 shadow-[0_18px_50px_rgba(25,28,40,0.2)] backdrop-blur-xl md:hidden" aria-label="主要页面">
        {navigation.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 rounded-[var(--radius-md)] text-[10px] font-medium text-[var(--foreground-muted)]",
                isActive && "bg-[var(--surface-subtle)] text-[var(--accent)]",
              )
            }
          >
            <Icon size={21} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

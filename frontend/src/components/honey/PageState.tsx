import { ArrowClockwiseIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "../ui/Button";

export function LoadingState() {
  return (
    <div className="mx-auto grid w-full max-w-3xl gap-4 py-8" aria-label="正在载入">
      <div className="h-24 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />
      <div className="h-36 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />
      <div className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface)]" />
    </div>
  );
}

export function ErrorState() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-col items-start gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-6">
      <WarningCircleIcon size={28} weight="duotone" className="text-[var(--danger)]" />
      <div>
        <h2 className="text-lg font-semibold">暂时没有连上 HoneyOS</h2>
        <p className="mt-1 text-sm leading-6 text-[var(--foreground-muted)]">可以重新载入。如果服务已经停止，请先运行 honeyos restart。</p>
      </div>
      <Button onClick={() => window.location.reload()}>
        <ArrowClockwiseIcon size={18} />
        重新载入
      </Button>
    </div>
  );
}

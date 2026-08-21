import { ChatCircleTextIcon } from "@phosphor-icons/react";

import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { useHoneyStore } from "../../runtime/honey-store";

export function HistoryPage() {
  const { loading, error, history } = useHoneyStore();
  if (loading) return <PageFrame><LoadingState /></PageFrame>;
  if (error) return <PageFrame><ErrorState /></PageFrame>;

  return (
    <PageFrame>
      <PageHeader title="聊天记录" description="换一个聊天窗口，不等于重新认识。" />
      <div className="mt-8 grid gap-3">
        {history.length ? history.map((item) => (
          <article key={item.id} className="flex gap-4 rounded-[var(--radius-lg)] bg-[var(--surface)] p-5">
            <ChatCircleTextIcon size={23} className="mt-0.5 shrink-0 text-[var(--accent)]" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <h2 className="truncate font-semibold">{item.title || "一段聊天"}</h2>
                {item.is_current ? <span className="text-xs font-medium text-[var(--accent)]">当前聊天</span> : null}
              </div>
              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--foreground-muted)]">{item.preview || "没有摘要"}</p>
              <span className="mt-2 block text-xs text-[var(--foreground-faint)]">{item.message_count} 条消息</span>
            </div>
          </article>
        )) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-8 text-sm text-[var(--foreground-muted)]">还没有可以查看的聊天记录。</div>
        )}
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}

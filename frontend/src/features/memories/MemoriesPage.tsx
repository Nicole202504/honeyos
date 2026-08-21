import { BrainIcon } from "@phosphor-icons/react";

import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { useHoneyStore } from "../../runtime/honey-store";

export function MemoriesPage() {
  const { loading, error, memories } = useHoneyStore();
  if (loading) return <PageFrame><LoadingState /></PageFrame>;
  if (error) return <PageFrame><ErrorState /></PageFrame>;

  return (
    <PageFrame>
      <PageHeader title="记得的事" description="共同经历、长期记忆和还要继续做的事情，都按原来的数据读取。" />
      <div className="mt-8 grid gap-3">
        {memories.length ? memories.map((memory) => (
          <article key={memory.id} className="rounded-[var(--radius-lg)] bg-[var(--surface)] p-5">
            <div className="flex items-start gap-4">
              <BrainIcon size={22} className="mt-0.5 shrink-0 text-[var(--accent)]" />
              <div className="min-w-0">
                <p className="break-words text-[15px] leading-7">{memory.content}</p>
                <span className="mt-2 block text-xs text-[var(--foreground-faint)]">{memory.kind}</span>
              </div>
            </div>
          </article>
        )) : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-8">
            <h2 className="font-semibold">还没有留下需要长期记住的事</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">聊天里明确确认过的内容，会出现在这里。</p>
          </div>
        )}
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}

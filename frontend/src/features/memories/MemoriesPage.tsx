import { BrainIcon, CheckIcon, TrashIcon } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { fetchCompanionBootstrap, updateCompanionMemory, type MemoryItem, type RecentChapter } from "../../api/companion";
import { PageHeader } from "../../components/honey/PageHeader";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { Button } from "../../components/ui/Button";
import { cn } from "../../lib/utils";
import { useHoneyStore } from "../../runtime/honey-store";

const filters = [
  { value: "all", label: "全部" },
  { value: "long_term_memory", label: "长期记忆" },
  { value: "recent_chapter", label: "最近" },
  { value: "commitment", label: "答应过的" },
  { value: "episode", label: "共同经历" },
  { value: "open_loop", label: "待续" },
];

const kindNames: Record<string, string> = {
  long_term_memory: "长期记忆",
  temporary_state: "最近状态",
  commitment: "答应过的",
  episode: "共同经历",
  open_loop: "待续",
};

function memoryDate(memory: MemoryItem): string {
  const value = memory.updated_at || memory.created_at;
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(date);
}

export function MemoriesPage() {
  const { loading, error, memories, recentChapters, replaceMemories, replaceRecentChapters, removeMemory } = useHoneyStore();
  const [filter, setFilter] = useState("all");
  const [notice, setNotice] = useState("");
  const memoryRefresh = useQuery({
    queryKey: ["companion", "memories"],
    queryFn: () => fetchCompanionBootstrap(),
    refetchOnMount: "always",
    refetchInterval: 5_000,
    staleTime: 0,
  });
  useEffect(() => {
    if (memoryRefresh.data?.memories) replaceMemories(memoryRefresh.data.memories);
    if (memoryRefresh.data?.recent_chapters) replaceRecentChapters(memoryRefresh.data.recent_chapters);
  }, [memoryRefresh.data, replaceMemories, replaceRecentChapters]);
  const mutation = useMutation({
    mutationFn: ({ memory, action }: { memory: MemoryItem; action: "resolve" | "forget" }) =>
      updateCompanionMemory(memory.id, action),
    onSuccess: (data) => {
      removeMemory(data.id);
      setNotice(data.action === "resolve" ? "已经标记为完成" : "这件事已经忘记了");
    },
    onError: () => setNotice("刚才没有改成功，请再试一次"),
  });
  const visible = useMemo(
    () => filter === "all" ? memories : memories.filter((memory) => memory.kind === filter),
    [filter, memories],
  );
  const visibleChapters = filter === "all" || filter === "recent_chapter" ? recentChapters : [];

  if (loading) return <PageFrame><LoadingState /></PageFrame>;
  if (error) return <PageFrame><ErrorState /></PageFrame>;

  return (
    <PageFrame>
      <PageHeader title="记得的事" description="共同经历、长期记忆和还要继续做的事情，都保存在本机。" />

      <div className="mt-6 flex gap-2 overflow-x-auto pb-2" role="tablist" aria-label="记忆类型">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={filter === item.value}
            onClick={() => setFilter(item.value)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-sm text-[var(--foreground-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]",
              filter === item.value ? "bg-[var(--foreground)] text-[var(--background)]" : "bg-[var(--surface)] hover:text-[var(--foreground)]",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {memoryRefresh.isFetching ? <p className="mt-2 text-xs text-[var(--foreground-faint)]" role="status">正在同步记忆</p> : null}

      {notice ? <p className="mt-3 text-sm text-[var(--foreground-muted)]" role="status">{notice}</p> : null}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {visibleChapters.map((chapter: RecentChapter) => (
          <article key={`recent-${chapter.id}`} className="flex min-h-48 flex-col rounded-[var(--radius-lg)] bg-[var(--surface)] p-5">
            <header className="flex items-center justify-between gap-3 text-xs text-[var(--foreground-faint)]">
              <span className="flex items-center gap-2"><BrainIcon size={17} className="text-[var(--accent)]" />最近</span>
              <span>{memoryDate({ id: chapter.id, kind: "recent_chapter", content: chapter.summary, status: "active", created_at: chapter.created_at })}</span>
            </header>
            <h2 className="mt-5 font-semibold leading-6">{chapter.title}</h2>
            <p className="mt-2 break-words text-[15px] leading-7 text-[var(--foreground-muted)]">{chapter.summary}</p>
          </article>
        ))}
        {visible.length ? visible.map((memory) => (
          <article key={memory.id} className="flex min-h-48 flex-col rounded-[var(--radius-lg)] bg-[var(--surface)] p-5">
            <header className="flex items-center justify-between gap-3 text-xs text-[var(--foreground-faint)]">
              <span className="flex items-center gap-2"><BrainIcon size={17} className="text-[var(--accent)]" />{kindNames[memory.kind] || memory.kind}</span>
              <span>{memoryDate(memory)}</span>
            </header>
            <p className="mt-5 break-words text-[15px] leading-7">{memory.content}</p>
            <div className="mt-auto flex flex-wrap gap-2 pt-5">
              {memory.kind === "open_loop" || memory.kind === "commitment" ? (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate({ memory, action: "resolve" })}
                >
                  <CheckIcon size={16} />已经完成
                </Button>
              ) : null}
              <Button
                type="button"
                variant="ghost"
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ memory, action: "forget" })}
              >
                <TrashIcon size={16} />忘记
              </Button>
            </div>
          </article>
        )) : visibleChapters.length ? null : (
          <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--border-strong)] p-8 sm:col-span-2">
            <h2 className="font-semibold">{filter === "all" ? "还没有留下需要长期记住的事" : "这一类暂时是空的"}</h2>
            <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">{filter === "recent_chapter" ? "每累计 20 条对话，Honey 会在后台整理出一条简短回顾。" : "继续自然地聊天就好，值得留下的内容会慢慢出现在这里。"}</p>
          </div>
        )}
      </div>
    </PageFrame>
  );
}

function PageFrame({ children }: { children: React.ReactNode }) {
  return <section className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-9 sm:py-10">{children}</section>;
}

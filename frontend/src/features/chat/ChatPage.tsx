import { ArrowRightIcon } from "@phosphor-icons/react";

import { profilePrefix } from "../../api/client";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { Button } from "../../components/ui/Button";
import { useHoneyStore } from "../../runtime/honey-store";

export function ChatPage() {
  const { loading, error, messages, name } = useHoneyStore();
  if (loading) return <div className="p-5 sm:p-8"><LoadingState /></div>;
  if (error) return <div className="grid min-h-[100dvh] place-items-center p-5"><ErrorState /></div>;

  const visible = messages.slice(-12);
  return (
    <section className="mx-auto flex min-h-[100dvh] w-full max-w-4xl flex-col px-4 pb-6 pt-5 sm:px-8 sm:pt-8">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] pb-5">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em]">{name}</h1>
          <p className="mt-1 text-sm text-[var(--foreground-muted)]">最近的对话</p>
        </div>
        <Button asChild variant="secondary">
          <a href={`${profilePrefix() || ""}/`}>
            继续聊天
            <ArrowRightIcon size={17} />
          </a>
        </Button>
      </header>

      <div className="flex flex-1 flex-col justify-end gap-5 py-7" aria-label="最近消息">
        {visible.length ? (
          visible.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={message.role === "user" ? "ml-auto max-w-[86%] rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] px-4 py-3 sm:max-w-[72%]" : "max-w-[72ch]"}
            >
              <p className="whitespace-pre-wrap break-words text-[15px] leading-7">{message.content}</p>
            </article>
          ))
        ) : (
          <div className="max-w-md py-12">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">我在</h2>
            <p className="mt-2 leading-7 text-[var(--foreground-muted)]">还没有聊天记录。回到当前界面，说第一句话就好。</p>
          </div>
        )}
      </div>
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--foreground-muted)]">
        新界面的实时聊天链路将在下一步接入。当前版本只读取已有记录，不会改动你的对话。
      </div>
    </section>
  );
}

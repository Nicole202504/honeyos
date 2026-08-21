import { ArrowUpIcon, CircleNotchIcon, StopIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { answerApproval, streamChat } from "../../api/chat";
import { HoneyAvatar } from "../../components/honey/HoneyAvatar";
import { HoneyMessage } from "../../components/honey/HoneyMessage";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { Button } from "../../components/ui/Button";
import type { PermissionChoice } from "../../runtime/honey-events";
import { useHoneyStore } from "../../runtime/honey-store";
import { HoneyRun } from "./HoneyRun";

export function ChatPage() {
  const {
    loading, error, messages, name, status, sessionId, sessionKey, run, sending,
    beginTurn, applyRunEvent, finishTurn, failTurn,
  } = useHoneyStore();
  const [draft, setDraft] = useState("");
  const [approvalPending, setApprovalPending] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const followRef = useRef(true);

  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport && followRef.current) viewport.scrollTop = viewport.scrollHeight;
  }, [messages, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || sending || !sessionId || !sessionKey) return;
    setDraft("");
    followRef.current = true;
    beginTurn(message);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat({ sessionId, sessionKey, message, signal: controller.signal, onEvent: applyRunEvent });
      finishTurn();
    } catch (streamError) {
      if (controller.signal.aborted) failTurn("已停止这次回复");
      else failTurn(streamError instanceof Error ? streamError.message : "chat_unavailable");
    } finally {
      abortRef.current = null;
    }
  }

  async function respondToApproval(choice: PermissionChoice) {
    if (!sessionId || !sessionKey || approvalPending) return;
    setApprovalPending(true);
    try {
      await answerApproval({ sessionId, sessionKey, choice });
      applyRunEvent({ name: "approval.responded", payload: { choice } });
    } catch (approvalError) {
      failTurn(approvalError instanceof Error ? approvalError.message : "approval_unavailable");
    } finally {
      setApprovalPending(false);
    }
  }

  if (loading) return <div className="p-5 sm:p-8"><LoadingState /></div>;
  if (error) return <div className="grid min-h-[100dvh] place-items-center p-5"><ErrorState /></div>;

  const visible = messages.slice(-40);
  return (
    <section className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col px-3 pt-4 sm:px-8 sm:pt-6">
      <header className="flex shrink-0 items-center gap-3 border-b border-[var(--border)] px-1 pb-4">
        <HoneyAvatar name={name} className="size-10 rounded-full" />
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-[-0.02em]">{name}</h1>
          <p className="truncate text-xs text-[var(--foreground-muted)]">{sending ? "正在陪你聊" : status}</p>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 py-6 sm:px-3"
        aria-label="对话"
        onScroll={(event) => {
          const node = event.currentTarget;
          followRef.current = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
        }}
      >
        <div className="flex min-h-full flex-col justify-end gap-6">
        {visible.length ? (
          visible.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={message.role === "user"
                ? "ml-auto max-w-[88%] rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] px-4 py-3 text-[15px] leading-7 sm:max-w-[72%]"
                : "flex max-w-[78ch] items-start gap-3 text-[15px] leading-7"}
            >
              {message.role === "assistant" ? <HoneyAvatar name={name} className="mt-0.5 size-8 rounded-full text-xs" /> : null}
              <HoneyMessage content={message.content} plain={message.role === "user"} />
            </article>
          ))
        ) : (
          <div className="max-w-md py-16">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">我在这儿</h2>
            <p className="mt-2 leading-7 text-[var(--foreground-muted)]">想说什么都可以。</p>
          </div>
        )}
        {run.phase !== "idle" ? (
          <article className="flex max-w-[78ch] items-start gap-3 text-[15px] leading-7">
            <HoneyAvatar name={name} className="mt-0.5 size-8 rounded-full text-xs" />
            <HoneyRun run={run} approvalPending={approvalPending} onAnswer={respondToApproval} />
          </article>
        ) : null}
        </div>
      </div>

      <form className="shrink-0 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2" onSubmit={send}>
        <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-[0_16px_45px_rgba(29,31,40,0.12)] focus-within:ring-2 focus-within:ring-[var(--focus)]">
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={1}
            placeholder={`和${name}说句话`}
            aria-label="消息"
            className="max-h-40 min-h-11 flex-1 resize-none overflow-y-auto bg-transparent px-3 py-2.5 text-[15px] leading-6 outline-none placeholder:text-[var(--foreground-faint)] [field-sizing:content]"
          />
          {sending ? (
            <Button type="button" size="icon" variant="secondary" aria-label="停止回复" onClick={() => abortRef.current?.abort()}>
              <StopIcon size={18} weight="fill" />
            </Button>
          ) : (
            <Button type="submit" size="icon" aria-label="发送" disabled={!draft.trim() || !sessionId || !sessionKey}>
              <ArrowUpIcon size={20} weight="bold" />
            </Button>
          )}
        </div>
        {sending ? <p className="mt-2 flex items-center justify-center gap-2 text-xs text-[var(--foreground-faint)]"><CircleNotchIcon className="animate-spin" />正在回复</p> : null}
      </form>
    </section>
  );
}

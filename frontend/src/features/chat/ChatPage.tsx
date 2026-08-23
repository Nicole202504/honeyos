import { ArrowDownIcon, ArrowUpIcon, ImageIcon, PlusIcon, StopIcon, XIcon } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { answerApproval, streamChat, type ChatInput } from "../../api/chat";
import { startNewCompanionConversation } from "../../api/companion";
import { HoneyAvatar } from "../../components/honey/HoneyAvatar";
import { HoneyMessage } from "../../components/honey/HoneyMessage";
import { ErrorState, LoadingState } from "../../components/honey/PageState";
import { Button } from "../../components/ui/Button";
import type { PermissionChoice } from "../../runtime/honey-events";
import { useHoneyStore } from "../../runtime/honey-store";
import { HoneyRun } from "./HoneyRun";

type ChatAttachment = { id: string; name: string; dataUrl: string };

function AssistantTurn({ name, children, live = false }: { name: string; children: ReactNode; live?: boolean }) {
  return (
    <article className="flex w-full items-start gap-3 text-[15px] leading-7" aria-live={live ? "polite" : undefined}>
      <HoneyAvatar name={name} className="mt-1 size-8 rounded-full text-xs" />
      <div className="min-w-0 flex-1 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface-raised)] px-4 py-4 shadow-[0_8px_24px_rgba(56,48,39,0.05)] sm:px-5">
        {children}
      </div>
    </article>
  );
}

function readChatImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/") || file.size > 15_000_000) {
      reject(new Error("image_invalid"));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("image_unreadable"));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error("image_unreadable"));
      image.onload = () => {
        const maximum = 1024;
        const scale = Math.min(1, maximum / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));
        const context = canvas.getContext("2d");
        if (!context) return reject(new Error("image_unreadable"));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      image.src = String(reader.result || "");
    };
    reader.readAsDataURL(file);
  });
}

function retryInput(display: string): ChatInput {
  const images = [...display.matchAll(/!\[[^\]]*\]\((data:image\/[^)]+)\)/g)].map((match) => match[1]);
  if (!images.length) return display;
  const text = display.replace(/!\[[^\]]*\]\(data:image\/[^)]+\)/g, "").trim();
  return [
    ...(text ? [{ type: "text" as const, text }] : []),
    ...images.map((url) => ({ type: "image_url" as const, image_url: { url, detail: "auto" as const } })),
  ];
}

export function ChatPage() {
  const {
    loading, error, messages, name, status, sessionId, sessionKey, run, sending,
    beginTurn, applyRunEvent, finishTurn, failTurn, startConversation,
  } = useHoneyStore();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [approvalPending, setApprovalPending] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const followRef = useRef(true);
  const newConversation = useMutation({
    mutationFn: startNewCompanionConversation,
    onSuccess: (data) => startConversation(data.session_id, data.session_key),
  });

  useEffect(() => {
    const viewport = scrollRef.current;
    if (viewport && followRef.current) {
      viewport.scrollTop = viewport.scrollHeight;
      setShowScrollButton(false);
    }
  }, [messages, run]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function runMessage(message: string, input: ChatInput = message) {
    if (!message || sending || !sessionId || !sessionKey) return;
    followRef.current = true;
    beginTurn(message);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat({ sessionId, sessionKey, message: input, signal: controller.signal, onEvent: applyRunEvent });
      finishTurn();
    } catch (streamError) {
      if (controller.signal.aborted) failTurn("已停止这次回复");
      else failTurn(streamError instanceof Error ? streamError.message : "chat_unavailable");
    } finally {
      abortRef.current = null;
    }
  }

  function send(event: FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text && !attachments.length) return;
    const message = [text, ...attachments.map((item) => `![${item.name}](${item.dataUrl})`)].filter(Boolean).join("\n\n");
    const input: ChatInput = attachments.length ? [
      ...(text ? [{ type: "text" as const, text }] : []),
      ...attachments.map((item) => ({ type: "image_url" as const, image_url: { url: item.dataUrl, detail: "auto" as const } })),
    ] : text;
    setDraft("");
    setAttachments([]);
    setAttachmentError("");
    void runMessage(message, input);
  }

  async function attachImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []).slice(0, Math.max(0, 4 - attachments.length));
    event.target.value = "";
    if (!files.length) return;
    setAttachmentError("");
    try {
      const next = await Promise.all(files.map(async (file) => ({
        id: `${file.name}-${file.lastModified}-${file.size}`,
        name: file.name,
        dataUrl: await readChatImage(file),
      })));
      setAttachments((current) => [...current, ...next].slice(0, 4));
    } catch {
      setAttachmentError("图片没有读出来，请使用小于 15MB 的常见图片格式");
    }
  }

  function createConversation() {
    if (sending || newConversation.isPending) return;
    if (messages.length && !window.confirm("开启新的聊天？之前的内容和记忆仍会保留。")) return;
    newConversation.mutate();
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
    <section className="flex h-full min-h-0 w-full flex-col bg-[var(--background)] px-3 sm:px-7">
      <header className="mx-auto flex min-h-[4.75rem] w-full max-w-[56rem] shrink-0 items-center gap-3 border-b border-[var(--border)] px-1">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold tracking-[-0.02em]">{name}</h1>
          <p className="truncate text-xs text-[var(--foreground-muted)]">{sending ? "正在陪你聊" : status}</p>
        </div>
        <Button className="ml-auto" type="button" size="icon" variant="ghost" aria-label="开启新的聊天" title="开启新的聊天" disabled={sending || newConversation.isPending} onClick={createConversation}>
          <PlusIcon size={20} />
        </Button>
        <Link
          to="/relationship"
          aria-label={`查看${name}的资料`}
          className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus)]"
        >
          <HoneyAvatar name={name} className="size-10 rounded-full shadow-none" />
        </Link>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="h-full min-h-0 overflow-y-auto overscroll-contain px-1 py-6 sm:px-3"
          aria-label="对话"
          onScroll={(event) => {
            const node = event.currentTarget;
            const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 120;
            followRef.current = nearBottom;
            setShowScrollButton(!nearBottom);
          }}
        >
          <div className="mx-auto flex min-h-full w-full max-w-[56rem] flex-col justify-end gap-5">
        {visible.length ? (
          visible.map((message, index) => (
            message.role === "assistant" ? (
              <AssistantTurn key={`${message.role}-${index}`} name={name}>
                <HoneyMessage
                  content={message.content}
                  role={message.role}
                  messageId={`${message.role}-${index}`}
                />
              </AssistantTurn>
            ) : (
              <article key={`${message.role}-${index}`} className="ml-auto flex max-w-[92%] items-start gap-2 text-[15px] leading-7 sm:max-w-[78%]">
                <div className="min-w-0 rounded-[var(--radius-lg)] bg-[var(--surface-subtle)] px-4 py-3">
                  <HoneyMessage
                    content={message.content}
                    plain={!message.content.includes("data:image/")}
                    role={message.role}
                    messageId={`${message.role}-${index}`}
                  />
                </div>
                <HoneyAvatar name="你" surface="user" className="mt-1 size-8 rounded-full text-xs" />
              </article>
            )
          ))
        ) : (
          <div className="max-w-md py-16 pl-11">
            <h2 className="text-2xl font-semibold tracking-[-0.025em]">我在这儿</h2>
            <p className="mt-2 leading-7 text-[var(--foreground-muted)]">想说什么都可以。</p>
          </div>
        )}
        {run.phase !== "idle" ? (
          <AssistantTurn name={name} live>
            <HoneyRun
              run={run}
              approvalPending={approvalPending}
              onAnswer={respondToApproval}
              onRetry={run.phase === "failed" && visible.at(-1)?.role === "user"
                ? () => void runMessage(visible.at(-1)!.content, retryInput(visible.at(-1)!.content))
                : undefined}
            />
          </AssistantTurn>
        ) : null}
          </div>
        </div>
        {showScrollButton ? (
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute bottom-3 left-1/2 -translate-x-1/2 shadow-[0_8px_24px_rgba(56,48,39,0.12)]"
            aria-label="回到最新消息"
            onClick={() => {
              const node = scrollRef.current;
              if (!node) return;
              followRef.current = true;
              node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
              setShowScrollButton(false);
            }}
          >
            <ArrowDownIcon size={18} />
          </Button>
        ) : null}
      </div>

      <form className="mx-auto w-full max-w-[56rem] shrink-0 pb-[calc(14px+env(safe-area-inset-bottom))] pt-2" onSubmit={send}>
        {attachments.length ? (
          <div className="mb-2 flex gap-2 overflow-x-auto" aria-label="待发送图片">
            {attachments.map((item) => (
              <figure key={item.id} className="relative m-0 size-20 shrink-0 overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)]">
                <img src={item.dataUrl} alt={item.name} className="h-full w-full object-cover" />
                <button type="button" aria-label={`移除 ${item.name}`} onClick={() => setAttachments((current) => current.filter((entry) => entry.id !== item.id))} className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-[#171a21]/80 text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white">
                  <XIcon size={14} />
                </button>
              </figure>
            ))}
          </div>
        ) : null}
        <div className="flex items-end gap-2 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-2 shadow-[0_12px_32px_rgba(56,48,39,0.10)] focus-within:ring-2 focus-within:ring-[var(--focus)]">
          <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" onChange={attachImages} />
          <Button type="button" size="icon" variant="ghost" aria-label="添加图片" disabled={sending || attachments.length >= 4} onClick={() => fileRef.current?.click()}>
            <ImageIcon size={20} />
          </Button>
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
            <Button type="submit" size="icon" aria-label="发送" disabled={(!draft.trim() && !attachments.length) || !sessionId || !sessionKey}>
              <ArrowUpIcon size={20} weight="bold" />
            </Button>
          )}
        </div>
        {attachmentError ? <p className="mt-2 text-center text-xs text-[var(--danger)]" role="alert">{attachmentError}</p> : null}
        {newConversation.isError ? <p className="mt-2 text-center text-xs text-[var(--danger)]" role="alert">刚才没有新建成功，请再试一次</p> : null}
      </form>
    </section>
  );
}

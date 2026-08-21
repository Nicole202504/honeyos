import { CaretDownIcon, CheckIcon, CircleNotchIcon, WarningCircleIcon } from "@phosphor-icons/react";

import { Button } from "../../components/ui/Button";
import { HoneyMessage } from "../../components/honey/HoneyMessage";
import type { HoneyRunState, PermissionChoice, RunPart } from "../../runtime/honey-events";

const choiceLabels: Record<PermissionChoice, string> = {
  once: "好，你继续",
  session: "本次对话都可以",
  always: "以后同类操作都可以",
  deny: "先别动",
};

function ToolPart({ part }: { part: Extract<RunPart, { kind: "tool" }> }) {
  const completed = part.activity.state === "completed";
  const failed = part.activity.state === "failed";
  return (
    <details className="group/tool my-2 border-l-2 border-[var(--border-strong)] pl-4">
      <summary className="flex min-h-10 cursor-pointer list-none items-center gap-3 py-1 text-sm marker:hidden">
        {failed ? <WarningCircleIcon className="text-[var(--danger)]" size={18} /> : completed ? <CheckIcon className="text-[var(--success)]" size={18} /> : <CircleNotchIcon className="animate-spin text-[var(--accent)]" size={18} />}
        <span className="min-w-0 flex-1 font-medium">{part.activity.title || "正在处理"}</span>
        <CaretDownIcon className="text-[var(--foreground-faint)] transition-transform group-open/tool:rotate-180" size={16} />
      </summary>
      <div className="pb-3 pl-8 text-sm leading-6 text-[var(--foreground-muted)]">
        <p>{part.activity.tool_label || "HoneyOS 工具"}</p>
        {part.activity.detail ? <p className="mt-1 break-words">{part.activity.detail}</p> : null}
      </div>
    </details>
  );
}

function PermissionPart({ part, pending, onAnswer }: {
  part: Extract<RunPart, { kind: "approval" }>;
  pending: boolean;
  onAnswer: (choice: PermissionChoice) => void;
}) {
  if (part.status !== "waiting") {
    return <p className="my-3 text-sm text-[var(--foreground-muted)]">{part.status === "denied" ? "这一步没有执行" : "你已确认，正在继续"}</p>;
  }
  return (
    <section className="my-4 rounded-[var(--radius-md)] border border-[var(--border-strong)] bg-[var(--surface-raised)] p-4">
      <h3 className="font-semibold">{part.permission.summary}</h3>
      {part.permission.narration ? <p className="mt-2 text-sm leading-6 text-[var(--foreground-muted)]">{part.permission.narration}</p> : null}
      {part.permission.boundaries.length ? (
        <ul className="mt-3 grid gap-1 pl-5 text-sm leading-6 text-[var(--foreground-muted)]">
          {part.permission.boundaries.map((boundary) => <li key={boundary}>{boundary}</li>)}
        </ul>
      ) : null}
      {part.permission.technical_detail ? (
        <details className="mt-3 text-xs text-[var(--foreground-faint)]">
          <summary className="cursor-pointer">看看具体会做什么</summary>
          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--surface-subtle)] p-3 font-mono">{part.permission.technical_detail}</pre>
        </details>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {part.permission.choices.map((choice) => (
          <Button key={choice} variant={choice === "deny" ? "ghost" : "primary"} disabled={pending} onClick={() => onAnswer(choice)}>
            {choiceLabels[choice]}
          </Button>
        ))}
      </div>
    </section>
  );
}

export function HoneyRun({ run, approvalPending, onAnswer, onRetry }: {
  run: HoneyRunState;
  approvalPending: boolean;
  onAnswer: (choice: PermissionChoice) => void;
  onRetry?: () => void;
}) {
  if (run.phase === "idle") return null;
  return (
    <div className="min-w-0 flex-1">
      {run.presence && !run.parts.length ? (
        <div className="flex items-center gap-2 py-2 text-sm text-[var(--foreground-muted)]">
          <CircleNotchIcon className="animate-spin text-[var(--accent)]" size={18} />
          <span>{run.presence.title || "正在想"}</span>
        </div>
      ) : null}
      {run.parts.map((part) => {
        if (part.kind === "text") return <HoneyMessage key={part.id} content={part.content} />;
        if (part.kind === "tool") return <ToolPart key={part.id} part={part} />;
        return <PermissionPart key={part.id} part={part} pending={approvalPending} onAnswer={onAnswer} />;
      })}
      {run.phase === "failed" ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 text-sm leading-6 text-[var(--danger)]">
          <span className="flex items-start gap-2">
            <WarningCircleIcon className="mt-1 shrink-0" size={18} />
            <span>刚才没有连上，连接恢复后可以直接重试。</span>
          </span>
          {onRetry ? <Button type="button" variant="secondary" onClick={onRetry}>再试一次</Button> : null}
        </div>
      ) : null}
    </div>
  );
}

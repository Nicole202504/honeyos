import type { ReactNode } from "react";
import {
  BookBookmarkIcon,
  BrainIcon,
  BrowserIcon,
  CaretRightIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  DesktopIcon,
  FileTextIcon,
  GlobeIcon,
  ImageIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PuzzlePieceIcon,
  TerminalWindowIcon,
  WarningCircleIcon,
  WrenchIcon,
} from "@phosphor-icons/react";

import { Button } from "../../components/ui/Button";
import { HoneyMessage } from "../../components/honey/HoneyMessage";
import type { HoneyRunState, PermissionChoice, RunPart } from "../../runtime/honey-events";

const choiceLabels: Record<PermissionChoice, string> = {
  once: "好，你继续",
  session: "本次对话都可以",
  always: "以后同类操作都可以",
  deny: "先别动",
};

const toolNames: Record<string, string> = {
  web_search: "网页搜索",
  browser_search: "浏览器搜索",
  web_fetch: "读取网页",
  web_extract: "提取网页内容",
  browser_navigate: "浏览器",
  read_file: "读取文件",
  read_many_files: "读取多个文件",
  write_file: "写入文件",
  edit_file: "修改文件",
  patch: "修改文件",
  terminal: "终端",
  bash: "终端",
  execute_code: "代码执行",
  code_execution: "代码执行",
  image_generate: "图片生成",
  vision_analyze: "图片理解",
  memory: "记忆",
  companion_memory: "伴侣记忆",
  todo: "待办事项",
  todo_write: "待办事项",
  cronjob: "定时任务",
  skills: "能力",
  skills_list: "能力列表",
  skill_view: "能力说明",
  skill_manage: "能力管理",
  skill_marketplace: "能力市场",
  mcp: "外部能力",
  computer_use: "电脑操作",
  tool: "HoneyOS 工具",
};

function ToolIcon({ toolKey, kind, className }: { toolKey: string; kind: string; className?: string }) {
  const props = { size: 19, className, weight: "regular" as const };
  if (["web_search", "browser_search", "x_search", "maps"].includes(toolKey)) return <MagnifyingGlassIcon {...props} />;
  if (["web_fetch", "web_extract"].includes(toolKey)) return <GlobeIcon {...props} />;
  if (toolKey === "browser_navigate") return <BrowserIcon {...props} />;
  if (["read_file", "read_many_files", "vision_analyze", "session_search"].includes(toolKey)) return <FileTextIcon {...props} />;
  if (["write_file", "edit_file", "patch", "document_create"].includes(toolKey)) return <PencilSimpleIcon {...props} />;
  if (["terminal", "bash", "execute_code", "code_execution"].includes(toolKey)) return <TerminalWindowIcon {...props} />;
  if (toolKey === "image_generate") return <ImageIcon {...props} />;
  if (["memory", "companion_memory", "proactive_companion", "memory_get"].includes(toolKey)) return <BookBookmarkIcon {...props} />;
  if (["skills", "skills_list", "skill_view", "skill_manage", "skill_marketplace", "mcp"].includes(toolKey)) return <PuzzlePieceIcon {...props} />;
  if (toolKey === "computer_use") return <DesktopIcon {...props} />;
  if (kind === "checking") return <MagnifyingGlassIcon {...props} />;
  if (kind === "reading") return <FileTextIcon {...props} />;
  if (kind === "making") return <PencilSimpleIcon {...props} />;
  if (kind === "remembering") return <BookBookmarkIcon {...props} />;
  return <WrenchIcon {...props} />;
}

function ToolPart({ part }: { part: Extract<RunPart, { kind: "tool" }> }) {
  const completed = part.activity.state === "completed";
  const failed = part.activity.state === "failed";
  const toolKey = part.activity.tool_key || "tool";
  const toolName = part.activity.tool_label || toolNames[toolKey] || toolNames.tool;
  return (
    <details className="group/tool honey-tool-row">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-3 py-2 text-sm marker:hidden sm:px-3.5">
        <span className={failed ? "text-[var(--danger)]" : completed ? "text-[var(--foreground-faint)]" : "text-[var(--accent)]"}>
          {failed ? <WarningCircleIcon size={18} /> : completed ? <ToolIcon toolKey={toolKey} kind={part.activity.kind} /> : <CircleNotchIcon className="animate-spin" size={18} />}
        </span>
        <span className="min-w-0 flex-1 truncate font-medium text-[var(--foreground-muted)] group-open/tool:text-[var(--foreground)]">{part.activity.title || "正在处理"}</span>
        <span className={failed ? "shrink-0 text-xs text-[var(--danger)]" : "shrink-0 text-xs text-[var(--foreground-faint)]"}>
          {failed ? "未完成" : completed ? "完成" : "进行中"}
        </span>
        <CaretRightIcon className="shrink-0 text-[var(--foreground-faint)] transition-transform group-open/tool:rotate-90" size={15} />
      </summary>
      <div className="mx-3 mb-3 rounded-[var(--radius-sm)] bg-[var(--surface-raised)] px-3 py-2.5 text-xs leading-5 text-[var(--foreground-muted)] sm:mx-3.5">
        <p className="flex items-center gap-2">
          <span>使用 {toolName}</span>
          {toolKey !== "tool" ? <code className="truncate text-[0.75rem] text-[var(--foreground-faint)]">{toolKey}</code> : null}
        </p>
        {part.activity.detail ? <p className="mt-1 break-words">{part.activity.detail}</p> : null}
      </div>
    </details>
  );
}

function ToolTimeline({ parts }: { parts: Extract<RunPart, { kind: "tool" }>[] }) {
  const active = parts.find((part) => !["completed", "failed"].includes(part.activity.state));
  const failed = parts.some((part) => part.activity.state === "failed");
  const latest = active || parts.at(-1);
  return (
    <section className="honey-tool-sequence my-3" aria-label="处理过程">
      <div className="flex items-center gap-2 px-1 pb-1.5 text-xs text-[var(--foreground-faint)]">
        {failed ? <WarningCircleIcon className="text-[var(--danger)]" size={15} /> : active ? <CircleNotchIcon className="animate-spin text-[var(--accent)]" size={15} /> : <CheckCircleIcon className="text-[var(--success)]" size={15} />}
        <span>{active ? `正在处理 ${parts.indexOf(active) + 1}/${parts.length}` : failed ? "有一步没有完成" : parts.length === 1 ? "处理过程" : `处理了 ${parts.length} 步`}</span>
      </div>
      <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-subtle)]">
        {parts.map((part) => <ToolPart key={part.id} part={part} />)}
      </div>
    </section>
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
  const renderedParts: ReactNode[] = [];
  for (let index = 0; index < run.parts.length;) {
    const part = run.parts[index];
    if (part.kind === "tool") {
      const tools: Extract<RunPart, { kind: "tool" }>[] = [];
      while (index < run.parts.length && run.parts[index].kind === "tool") {
        tools.push(run.parts[index] as Extract<RunPart, { kind: "tool" }>);
        index += 1;
      }
      renderedParts.push(<ToolTimeline key={`timeline-${tools[0].id}`} parts={tools} />);
      continue;
    }
    if (part.kind === "text") {
      renderedParts.push(
        <HoneyMessage
          key={part.id}
          content={part.content}
          role="assistant"
          messageId={part.id}
          isStreaming={part.status === "streaming"}
        />,
      );
    }
    else renderedParts.push(<PermissionPart key={part.id} part={part} pending={approvalPending} onAnswer={onAnswer} />);
    index += 1;
  }
  return (
    <div className="min-w-0">
      {run.presence && !run.parts.length ? (
        <div className="flex min-h-9 items-center gap-2 text-sm text-[var(--foreground-muted)]">
          <BrainIcon className="animate-pulse text-[var(--accent)]" size={18} />
          <span className="font-medium">{run.presence.title || "正在想"}</span>
        </div>
      ) : null}
      {renderedParts}
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

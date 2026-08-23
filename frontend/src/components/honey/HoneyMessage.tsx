import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { useState, type ReactNode } from "react";

import { openCompanionProject } from "../../api/companion";
import { HoneyOSMessageFrame } from "../../custom/runtime";

const hiddenImage = "[图片数据已隐藏]";
const hiddenLongData = "[过长的数据已隐藏]";
const hiddenLongLink = "[过长的链接已隐藏]";

export function safeDisplayText(source: string): string {
  return String(source || "")
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=\r\n]{256,}/gi, hiddenImage)
    .replace(/https?:\/\/[^\s]{500,}/gi, hiddenLongLink)
    .replace(/[a-z0-9+/]{512,}={0,2}/gi, hiddenLongData);
}

type MessagePart =
  | { kind: "text"; content: string }
  | { kind: "image"; src: string; alt: string };

const inlineImagePattern = /!\[([^\]\n]{0,160})\]\((data:image\/(?:png|jpe?g|webp|gif);base64,[a-z0-9+/=\r\n]+)\)/gi;

export function extractMessageParts(source: string): MessagePart[] {
  const value = String(source || "");
  const parts: MessagePart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;
  inlineImagePattern.lastIndex = 0;
  while ((match = inlineImagePattern.exec(value))) {
    if (match.index > cursor) parts.push({ kind: "text", content: value.slice(cursor, match.index) });
    const src = match[2];
    if (src.length <= 7_100_000) {
      parts.push({ kind: "image", src, alt: match[1].trim() || "生成的图片" });
    } else {
      parts.push({ kind: "text", content: hiddenImage });
    }
    cursor = inlineImagePattern.lastIndex;
  }
  if (cursor < value.length) parts.push({ kind: "text", content: value.slice(cursor) });
  return parts.length ? parts : [{ kind: "text", content: value }];
}

function LocalProjectLink({ path }: { path: string }) {
  const [status, setStatus] = useState<"idle" | "opening" | "failed">("idle");
  const filename = path.split(/[\\/]/).filter(Boolean).at(-1) || "网页作品";

  async function openProject() {
    setStatus("opening");
    try {
      await openCompanionProject(path);
      setStatus("idle");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <button
      type="button"
      className="honey-local-project-link"
      title={path}
      disabled={status === "opening"}
      onClick={() => void openProject()}
    >
      <ArrowSquareOutIcon size={17} aria-hidden="true" />
      <span>{status === "opening" ? "正在打开" : status === "failed" ? "再试一次" : `打开 ${filename}`}</span>
    </button>
  );
}

function InlineText({ children }: { children: string }) {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*\n]+)\*\*|`([^`\n]+)`|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)|((?:(?:\/Users\/|\/home\/|~\/)[^\n<>]*?|[a-z]:\\[^\n<>]*?)\.(?:html?|htm))(?=$|\s|[，。！？；：、）》】]))/gi;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(children))) {
    if (match.index > cursor) nodes.push(children.slice(cursor, match.index));
    if (match[2] !== undefined) nodes.push(<strong key={match.index}>{match[2]}</strong>);
    else if (match[3] !== undefined) nodes.push(<code key={match.index}>{match[3]}</code>);
    else if (match[5] !== undefined) nodes.push(<a key={match.index} href={match[5]} target="_blank" rel="noreferrer">{match[4]}</a>);
    else nodes.push(<LocalProjectLink key={match.index} path={match[6]} />);
    cursor = pattern.lastIndex;
  }
  if (cursor < children.length) nodes.push(children.slice(cursor));
  return nodes.length ? nodes : children;
}

function RichText({ content }: { content: string }) {
  const safe = safeDisplayText(content).replaceAll("\r\n", "\n");
  const lines = safe.split("\n");
  const blocks: ReactNode[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { index += 1; continue; }
    const codeStart = line.match(/^\s*```/);
    if (codeStart) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !/^\s*```/.test(lines[index])) code.push(lines[index++]);
      if (index < lines.length) index += 1;
      blocks.push(<pre key={`code-${index}`}><code>{code.join("\n")}</code></pre>);
      continue;
    }
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const copy = <InlineText>{heading[2]}</InlineText>;
      blocks.push(level === 1 ? <h2 key={index}>{copy}</h2> : level === 2 ? <h3 key={index}>{copy}</h3> : <h4 key={index}>{copy}</h4>);
      index += 1;
      continue;
    }
    const list = line.match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
    if (list) {
      const ordered = Boolean(list[2]);
      const items: ReactNode[] = [];
      while (index < lines.length) {
        const item = lines[index].match(/^\s*(?:([-+*])|(\d+)\.)\s+(.+)$/);
        if (!item || Boolean(item[2]) !== ordered) break;
        items.push(<li key={index}><InlineText>{item[3]}</InlineText></li>);
        index += 1;
        while (index < lines.length && !lines[index].trim()) index += 1;
      }
      blocks.push(ordered ? <ol key={`list-${index}`}>{items}</ol> : <ul key={`list-${index}`}>{items}</ul>);
      continue;
    }
    const quote = line.match(/^\s*>\s?(.*)$/);
    if (quote) {
      const copy: string[] = [];
      while (index < lines.length) {
        const part = lines[index].match(/^\s*>\s?(.*)$/);
        if (!part) break;
        copy.push(part[1]);
        index += 1;
      }
      blocks.push(<blockquote key={`quote-${index}`}><InlineText>{copy.join(" ")}</InlineText></blockquote>);
      continue;
    }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !/^\s*(?:#{1,3}\s+|```|>|[-+*]\s+|\d+\.\s+)/.test(lines[index])) {
      paragraph.push(lines[index++]);
    }
    blocks.push(<p key={`p-${index}`}><InlineText>{paragraph.join(" ")}</InlineText></p>);
  }
  return <div className="honey-rich-text">{blocks}</div>;
}

function MessageImage({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="honey-message-image">
      <img
        src={src}
        alt={alt}
        className="max-h-[32rem] w-auto max-w-full rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-raised)] object-contain"
        loading="lazy"
        decoding="async"
      />
    </figure>
  );
}

export function HoneyMessage({
  content,
  plain = false,
  role = "assistant",
  messageId,
  isStreaming = false,
}: {
  content: string;
  plain?: boolean;
  role?: "user" | "assistant" | "system";
  messageId?: string;
  isStreaming?: boolean;
}) {
  if (plain) {
    return (
      <HoneyOSMessageFrame role={role} messageId={messageId} isStreaming={isStreaming}>
        <p className="whitespace-pre-wrap break-words">{safeDisplayText(content)}</p>
      </HoneyOSMessageFrame>
    );
  }
  const parts = extractMessageParts(content);
  return (
    <HoneyOSMessageFrame role={role} messageId={messageId} isStreaming={isStreaming}>
      <div className="honey-message-content">
        {parts.map((part, index) => part.kind === "image"
          ? <MessageImage key={`image-${index}`} src={part.src} alt={part.alt} />
          : part.content.trim() ? <RichText key={`text-${index}`} content={part.content} /> : null)}
      </div>
    </HoneyOSMessageFrame>
  );
}

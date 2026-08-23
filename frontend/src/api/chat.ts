import type { HoneyEvent, PermissionChoice } from "../runtime/honey-events";
import { apiPath, fetchWithLocalSessionRecovery } from "./client";

export type ChatInput = string | Array<
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail?: "auto" | "low" | "high" } }
>;

export function parseEventBlock(block: string): HoneyEvent | null {
  let name = "message";
  const data: string[] = [];
  for (const rawLine of block.replaceAll("\r", "").split("\n")) {
    if (rawLine.startsWith("event:")) name = rawLine.slice(6).trim();
    if (rawLine.startsWith("data:")) data.push(rawLine.slice(5).trim());
  }
  if (!data.length) return null;
  try {
    const payload = JSON.parse(data.join("\n"));
    return payload && typeof payload === "object" ? { name, payload } : null;
  } catch {
    return null;
  }
}

async function responseError(response: Response): Promise<Error> {
  let message = "chat_unavailable";
  try {
    const data = await response.json() as { error?: { message?: string }; message?: string };
    message = data.error?.message || data.message || message;
  } catch {
    // A restarting local service may close without a JSON body.
  }
  return new Error(message);
}

export async function streamChat(options: {
  sessionId: string;
  sessionKey: string;
  message: ChatInput;
  signal?: AbortSignal;
  onEvent: (event: HoneyEvent) => void;
}): Promise<void> {
  const response = await fetchWithLocalSessionRecovery(
    apiPath(`/api/sessions/${encodeURIComponent(options.sessionId)}/chat/stream`),
    {
      method: "POST",
      credentials: "same-origin",
      signal: options.signal,
      headers: {
        "Content-Type": "application/json",
        "X-HoneyOS-Session-Key": options.sessionKey,
        "X-HoneyOS-Companion-View": "1",
      },
      body: JSON.stringify({ message: options.message }),
    },
  );
  if (!response.ok || !response.body) throw await responseError(response);

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const blocks = buffer.replaceAll("\r\n", "\n").split("\n\n");
    buffer = blocks.pop() || "";
    for (const block of blocks) {
      const event = parseEventBlock(block);
      if (event) options.onEvent(event);
    }
    if (done) break;
  }
  const trailing = parseEventBlock(buffer);
  if (trailing) options.onEvent(trailing);
}

export async function answerApproval(options: {
  sessionId: string;
  sessionKey: string;
  choice: PermissionChoice;
}): Promise<void> {
  const response = await fetchWithLocalSessionRecovery(
    apiPath(`/api/sessions/${encodeURIComponent(options.sessionId)}/approval`),
    {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-HoneyOS-Session-Key": options.sessionKey },
      body: JSON.stringify({ choice: options.choice }),
    },
  );
  if (!response.ok) throw await responseError(response);
}

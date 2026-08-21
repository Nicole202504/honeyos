import type { ChatMessage } from "../api/companion";
import type { RunPart } from "./honey-events";

export type HoneyAssistantPart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; summary: string; status: "running" | "complete" }
  | { type: "approval"; summary: string; status: "waiting" | "complete" };

export function toAssistantHistory(messages: ChatMessage[]) {
  return messages.map((message, index) => ({
    id: `history-${index}`,
    role: message.role,
    content: [{ type: "text" as const, text: message.content }],
  }));
}

export function toAssistantParts(parts: RunPart[]): HoneyAssistantPart[] {
  return parts.map((part) => {
    if (part.kind === "text") return { type: "text", text: part.content };
    if (part.kind === "tool") {
      return {
        type: "tool-call",
        toolName: part.activity.tool_label || part.activity.kind,
        summary: part.activity.title,
        status: part.activity.state === "completed" ? "complete" : "running",
      };
    }
    return {
      type: "approval",
      summary: part.permission.summary,
      status: part.status === "waiting" ? "waiting" : "complete",
    };
  });
}

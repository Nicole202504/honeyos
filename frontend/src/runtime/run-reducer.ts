import { initialRunState, type HoneyEvent, type HoneyRunState, type RunPart } from "./honey-events";

function replacePart(parts: RunPart[], id: string, update: (part: RunPart) => RunPart): RunPart[] {
  const index = parts.findIndex((part) => part.id === id);
  if (index < 0) return parts;
  const next = [...parts];
  next[index] = update(next[index]);
  return next;
}

export function reduceHoneyRun(state: HoneyRunState, event: HoneyEvent): HoneyRunState {
  switch (event.type) {
    case "run.started":
      return { ...initialRunState, runId: event.runId, phase: "present" };
    case "presence.updated":
      return { ...state, presence: event.message, phase: "present" };
    case "assistant.delta": {
      const existing = state.parts.find((part) => part.id === event.partId);
      const parts = existing
        ? replacePart(state.parts, event.partId, (part) =>
            part.kind === "text" ? { ...part, content: part.content + event.delta } : part,
          )
        : [...state.parts, { id: event.partId, kind: "text" as const, content: event.delta }];
      return { ...state, phase: "responding", parts };
    }
    case "tool.started":
      return {
        ...state,
        phase: "acting",
        parts: [
          ...state.parts,
          { id: event.partId, kind: "tool", name: event.name, summary: event.summary, status: "running" },
        ],
      };
    case "tool.completed":
      return {
        ...state,
        phase: "acting",
        parts: replacePart(state.parts, event.partId, (part) =>
          part.kind === "tool" ? { ...part, summary: event.summary, status: "completed" } : part,
        ),
      };
    case "approval.request":
      return {
        ...state,
        phase: "awaiting_permission",
        parts: [...state.parts, { id: event.partId, kind: "approval", summary: event.summary, status: "waiting" }],
      };
    case "approval.responded":
      return {
        ...state,
        phase: "acting",
        parts: replacePart(state.parts, event.partId, (part) =>
          part.kind === "approval" ? { ...part, status: "completed" } : part,
        ),
      };
    case "run.completed":
      return { ...state, phase: "completed", presence: "" };
    case "error":
      return { ...state, phase: "failed", error: event.message };
  }
}

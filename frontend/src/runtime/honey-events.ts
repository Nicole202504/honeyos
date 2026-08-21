export type HoneyEvent =
  | { type: "run.started"; runId: string }
  | { type: "presence.updated"; message: string }
  | { type: "assistant.delta"; partId: string; delta: string }
  | { type: "tool.started"; partId: string; name: string; summary: string }
  | { type: "tool.completed"; partId: string; summary: string }
  | { type: "approval.request"; partId: string; summary: string }
  | { type: "approval.responded"; partId: string }
  | { type: "run.completed" }
  | { type: "error"; message: string };

export type RunPart =
  | { id: string; kind: "text"; content: string }
  | { id: string; kind: "tool"; name: string; summary: string; status: "running" | "completed" }
  | { id: string; kind: "approval"; summary: string; status: "waiting" | "completed" };

export type RunPhase =
  | "idle"
  | "present"
  | "acting"
  | "responding"
  | "awaiting_permission"
  | "completed"
  | "failed";

export type HoneyRunState = {
  runId: string | null;
  phase: RunPhase;
  presence: string;
  parts: RunPart[];
  error: string | null;
};

export const initialRunState: HoneyRunState = {
  runId: null,
  phase: "idle",
  presence: "",
  parts: [],
  error: null,
};

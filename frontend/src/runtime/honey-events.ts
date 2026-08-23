export type HoneyActivity = {
  activity_id: string;
  kind: string;
  tool_key?: string;
  state: string;
  title: string;
  detail: string;
  tool_label?: string;
};

export type PermissionChoice = "once" | "session" | "always" | "deny";

export type HoneyPermission = {
  approval_id: string;
  narration: string;
  summary: string;
  boundaries: string[];
  technical_detail: string;
  choices: PermissionChoice[];
};

export type HoneyEvent = {
  name: string;
  payload: Record<string, unknown>;
};

export type RunPart =
  | { id: string; kind: "text"; content: string; status: "streaming" | "completed" }
  | { id: string; kind: "tool"; activity: HoneyActivity }
  | {
      id: string;
      kind: "approval";
      permission: HoneyPermission;
      status: "waiting" | "completed" | "denied";
      choice?: PermissionChoice;
    };

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
  content: string;
  presence: HoneyActivity | null;
  parts: RunPart[];
  error: string | null;
};

export const initialRunState: HoneyRunState = {
  runId: null,
  phase: "idle",
  content: "",
  presence: null,
  parts: [],
  error: null,
};

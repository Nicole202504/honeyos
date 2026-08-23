import {
  initialRunState,
  type HoneyActivity,
  type HoneyEvent,
  type HoneyPermission,
  type HoneyRunState,
  type PermissionChoice,
  type RunPart,
} from "./honey-events";

function finishText(parts: RunPart[]): RunPart[] {
  return parts.map((part) =>
    part.kind === "text" && part.status === "streaming"
      ? { ...part, status: "completed" }
      : part,
  );
}

function appendText(parts: RunPart[], delta: string): RunPart[] {
  if (!delta) return parts;
  const last = parts.at(-1);
  if (last?.kind === "text" && last.status === "streaming") {
    return parts.map((part, index) =>
      index === parts.length - 1 && part.kind === "text"
        ? { ...part, content: part.content + delta }
        : part,
    );
  }
  return [
    ...finishText(parts),
    { id: `text-${parts.length + 1}`, kind: "text", content: delta, status: "streaming" },
  ];
}

function normalizeActivity(value: unknown): HoneyActivity | null {
  if (!value || typeof value !== "object") return null;
  const activity = value as Record<string, unknown>;
  return {
    activity_id: String(activity.activity_id || "activity"),
    kind: String(activity.kind || "handling"),
    ...(activity.tool_key ? { tool_key: String(activity.tool_key) } : {}),
    state: String(activity.state || "active"),
    title: String(activity.title || "正在处理"),
    detail: String(activity.detail || ""),
    ...(activity.tool_label ? { tool_label: String(activity.tool_label) } : {}),
  };
}

function upsertTool(parts: RunPart[], activity: HoneyActivity): RunPart[] {
  const id = `tool-${activity.activity_id}`;
  const index = parts.findIndex((part) => part.id === id);
  if (index < 0) return [...finishText(parts), { id, kind: "tool", activity }];
  return parts.map((part, partIndex) =>
    partIndex === index && part.kind === "tool" ? { ...part, activity } : part,
  );
}

function reconcileCompletedMedia(parts: RunPart[], content: string): RunPart[] {
  if (!/!\[[^\]]*\]\(data:image\//i.test(content)) return parts;
  let lastTextIndex = -1;
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    if (parts[index].kind === "text") {
      lastTextIndex = index;
      break;
    }
  }
  if (lastTextIndex < 0) {
    return [...parts, { id: `text-${parts.length + 1}`, kind: "text", content, status: "completed" }];
  }
  return parts.map((part, index) => index === lastTextIndex && part.kind === "text"
    ? { ...part, content, status: "completed" }
    : part);
}

function normalizePermission(payload: Record<string, unknown>): HoneyPermission {
  const allowed = new Set<PermissionChoice>(["once", "session", "always", "deny"]);
  const choices = Array.isArray(payload.choices)
    ? payload.choices.map(String).filter((choice): choice is PermissionChoice => allowed.has(choice as PermissionChoice))
    : ["once", "deny"] satisfies PermissionChoice[];
  return {
    approval_id: String(payload.approval_id || "approval"),
    narration: String(payload.narration || ""),
    summary: String(payload.summary || "需要你确认这一步"),
    boundaries: Array.isArray(payload.boundaries) ? payload.boundaries.map(String) : [],
    technical_detail: String(payload.technical_detail || ""),
    choices,
  };
}

export function reduceHoneyRun(state: HoneyRunState, event: HoneyEvent): HoneyRunState {
  const { name, payload } = event;
  if (name === "run.started") {
    return { ...initialRunState, runId: String(payload.run_id || ""), phase: "present" };
  }
  if (name === "presence.updated" && state.phase !== "responding") {
    return {
      ...state,
      phase: state.parts.some((part) => part.kind === "tool") ? "acting" : "present",
      presence: normalizeActivity(payload.activity),
    };
  }
  if (name.startsWith("tool.")) {
    const activity = normalizeActivity(payload.activity);
    if (!activity) return state;
    return { ...state, phase: "acting", presence: null, parts: upsertTool(state.parts, activity) };
  }
  if (name === "assistant.delta") {
    const delta = String(payload.delta || "");
    return {
      ...state,
      phase: "responding",
      content: state.content + delta,
      presence: null,
      parts: appendText(state.parts, delta),
    };
  }
  if (name === "approval.request") {
    const permission = normalizePermission(payload);
    const id = `permission-${permission.approval_id}`;
    const existing = state.parts.findIndex((part) => part.id === id);
    const part: RunPart = { id, kind: "approval", permission, status: "waiting" };
    const parts = existing < 0
      ? [...finishText(state.parts), part]
      : state.parts.map((current, index) => index === existing ? part : current);
    return { ...state, phase: "awaiting_permission", presence: null, parts };
  }
  if (name === "approval.responded") {
    const choice = String(payload.choice || "") as PermissionChoice;
    return {
      ...state,
      phase: "acting",
      parts: state.parts.map((part) =>
        part.kind === "approval" && part.status === "waiting"
          ? { ...part, status: choice === "deny" ? "denied" : "completed", choice }
          : part,
      ),
    };
  }
  if (name === "assistant.completed") {
    const completedContent = String(payload.content || "");
    const content = state.content || completedContent;
    let parts = finishText(state.parts);
    if (content && !parts.some((part) => part.kind === "text")) {
      parts = finishText(appendText(parts, content));
    }
    if (completedContent) parts = reconcileCompletedMedia(parts, completedContent);
    return { ...state, phase: "completed", content, presence: null, parts };
  }
  if (name === "error") {
    return { ...state, phase: "failed", presence: null, error: String(payload.message || "刚才没有连上") };
  }
  if (name === "run.completed" || name === "done") {
    return {
      ...state,
      phase: state.phase === "failed" ? "failed" : "completed",
      presence: null,
      parts: finishText(state.parts),
    };
  }
  return state;
}

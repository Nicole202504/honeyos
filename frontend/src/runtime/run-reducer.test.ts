import { describe, expect, it } from "vitest";

import { initialRunState } from "./honey-events";
import { reduceHoneyRun } from "./run-reducer";

describe("reduceHoneyRun", () => {
  it("keeps text and tools in event order", () => {
    let state = reduceHoneyRun(initialRunState, { name: "run.started", payload: { run_id: "run-1" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "我先看看。" } });
    state = reduceHoneyRun(state, { name: "tool.started", payload: { activity: { activity_id: "1", kind: "checking", state: "active", title: "正在找相关内容", detail: "" } } });
    state = reduceHoneyRun(state, { name: "tool.completed", payload: { activity: { activity_id: "1", kind: "checking", state: "completed", title: "找到了相关内容", detail: "" } } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "找到了。" } });

    expect(state.parts.map((part) => part.kind)).toEqual(["text", "tool", "text"]);
    expect(state.parts[1]).toMatchObject({ activity: { state: "completed", title: "找到了相关内容" } });
  });

  it("does not create a second text part for a streaming delta", () => {
    let state = reduceHoneyRun(initialRunState, { name: "run.started", payload: { run_id: "run-1" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "你" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "好" } });

    expect(state.parts).toEqual([{ id: "text-1", kind: "text", content: "你好", status: "streaming" }]);
  });

  it("keeps approval at its exact point in the turn", () => {
    let state = reduceHoneyRun(initialRunState, { name: "run.started", payload: { run_id: "run-2" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "我准备改一下。" } });
    state = reduceHoneyRun(state, { name: "approval.request", payload: { approval_id: "ask-1", summary: "允许修改这个文件吗", choices: ["once", "deny"] } });
    state = reduceHoneyRun(state, { name: "approval.responded", payload: { choice: "once" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "已经改好了。" } });

    expect(state.parts.map((part) => part.kind)).toEqual(["text", "approval", "text"]);
    expect(state.parts[1]).toMatchObject({ status: "completed", choice: "once" });
  });

  it("reconciles a completed generated image into the last text position", () => {
    let state = reduceHoneyRun(initialRunState, { name: "run.started", payload: { run_id: "run-image" } });
    state = reduceHoneyRun(state, { name: "assistant.delta", payload: { delta: "给你。MEDIA:/tmp/cat.png" } });
    state = reduceHoneyRun(state, { name: "assistant.completed", payload: { content: "给你。![小猫](data:image/png;base64,aaaa)" } });

    expect(state.parts).toHaveLength(1);
    expect(state.parts[0]).toMatchObject({ kind: "text", content: "给你。![小猫](data:image/png;base64,aaaa)", status: "completed" });
  });
});

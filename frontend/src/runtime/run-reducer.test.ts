import { describe, expect, it } from "vitest";

import { initialRunState } from "./honey-events";
import { reduceHoneyRun } from "./run-reducer";

describe("reduceHoneyRun", () => {
  it("keeps text and tools in event order", () => {
    let state = reduceHoneyRun(initialRunState, { type: "run.started", runId: "run-1" });
    state = reduceHoneyRun(state, { type: "assistant.delta", partId: "text-1", delta: "我先看看。" });
    state = reduceHoneyRun(state, { type: "tool.started", partId: "tool-1", name: "web.search", summary: "正在找相关内容" });
    state = reduceHoneyRun(state, { type: "tool.completed", partId: "tool-1", summary: "找到了相关内容" });
    state = reduceHoneyRun(state, { type: "assistant.delta", partId: "text-2", delta: "找到了。" });

    expect(state.parts.map((part) => part.kind)).toEqual(["text", "tool", "text"]);
    expect(state.parts[1]).toMatchObject({ status: "completed", summary: "找到了相关内容" });
  });

  it("does not create a second text part for a streaming delta", () => {
    let state = reduceHoneyRun(initialRunState, { type: "run.started", runId: "run-1" });
    state = reduceHoneyRun(state, { type: "assistant.delta", partId: "text-1", delta: "你" });
    state = reduceHoneyRun(state, { type: "assistant.delta", partId: "text-1", delta: "好" });

    expect(state.parts).toEqual([{ id: "text-1", kind: "text", content: "你好" }]);
  });
});

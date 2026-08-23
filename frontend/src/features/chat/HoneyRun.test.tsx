import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { HoneyRunState } from "../../runtime/honey-events";
import { HoneyRun } from "./HoneyRun";

describe("HoneyRun", () => {
  it("renders consecutive tools as a plain-language timeline with exact details", () => {
    const run: HoneyRunState = {
      runId: "run-1",
      phase: "acting",
      content: "",
      presence: null,
      error: null,
      parts: [
        {
          id: "tool-1",
          kind: "tool",
          activity: {
            activity_id: "1",
            kind: "checking",
            tool_key: "web_search",
            state: "completed",
            title: "已经找到相关内容了",
            detail: "",
          },
        },
        {
          id: "tool-2",
          kind: "tool",
          activity: {
            activity_id: "2",
            kind: "making",
            tool_key: "image_generate",
            state: "active",
            title: "正在为你生成图片",
            detail: "图片做好后会直接出现在对话里",
          },
        },
      ],
    };

    render(<HoneyRun run={run} approvalPending={false} onAnswer={vi.fn()} />);

    expect(screen.getByRole("region", { name: "处理过程" })).toBeInTheDocument();
    expect(screen.getByText("已经找到相关内容了")).toBeInTheDocument();
    expect(screen.getByText("正在为你生成图片")).toBeInTheDocument();
    expect(screen.getByText("正在处理 2/2")).toBeInTheDocument();
    expect(screen.getByText("web_search")).toBeInTheDocument();
    expect(screen.getByText("image_generate")).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";

import { parseEventBlock } from "./chat";

describe("parseEventBlock", () => {
  it("parses named SSE events", () => {
    expect(parseEventBlock('event: assistant.delta\ndata: {"delta":"你好"}')).toEqual({
      name: "assistant.delta",
      payload: { delta: "你好" },
    });
  });

  it("ignores keepalive comments and invalid data", () => {
    expect(parseEventBlock(": keepalive")).toBeNull();
    expect(parseEventBlock("event: error\ndata: not-json")).toBeNull();
  });
});

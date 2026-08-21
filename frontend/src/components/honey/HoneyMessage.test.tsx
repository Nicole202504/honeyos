import { describe, expect, it } from "vitest";

import { safeDisplayText } from "./HoneyMessage";

describe("safeDisplayText", () => {
  it("hides image data and very long tokens", () => {
    expect(safeDisplayText(`data:image/png;base64,${"a".repeat(600)}`)).toBe("[图片数据已隐藏]");
    expect(safeDisplayText("a".repeat(600))).toBe("[过长的数据已隐藏]");
  });
});

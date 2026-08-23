import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { extractMessageParts, HoneyMessage, safeDisplayText } from "./HoneyMessage";

describe("safeDisplayText", () => {
  it("hides image data and very long tokens", () => {
    expect(safeDisplayText(`data:image/png;base64,${"a".repeat(600)}`)).toBe("[图片数据已隐藏]");
    expect(safeDisplayText("a".repeat(600))).toBe("[过长的数据已隐藏]");
  });

  it("extracts generated images before hiding long data", () => {
    const src = `data:image/png;base64,${"a".repeat(600)}`;
    expect(extractMessageParts(`做好了\n![小猫](${src})`)).toEqual([
      { kind: "text", content: "做好了\n" },
      { kind: "image", src, alt: "小猫" },
    ]);
  });

  it("renders a generated image in the message flow", () => {
    const src = `data:image/png;base64,${"a".repeat(600)}`;
    render(<HoneyMessage content={`给你。\n![小猫](${src})`} />);
    expect(screen.getByText("给你。")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "小猫" })).toHaveAttribute("src", src);
  });
});

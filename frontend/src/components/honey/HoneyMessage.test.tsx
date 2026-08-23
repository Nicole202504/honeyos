import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { extractMessageParts, HoneyMessage, safeDisplayText } from "./HoneyMessage";

describe("safeDisplayText", () => {
  afterEach(() => vi.restoreAllMocks());
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

  it("turns a local HTML project path into a one-click open action", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ opened: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    const path = "/Users/lero/HoneyOS Projects/milk-night.html";

    render(<HoneyMessage content={`做好了：\n\n${path}\n\n打开就能玩。`} />);
    fireEvent.click(screen.getByRole("button", { name: "打开 milk-night.html" }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/companion/projects/open",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ path }),
      }),
    ));
  });
});

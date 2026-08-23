import { describe, expect, it } from "vitest";

import { isHoneyOSCustomUISafeMode } from "./runtime";

describe("HoneyOS custom UI safe mode", () => {
  it("recognizes the safe mode query", () => {
    expect(isHoneyOSCustomUISafeMode("?honeyos-safe-ui=1")).toBe(true);
    expect(isHoneyOSCustomUISafeMode("/new-ui/?honeyos-safe-ui=1#chat")).toBe(true);
  });

  it("keeps the custom layer active by default", () => {
    expect(isHoneyOSCustomUISafeMode("")).toBe(false);
    expect(isHoneyOSCustomUISafeMode("?honeyos-safe-ui=0")).toBe(false);
  });
});

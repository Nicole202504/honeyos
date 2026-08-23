import { afterEach, describe, expect, it, vi } from "vitest";

import { companionIsReady, waitForCompanionReady } from "./companion";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("companion recovery", () => {
  it("reports the local health endpoint as ready", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(companionIsReady()).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith("/health", {
      cache: "no-store",
      credentials: "same-origin",
    });
  });

  it("retries while the local service is restarting", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn()
      .mockRejectedValueOnce(new TypeError("offline"))
      .mockResolvedValueOnce({ ok: true }));

    const result = waitForCompanionReady({ attempts: 2, delayMs: 100, initialDelayMs: 0 });
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe(true);
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  getHoneyAvatarImage,
  HONEYOS_AVATAR_EVENT,
  setHoneyAvatarImage,
} from "./avatar-storage";

describe("Honey avatar storage", () => {
  beforeEach(() => window.localStorage.clear());

  it("keeps compatibility with the original frontend keys", () => {
    setHoneyAvatarImage("companion", "data:image/jpeg;base64,abc");
    expect(window.localStorage.getItem("honeyos-avatar-companion")).toBe("data:image/jpeg;base64,abc");
    expect(getHoneyAvatarImage("companion")).toBe("data:image/jpeg;base64,abc");
  });

  it("notifies mounted avatars and removes the image", () => {
    const listener = vi.fn();
    window.addEventListener(HONEYOS_AVATAR_EVENT, listener);
    setHoneyAvatarImage("user", "data:image/jpeg;base64,abc");
    setHoneyAvatarImage("user", "");
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getHoneyAvatarImage("user")).toBe("");
    window.removeEventListener(HONEYOS_AVATAR_EVENT, listener);
  });
});

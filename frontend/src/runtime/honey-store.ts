import { create } from "zustand";

import type { ChatMessage, CompanionBootstrap, HistoryItem, MemoryItem } from "../api/companion";

type HoneyRuntimeState = {
  loading: boolean;
  error: string | null;
  sessionId: string | null;
  sessionKey: string | null;
  name: string;
  status: string;
  messages: ChatMessage[];
  memories: MemoryItem[];
  history: HistoryItem[];
  profile: CompanionBootstrap["profile_details"];
  summarySettings: CompanionBootstrap["settings"];
  hydrate: (data: CompanionBootstrap) => void;
  fail: (message: string) => void;
};

export const useHoneyStore = create<HoneyRuntimeState>((set) => ({
  loading: true,
  error: null,
  sessionId: null,
  sessionKey: null,
  name: "Honey",
  status: "在这儿",
  messages: [],
  memories: [],
  history: [],
  profile: {},
  summarySettings: {},
  hydrate: (data) =>
    set({
      loading: false,
      error: null,
      sessionId: data.session_id,
      sessionKey: data.session_key,
      name: data.profile.name || data.profile_details.companion_name || "Honey",
      status: data.profile.status || "在这儿",
      messages: data.messages || [],
      memories: data.memories || [],
      history: data.history || [],
      profile: data.profile_details || {},
      summarySettings: data.settings || {},
    }),
  fail: (message) => set({ loading: false, error: message }),
}));

import { create } from "zustand";

import type { ChatMessage, CompanionBootstrap, HistoryItem, MemoryItem } from "../api/companion";
import { initialRunState, type HoneyEvent, type HoneyRunState } from "./honey-events";
import { reduceHoneyRun } from "./run-reducer";

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
  run: HoneyRunState;
  sending: boolean;
  sendError: string | null;
  hydrate: (data: CompanionBootstrap) => void;
  fail: (message: string) => void;
  beginTurn: (message: string) => void;
  applyRunEvent: (event: HoneyEvent) => void;
  finishTurn: () => void;
  failTurn: (message: string) => void;
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
  run: initialRunState,
  sending: false,
  sendError: null,
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
  beginTurn: (message) => set((state) => {
    const priorReply = state.run.parts
      .filter((part) => part.kind === "text")
      .map((part) => part.content)
      .filter(Boolean)
      .join("\n\n") || state.run.content;
    const committed = state.run.phase === "completed" && priorReply
      ? [...state.messages, { role: "assistant" as const, content: priorReply }]
      : state.messages;
    return {
      messages: [...committed, { role: "user", content: message }],
      run: { ...initialRunState, phase: "present" },
      sending: true,
      sendError: null,
    };
  }),
  applyRunEvent: (event) => set((state) => ({ run: reduceHoneyRun(state.run, event) })),
  finishTurn: () => set({ sending: false }),
  failTurn: (message) => set((state) => ({
    sending: false,
    sendError: message,
    run: reduceHoneyRun(state.run, { name: "error", payload: { message } }),
  })),
}));

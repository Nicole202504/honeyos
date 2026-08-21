import { requestJson } from "./client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type MemoryItem = {
  id: string;
  kind: string;
  content: string;
  status: string;
  updated_at?: string | null;
};

export type HistoryItem = {
  id: string;
  title: string;
  preview: string;
  message_count: number;
  is_current: boolean;
};

export type CompanionBootstrap = {
  profile: { name?: string; status?: string };
  profile_details: {
    companion_name?: string;
    personality?: string;
    speaking_style?: string;
    user_nickname?: string;
    relationship?: string;
    boundaries?: string;
  };
  session_id: string;
  session_key: string;
  messages: ChatMessage[];
  memories: MemoryItem[];
  history: HistoryItem[];
  settings: {
    memory_location?: string;
    conversation_model?: string;
    distillation_model?: string;
  };
};

export type CompanionSettings = {
  settings: Record<string, unknown>;
};

export const fetchCompanionBootstrap = () =>
  requestJson<CompanionBootstrap>("/api/companion/bootstrap");

export const fetchCompanionSettings = () =>
  requestJson<CompanionSettings>("/api/companion/settings");

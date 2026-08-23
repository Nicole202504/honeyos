import { apiPath, requestJson } from "./client";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type CompanionProfileDetails = CompanionBootstrap["profile_details"];

export type MemoryItem = {
  id: string;
  kind: string;
  content: string;
  status: string;
  evidence?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  updated_at?: string | null;
};

export type RecentChapter = {
  id: string;
  title: string;
  summary: string;
  source_session_id: string;
  source_message_ids: number[];
  created_at: string;
};

export type HistoryItem = {
  id: string;
  title: string;
  preview: string;
  message_count: number;
  is_current: boolean;
  started_at?: string | null;
  last_active?: string | null;
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
  recent_chapters: RecentChapter[];
  history: HistoryItem[];
  settings: {
    memory_location?: string;
    conversation_model?: string;
    distillation_model?: string;
  };
};

export type EditableCompanionSettings = {
  model: {
    provider: string;
    model: string;
    base_url: string;
    api_key_configured: boolean;
  };
  channels: {
    feishu: { configured: boolean; app_id: string; app_secret_configured: boolean; restart_required: boolean };
    weixin: { configured: boolean; account_id: string; token_configured: boolean; setup_command?: string; restart_required: boolean };
  };
};

export type CompanionSettings = { settings: EditableCompanionSettings };

export const fetchCompanionBootstrap = (signal?: AbortSignal) =>
  requestJson<CompanionBootstrap>("/api/companion/bootstrap", { signal });

export const fetchCompanionSettings = () =>
  requestJson<CompanionSettings>("/api/companion/settings");

export const discoverCompanionModels = (options: { provider: string; base_url: string; api_key?: string }) =>
  requestJson<{ models: string[] }>("/api/companion/settings/models", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

export const saveCompanionModel = (options: { provider: string; base_url: string; model: string; api_key?: string }) =>
  requestJson<{ success: true; settings: EditableCompanionSettings }>("/api/companion/settings/model", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(options),
  });

export const updateCompanionMemory = (memoryId: string, action: "resolve" | "forget") =>
  requestJson<{ success: true; id: string; action: string }>(
    `/api/companion/memories/${encodeURIComponent(memoryId)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    },
  );

export const startNewCompanionConversation = () =>
  requestJson<{ success: true; session_id: string; session_key: string }>("/api/companion/new", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

export const updateCompanionProfile = (profile: CompanionProfileDetails) =>
  requestJson<{ success: true; profile: CompanionProfileDetails }>("/api/companion/profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(profile),
  });

export const getCompanionAvatarStatus = () =>
  requestJson<{ exists: boolean; version: string }>("/api/companion/avatar/status");

export const companionAvatarUrl = (version = "current") =>
  `${apiPath("/api/companion/avatar")}?v=${encodeURIComponent(version)}`;

export const updateCompanionAvatar = (dataUrl: string) =>
  requestJson<{ success: true; version: string }>("/api/companion/avatar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data_url: dataUrl }),
  });

export const deleteCompanionAvatar = () =>
  requestJson<{ success: true }>("/api/companion/avatar", { method: "DELETE" });

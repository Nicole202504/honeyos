import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchCompanionSettings, saveCompanionModel } from "../../api/companion";
import { OnboardingPage } from "./OnboardingPage";

vi.mock("../../api/companion", () => ({
  discoverCompanionModels: vi.fn(),
  fetchCompanionSettings: vi.fn(),
  saveCompanionModel: vi.fn(),
  restartCompanion: vi.fn(),
  waitForCompanionReady: vi.fn(),
}));

vi.mock("../../components/honey/ChannelLinkPanel", () => ({
  ChannelLinkPanel: ({ platform }: { platform: string }) => <div>{platform === "weixin" ? "微信" : "飞书"}</div>,
}));

const emptySettings = {
  settings: {
    model: {
      provider: "openai-api",
      model: "",
      base_url: "https://api.openai.com/v1",
      api_key_configured: false,
    },
    channels: {
      feishu: { configured: false, app_id: "", app_secret_configured: false, restart_required: false },
      weixin: { configured: false, account_id: "", token_configured: false, restart_required: false },
    },
  },
};

function renderOnboarding(entry: string) {
  window.history.replaceState({}, "", entry);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/" element={<p>聊天界面</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(fetchCompanionSettings).mockResolvedValue(emptySettings);
  vi.mocked(saveCompanionModel).mockResolvedValue({
    success: true,
    settings: {
      ...emptySettings.settings,
      model: { ...emptySettings.settings.model, model: "openai/gpt-5", api_key_configured: true },
    },
  });
});

afterEach(() => {
  cleanup();
});

describe("OnboardingPage", () => {
  it("finishes the real setup flow and opens chat", async () => {
    renderOnboarding("/onboarding");

    fireEvent.change(screen.getByPlaceholderText("粘贴 API Key"), { target: { value: "test-key" } });
    fireEvent.change(screen.getByPlaceholderText("例如 provider/model-name"), { target: { value: "openai/gpt-5" } });
    fireEvent.click(screen.getByRole("button", { name: /保存并继续/ }));

    expect(await screen.findByText("想在哪里和它说话？")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "暂时只用网页" }));
    expect(screen.getByText("好了，它在等你")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /开始聊天/ }));
    expect(await screen.findByText("聊天界面")).toBeInTheDocument();
  });

  it("keeps screenshot preview interactive without saving settings", async () => {
    renderOnboarding("/onboarding?preview=model");

    fireEvent.click(screen.getByRole("button", { name: /保存并继续/ }));
    expect(await screen.findByText("想在哪里和它说话？")).toBeInTheDocument();
    expect(saveCompanionModel).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "暂时只用网页" }));
    fireEvent.click(screen.getByRole("button", { name: /开始聊天/ }));
    expect(await screen.findByText("聊天界面")).toBeInTheDocument();
  });
});

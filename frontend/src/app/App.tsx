import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { fetchCompanionSettings } from "../api/companion";
import { ErrorState } from "../components/honey/PageState";
import { HoneyOSCustomUIRoot } from "../custom/runtime";
import { ChatPage } from "../features/chat/ChatPage";
import { MemoriesPage } from "../features/memories/MemoriesPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { RelationshipPage } from "../features/relationship/RelationshipPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AppShell } from "./AppShell";

export function App() {
  const location = useLocation();
  return (
    <HoneyOSCustomUIRoot pathname={location.pathname}>
      <Routes>
        <Route path="onboarding" element={<OnboardingPage />} />
        <Route element={<RequireModelSetup />}>
          <Route element={<AppShell />}>
            <Route index element={<ChatPage />} />
            <Route path="memories" element={<MemoriesPage />} />
            <Route path="relationship" element={<RelationshipPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </HoneyOSCustomUIRoot>
  );
}

function RequireModelSetup() {
  const settings = useQuery({ queryKey: ["companion-settings"], queryFn: fetchCompanionSettings });
  if (settings.isLoading) return <main className="grid min-h-[100dvh] place-items-center bg-[var(--background)] text-sm text-[var(--foreground-muted)]">正在准备 HoneyOS</main>;
  if (settings.isError || !settings.data) return <main className="grid min-h-[100dvh] place-items-center bg-[var(--background)] px-6"><ErrorState /></main>;
  const model = settings.data.settings.model;
  if (!model.model || !model.api_key_configured) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

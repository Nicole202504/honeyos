import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import { ChatPage } from "../features/chat/ChatPage";
import { MemoriesPage } from "../features/memories/MemoriesPage";
import { RelationshipPage } from "../features/relationship/RelationshipPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AppShell } from "./AppShell";
import { HoneyOSCustomUIRoot } from "../custom/runtime";

export function App() {
  const location = useLocation();
  return (
    <HoneyOSCustomUIRoot pathname={location.pathname}>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<ChatPage />} />
          <Route path="memories" element={<MemoriesPage />} />
          <Route path="relationship" element={<RelationshipPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HoneyOSCustomUIRoot>
  );
}

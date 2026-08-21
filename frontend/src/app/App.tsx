import { Navigate, Route, Routes } from "react-router-dom";

import { ChatPage } from "../features/chat/ChatPage";
import { HistoryPage } from "../features/history/HistoryPage";
import { MemoriesPage } from "../features/memories/MemoriesPage";
import { RelationshipPage } from "../features/relationship/RelationshipPage";
import { SettingsPage } from "../features/settings/SettingsPage";
import { AppShell } from "./AppShell";

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<ChatPage />} />
        <Route path="memories" element={<MemoriesPage />} />
        <Route path="relationship" element={<RelationshipPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import { AppProviders } from "./app/providers";
import { profilePrefix } from "./api/client";
import "./design-system/tokens.css";
import "./custom/theme.css";
import { applyHoneyTheme, readHoneyTheme } from "./design-system/theme";

const prefix = profilePrefix();
const basename = window.location.pathname.startsWith(`${prefix}/new-ui`)
  ? `${prefix}/new-ui`
  : prefix || "/";
applyHoneyTheme(readHoneyTheme());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);

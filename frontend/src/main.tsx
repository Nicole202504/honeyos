import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import { App } from "./app/App";
import { AppProviders } from "./app/providers";
import { profilePrefix } from "./api/client";
import "./design-system/tokens.css";

const basename = `${profilePrefix()}/new-ui`;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
);

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import { installBrowserDesktopBridge } from "./dev/installBrowserDesktopBridge";
import { OAuthCallbackPage } from "./features/auth/OAuthCallbackPage";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

installBrowserDesktopBridge();

const isOAuthCallback =
  typeof window !== "undefined" &&
  window.location.pathname.replace(/\/+$/, "") === "/oauth/callback";

createRoot(rootElement).render(
  <StrictMode>
    {isOAuthCallback ? <OAuthCallbackPage /> : <App />}
  </StrictMode>
);

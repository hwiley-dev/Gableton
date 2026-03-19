import { AppRouterProvider } from "./router";
import { RouteRenderer } from "./RouteRenderer";
import { ApiClientProvider } from "../services/api/provider";
import { DesktopBridgeProvider } from "../services/desktop-bridge/provider";

export function App() {
  return (
    <ApiClientProvider>
      <DesktopBridgeProvider>
        <AppRouterProvider>
          <RouteRenderer />
        </AppRouterProvider>
      </DesktopBridgeProvider>
    </ApiClientProvider>
  );
}

import { AppRouterProvider } from "./router";
import { RouteRenderer } from "./RouteRenderer";
import { ApiClientProvider } from "../services/api/provider";
import { DesktopBridgeProvider } from "../services/desktop-bridge/provider";
import { AuthSessionProvider, useAuthSession } from "../services/auth/provider";
import { BootScreen } from "../features/auth/BootScreen";
import { LoginPage } from "../features/auth/LoginPage";

function AuthenticatedApplication() {
  const { status } = useAuthSession();

  if (status === "booting") {
    return <BootScreen />;
  }

  if (status === "signed_out" || status === "signing_in") {
    return <LoginPage />;
  }

  return (
    <ApiClientProvider>
      <AppRouterProvider>
        <RouteRenderer />
      </AppRouterProvider>
    </ApiClientProvider>
  );
}

export function App() {
  return (
    <DesktopBridgeProvider>
      <AuthSessionProvider>
        <AuthenticatedApplication />
      </AuthSessionProvider>
    </DesktopBridgeProvider>
  );
}

import { createContext, useContext, type PropsWithChildren } from "react";
import type { DesktopBridge } from "./types";

const noopBridge: DesktopBridge = {
  async pickFolder() {
    return null;
  },
  async revealInFinder(_path: string) {},
  async openAbletonProject(_path: string) {},
  async watchWorkspace(_path: string) {},
  async getWorkspaceSnapshot(_projectId: string) {
    return {};
  },
  async getEnvironmentDiagnostics(_projectId: string) {
    return {};
  },
  async startLocalScan(_projectId: string) {},
  async applyWorkspaceMutation(_projectId: string, _manifest: unknown) {},
  async detectAbletonOpen(_projectId: string) {
    return false;
  }
};

const DesktopBridgeContext = createContext<DesktopBridge>(noopBridge);

export function DesktopBridgeProvider({ children }: PropsWithChildren) {
  return <DesktopBridgeContext.Provider value={noopBridge}>{children}</DesktopBridgeContext.Provider>;
}

export function useDesktopBridge(): DesktopBridge {
  return useContext(DesktopBridgeContext);
}

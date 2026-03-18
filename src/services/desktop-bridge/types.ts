export interface DesktopBridge {
  pickFolder(): Promise<string | null>;
  revealInFinder(path: string): Promise<void>;
  openAbletonProject(path: string): Promise<void>;
  watchWorkspace(path: string): Promise<void>;
  getWorkspaceSnapshot(projectId: string): Promise<unknown>;
  getEnvironmentDiagnostics(projectId: string): Promise<unknown>;
  startLocalScan(projectId: string): Promise<void>;
  applyWorkspaceMutation(projectId: string, manifest: unknown): Promise<void>;
  detectAbletonOpen(projectId: string): Promise<boolean>;
}

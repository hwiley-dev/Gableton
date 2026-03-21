import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("gabletonRuntimeConfig", {
  apiBaseUrl: process.env.GABLETON_API_BASE_URL || ""
});

contextBridge.exposeInMainWorld("gabletonDesktopBridge", {
  restoreAuthSession: (apiBaseUrl) => ipcRenderer.invoke("gableton:auth:restore-session", apiBaseUrl),
  signIn: (input) => ipcRenderer.invoke("gableton:auth:sign-in", input),
  signOut: (apiBaseUrl) => ipcRenderer.invoke("gableton:auth:sign-out", apiBaseUrl),
  pickFolder: () => ipcRenderer.invoke("gableton:pick-folder"),
  getProjectWorkspace: (projectId) => ipcRenderer.invoke("gableton:get-project-workspace", projectId),
  setProjectWorkspace: (projectId, workspacePath) =>
    ipcRenderer.invoke("gableton:set-project-workspace", projectId, workspacePath),
  revealInFinder: (targetPath) => ipcRenderer.invoke("gableton:reveal-in-finder", targetPath),
  openAbletonProject: (targetPath) => ipcRenderer.invoke("gableton:open-ableton-project", targetPath),
  watchWorkspace: (projectId, targetPath) => ipcRenderer.invoke("gableton:watch-workspace", projectId, targetPath),
  scanWorkspace: (projectId) => ipcRenderer.invoke("gableton:scan-workspace", projectId),
  getWorkspaceSnapshot: (projectId) => ipcRenderer.invoke("gableton:get-workspace-snapshot", projectId),
  getEnvironmentDiagnostics: (projectId) => ipcRenderer.invoke("gableton:get-environment-diagnostics", projectId),
  startLocalScan: (projectId) => ipcRenderer.invoke("gableton:start-local-scan", projectId),
  saveLocalVersion: (input) => ipcRenderer.invoke("gableton:save-local-version", input),
  preparePublish: (input) => ipcRenderer.invoke("gableton:prepare-publish", input),
  uploadPreparedObjects: (projectId, response) =>
    ipcRenderer.invoke("gableton:upload-prepared-objects", projectId, response),
  downloadSignedObjects: (projectId, response) =>
    ipcRenderer.invoke("gableton:download-signed-objects", projectId, response),
  applyWorkspaceMutation: (projectId, manifest) =>
    ipcRenderer.invoke("gableton:apply-workspace-mutation", projectId, manifest),
  detectAbletonOpen: (projectId) => ipcRenderer.invoke("gableton:detect-ableton-open", projectId)
});

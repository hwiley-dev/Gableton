import type {
  CommitPayloadRecord,
  CreatePullRequestRequest,
  FinalizeCommitRequest,
  ManifestRecord,
  ObjectExistenceRequest,
  SignDownloadsResponse,
  SignUploadsResponse,
  StageCommitRequest,
  UploadObjectRequest
} from "../api/types";

export interface SavedLocalVersionRecord {
  id: string;
  message: string;
  notes?: string;
  createdAt: string;
}

export interface BridgeDiagnostic {
  kind: "plugin" | "sample" | "ableton_version" | "workspace";
  severity: "warning" | "blocking";
  message: string;
}

export interface WorkspaceInventory {
  workspacePath: string | null;
  liveSetFiles: number;
  audioFiles: number;
  presetFiles: number;
  sampleFolders: number;
  lastScannedAt?: string;
  diagnostics: BridgeDiagnostic[];
  abletonOpen: boolean;
}

export interface SaveLocalVersionInput {
  projectId: string;
  message: string;
  notes?: string;
  scanRevision: number;
  workspaceSummary: string[];
  environmentSummary: string[];
}

export interface PreparePublishInput {
  projectId: string;
  repoId: string;
  targetLine: string;
  title: string;
  description?: string;
  parentCommitId: string;
  expectedRefHead: string;
  savedVersionId: string;
}

export interface PreparePublishResult {
  existenceRequest: ObjectExistenceRequest;
  uploadObjects: UploadObjectRequest[];
  stageCommitRequest: StageCommitRequest;
  finalizeCommitRequest: FinalizeCommitRequest;
  createPullRequestRequest: CreatePullRequestRequest;
}

export interface DesktopBridge {
  pickFolder(): Promise<string | null>;
  getProjectWorkspace(projectId: string): Promise<string | null>;
  setProjectWorkspace(projectId: string, workspacePath: string): Promise<void>;
  revealInFinder(path: string): Promise<void>;
  openAbletonProject(path: string): Promise<void>;
  watchWorkspace(projectId: string, path: string): Promise<void>;
  scanWorkspace(projectId: string): Promise<WorkspaceInventory>;
  getWorkspaceSnapshot(projectId: string): Promise<unknown>;
  getEnvironmentDiagnostics(projectId: string): Promise<unknown>;
  startLocalScan(projectId: string): Promise<void>;
  saveLocalVersion(input: SaveLocalVersionInput): Promise<SavedLocalVersionRecord>;
  preparePublish(input: PreparePublishInput): Promise<PreparePublishResult>;
  uploadPreparedObjects(projectId: string, response: SignUploadsResponse): Promise<void>;
  downloadSignedObjects(projectId: string, response: SignDownloadsResponse): Promise<void>;
  applyWorkspaceMutation(projectId: string, manifest: unknown): Promise<void>;
  detectAbletonOpen(projectId: string): Promise<boolean>;
}

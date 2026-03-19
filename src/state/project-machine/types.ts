export type ProjectRootState = "booting" | "ready" | "fatal_error";
export type ScanState = "idle" | "scanning" | "scan_failed";
export type LocalVersionState =
  | "clean"
  | "dirty"
  | "save_modal_open"
  | "saving"
  | "saved_unpublished"
  | "save_failed";
export type SyncState =
  | "in_sync"
  | "update_available"
  | "updating"
  | "update_blocked"
  | "update_failed";
export type PublishState =
  | "idle"
  | "preflighting"
  | "publishing"
  | "published_to_branch"
  | "change_request_open"
  | "publish_blocked"
  | "publish_failed";
export type EnvironmentState = "healthy" | "warning" | "blocking";
export type MutationLockState = "unlocked" | "ableton_open" | "filesystem_busy";

export interface EnvironmentIssue {
  id: string;
  kind: "plugin" | "sample" | "ableton_version" | "workspace";
  severity: "warning" | "blocking";
  message: string;
}

export interface WorkspaceSummary {
  tracksChanged: number;
  audioFilesAdded: number;
  automationChanged: boolean;
  samplesMissing: number;
}

export interface ChangeRequestSummary {
  id: string;
  title: string;
  status: "open" | "merged" | "closed";
  approvals: number;
}

export interface ProjectMachineContext {
  workspacePath: string;
  projectId: string;
  projectName: string;
  workspaceName: string;
  activeLine: string;
  workspaceBaseCommitId: string;
  remoteHeadCommitId: string;
  latestSavedLocalVersionId?: string;
  latestPublishedVersionId?: string;
  activeChangeRequestId?: string;
  scanRevision: number;
  hasUnsavedLocalChanges: boolean;
  hasSavedUnpublishedVersion: boolean;
  hasUpdateAvailable: boolean;
  environmentWarnings: EnvironmentIssue[];
  environmentBlocks: EnvironmentIssue[];
  overlapRisk: boolean;
  abletonOpen: boolean;
  workspaceSummary: WorkspaceSummary;
  openChangeRequest?: ChangeRequestSummary;
}

export interface ProjectMachineState {
  root: ProjectRootState;
  scan: ScanState;
  localVersion: LocalVersionState;
  sync: SyncState;
  publish: PublishState;
  environment: EnvironmentState;
  mutationLock: MutationLockState;
  context: ProjectMachineContext;
}

export interface SaveVersionPayload {
  message: string;
  notes?: string;
}

export interface PublishPayload {
  targetLine: string;
  title: string;
  description?: string;
}

export interface ProjectMachineCommands {
  openSaveVersionModal: () => Promise<{ ok: boolean; reason?: string }>;
  cancelSaveVersionModal: () => void;
  confirmSaveVersion: (payload: SaveVersionPayload) => Promise<{ ok: boolean; reason?: string }>;
  startPublish: (payload: PublishPayload) => Promise<{ ok: boolean; reason?: string }>;
  startUpdateProject: () => Promise<{ ok: boolean; reason?: string }>;
  retryScan: () => void;
  openConflictResolution: () => Promise<{ ok: boolean }>;
}

export interface ProjectMachineValue {
  state: ProjectMachineState;
  commands: ProjectMachineCommands;
}

const projectPresets: Record<string, { projectName: string; workspacePath: string; activeLine: string }> = {
  project_neon_horizon: {
    projectName: "Neon Horizon",
    workspacePath: "/Users/example/Music/Neon Horizon",
    activeLine: "maya-bridge-textures"
  },
  project_tape_bloom: {
    projectName: "Tape Bloom",
    workspacePath: "/Users/example/Music/Tape Bloom",
    activeLine: "hunter-tape-pass"
  }
};

export function createInitialProjectMachineState(projectId: string): ProjectMachineState {
  const preset = projectPresets[projectId] ?? {
    projectName: "Untitled Project",
    workspacePath: `/Users/example/Music/${projectId}`,
    activeLine: `${projectId}-workline`
  };

  return {
    root: "ready",
    scan: "idle",
    localVersion: "dirty",
    sync: "update_available",
    publish: "idle",
    environment: "warning",
    mutationLock: "unlocked",
    context: {
      workspacePath: preset.workspacePath,
      projectId,
      projectName: preset.projectName,
      workspaceName: "Studio MacBook",
      activeLine: preset.activeLine,
      workspaceBaseCommitId: "commit:base",
      remoteHeadCommitId: "commit:remote",
      latestSavedLocalVersionId: undefined,
      latestPublishedVersionId: undefined,
      activeChangeRequestId: undefined,
      scanRevision: 1,
      hasUnsavedLocalChanges: true,
      hasSavedUnpublishedVersion: false,
      hasUpdateAvailable: true,
      environmentWarnings: [
        {
          id: "warn_plugin_1",
          kind: "plugin",
          severity: "warning",
          message: "1 plugin is missing on this machine."
        }
      ],
      environmentBlocks: [],
      overlapRisk: false,
      abletonOpen: false,
      workspaceSummary: {
        tracksChanged: 3,
        audioFilesAdded: 2,
        automationChanged: true,
        samplesMissing: 0
      },
      openChangeRequest: {
        id: "cr_1",
        title: "Add bridge synth textures",
        status: "open",
        approvals: 0
      }
    }
  };
}

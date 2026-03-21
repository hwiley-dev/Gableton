import { createContext, useContext, type PropsWithChildren } from "react";
import type { AuthSession, OAuthSignInRequest } from "../auth/types";
import type {
  DesktopBridge,
  PreparePublishInput,
  PreparePublishResult,
  SaveLocalVersionInput,
  SavedLocalVersionRecord,
  WorkspaceInventory
} from "./types";

declare global {
  interface Window {
    gabletonDesktopBridge?: DesktopBridge;
  }
}

function isoNow(): string {
  return new Date().toISOString();
}

function makeHash(seed: string): string {
  return `sha256:${seed.replace(/[^a-zA-Z0-9]+/g, "_").toLowerCase()}`;
}

interface DemoBridgeState {
  authSession?: AuthSession;
  workspacePath: string | null;
  versions: SavedLocalVersionRecord[];
  uploads: Record<string, string>;
  downloads: Record<string, string>;
  lastAppliedManifest?: unknown;
  lastInventory?: WorkspaceInventory;
}

const demoState = new Map<string, DemoBridgeState>();

function readState(projectId: string): DemoBridgeState {
  return (
    demoState.get(projectId) ?? {
      workspacePath: null,
      versions: [],
      uploads: {},
      downloads: {}
    }
  );
}

function writeState(projectId: string, state: DemoBridgeState): DemoBridgeState {
  demoState.set(projectId, state);
  return state;
}

function buildDemoInventory(projectId: string): WorkspaceInventory {
  const state = readState(projectId);
  const workspacePath = state.workspacePath;

  if (!workspacePath) {
    return {
      workspacePath: null,
      liveSetFiles: 0,
      audioFiles: 0,
      presetFiles: 0,
      sampleFolders: 0,
      lastScannedAt: isoNow(),
      diagnostics: [
        {
          kind: "workspace",
          severity: "blocking",
          message: "No Ableton project folder is connected yet."
        }
      ],
      abletonOpen: false
    };
  }

  return {
    workspacePath,
    liveSetFiles: 1,
    audioFiles: 2,
    presetFiles: 1,
    sampleFolders: 1,
    lastScannedAt: isoNow(),
    diagnostics: [
      {
        kind: "plugin",
        severity: "warning",
        message: "1 plugin is missing on this machine."
      }
    ],
    abletonOpen: false
  };
}

const demoBridge: DesktopBridge = {
  async restoreAuthSession(_apiBaseUrl: string) {
    return demoState.get("__auth__")?.authSession ?? null;
  },
  async signIn(input: OAuthSignInRequest) {
    const authSession: AuthSession = {
      user: {
        id: "user_demo_browser_oauth",
        email: input.loginHint || "browser-oauth@gableton.dev",
        displayName: "Browser OAuth User"
      },
      accessToken: `demo_access_${Math.random().toString(36).slice(2, 10)}`,
      accessTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString()
    };
    demoState.set("__auth__", { ...readState("__auth__"), authSession });
    return authSession;
  },
  async signOut(_apiBaseUrl: string) {
    demoState.set("__auth__", { ...readState("__auth__"), authSession: undefined });
  },
  async pickFolder() {
    if (typeof window === "undefined") {
      return null;
    }
    const value = window.prompt("Enter the Ableton project folder path", "/Users/example/Music/Project");
    return value?.trim() ? value.trim() : null;
  },
  async getProjectWorkspace(projectId: string) {
    return readState(projectId).workspacePath;
  },
  async setProjectWorkspace(projectId: string, workspacePath: string) {
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      workspacePath
    });
  },
  async revealInFinder(_path: string) {},
  async openAbletonProject(_path: string) {},
  async watchWorkspace(_projectId: string, _path: string) {},
  async scanWorkspace(projectId: string) {
    const inventory = buildDemoInventory(projectId);
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      lastInventory: inventory
    });
    return inventory;
  },
  async getWorkspaceSnapshot(projectId: string) {
    const inventory = buildDemoInventory(projectId);
    return [
      `Tracks changed: ${inventory.liveSetFiles}`,
      `Audio files added: ${inventory.audioFiles}`,
      `Automation changed: ${inventory.presetFiles > 0 ? "Yes" : "No"}`,
      `Samples missing: ${inventory.sampleFolders > 0 ? 0 : 1}`
    ];
  },
  async getEnvironmentDiagnostics(projectId: string) {
    return buildDemoInventory(projectId).diagnostics.map((item) => item.message);
  },
  async startLocalScan(projectId: string) {
    const inventory = buildDemoInventory(projectId);
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      lastInventory: inventory
    });
  },
  async saveLocalVersion(input: SaveLocalVersionInput) {
    const version: SavedLocalVersionRecord = {
      id: `version_${Math.random().toString(36).slice(2, 10)}`,
      message: input.message,
      notes: input.notes,
      createdAt: isoNow()
    };
    const existing = readState(input.projectId);
    writeState(input.projectId, {
      ...existing,
      versions: [version, ...existing.versions]
    });
    return version;
  },
  async preparePublish(input: PreparePublishInput) {
    const normalizedTitle = input.title.trim() || "Untitled publish";
    const manifestHash = makeHash(`${input.projectId}_${normalizedTitle}_manifest`);
    const commitHash = makeHash(`${input.projectId}_${normalizedTitle}_commit`);
    const manifestPayload = {
      version: 1,
      repoFormat: "gableton-phase1",
      files: [
        {
          path: "Live Set/Main.als",
          blobHash: makeHash(`${input.projectId}_main_als`)
        }
      ]
    };

    const commitPayload = {
      version: 1,
      repoId: input.repoId,
      parentCommitIds: [input.parentCommitId],
      authorUserId: input.authorUserId,
      authorDisplay: input.authorDisplay,
      message: normalizedTitle,
      manifestHash,
      createdClientAt: isoNow(),
      tooling: {
        clientVersion: "0.1.0",
        abletonVersion: "11.2.11"
      }
    };

    const result: PreparePublishResult = {
      existenceRequest: {
        chunkHashes: [],
        blobHashes: [manifestPayload.files[0].blobHash],
        manifestHashes: [manifestHash]
      },
      uploadObjects: [
        {
          hash: manifestPayload.files[0].blobHash,
          objectType: "blob",
          sizeBytes: 1024
        },
        {
          hash: manifestHash,
          objectType: "manifest",
          sizeBytes: 256
        }
      ],
      stageCommitRequest: {
        refName: input.targetLine.toLowerCase(),
        parentCommitId: input.parentCommitId,
        expectedRefHead: input.expectedRefHead,
        commitHash,
        manifestHash
      },
      finalizeCommitRequest: {
        stagedCommitToken: "",
        commitPayload,
        manifestPayload
      },
      createPullRequestRequest: {
        sourceRef: input.targetLine.toLowerCase(),
        targetRef: "main",
        title: normalizedTitle,
        description: input.description ?? ""
      }
    };

    return result;
  },
  async uploadPreparedObjects(projectId: string, _response) {
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      uploads: { ...state.uploads, lastUpload: isoNow() }
    });
  },
  async downloadSignedObjects(projectId: string, _response) {
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      downloads: { ...state.downloads, lastDownload: isoNow() }
    });
  },
  async applyWorkspaceMutation(projectId: string, manifest: unknown) {
    const state = readState(projectId);
    writeState(projectId, {
      ...state,
      lastAppliedManifest: manifest
    });
  },
  async detectAbletonOpen(_projectId: string) {
    return false;
  }
};

const DesktopBridgeContext = createContext<DesktopBridge>(demoBridge);

export function DesktopBridgeProvider({ children }: PropsWithChildren) {
  const bridge =
    typeof window !== "undefined" && window.gabletonDesktopBridge
      ? window.gabletonDesktopBridge
      : demoBridge;

  return <DesktopBridgeContext.Provider value={bridge}>{children}</DesktopBridgeContext.Provider>;
}

export function useDesktopBridge(): DesktopBridge {
  return useContext(DesktopBridgeContext);
}

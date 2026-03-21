import type {
  BridgeDiagnostic,
  DesktopBridge,
  WorkspaceInventory
} from "../services/desktop-bridge/types";
import type { ManifestRecord, SignDownloadsResponse, SignUploadsResponse } from "../services/api/types";

const STORAGE_PREFIX = "gableton:desktop-bridge";

function storageKey(projectId: string): string {
  return `${STORAGE_PREFIX}:${projectId}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

function randomId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function makeHash(seed: string): string {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `sha256:${value.toString(16).padStart(8, "0")}`;
}

interface BrowserBridgeState {
  workspacePath: string | null;
  versions: Array<{
    id: string;
    message: string;
    notes?: string;
    createdAt: string;
    workspaceSummary: string[];
    environmentSummary: string[];
  }>;
  uploads: Record<string, string>;
  downloads: Record<string, string>;
  lastAppliedManifest?: ManifestRecord;
  lastInventory?: WorkspaceInventory;
}

function readState(projectId: string): BrowserBridgeState {
  const raw = window.localStorage.getItem(storageKey(projectId));
  if (!raw) {
    return {
      workspacePath: null,
      versions: [],
      uploads: {},
      downloads: {}
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BrowserBridgeState>;
    return {
      workspacePath: typeof parsed.workspacePath === "string" ? parsed.workspacePath : null,
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
      uploads: parsed.uploads && typeof parsed.uploads === "object" ? parsed.uploads : {},
      downloads: parsed.downloads && typeof parsed.downloads === "object" ? parsed.downloads : {},
      lastAppliedManifest: parsed.lastAppliedManifest,
      lastInventory: parsed.lastInventory
    };
  } catch {
    return {
      workspacePath: null,
      versions: [],
      uploads: {},
      downloads: {}
    };
  }
}

function writeState(projectId: string, state: BrowserBridgeState): void {
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
}

function buildDiagnostics(workspacePath: string | null): BridgeDiagnostic[] {
  if (!workspacePath) {
    return [
      {
        kind: "workspace",
        severity: "blocking",
        message: "No Ableton project folder is connected yet."
      }
    ];
  }

  return [
    {
      kind: "plugin",
      severity: "warning",
      message: "1 plugin is missing on this machine."
    }
  ];
}

function buildInventory(projectId: string): WorkspaceInventory {
  const state = readState(projectId);
  const diagnostics = buildDiagnostics(state.workspacePath);
  if (!state.workspacePath) {
    return {
      workspacePath: null,
      liveSetFiles: 0,
      audioFiles: 0,
      presetFiles: 0,
      sampleFolders: 0,
      lastScannedAt: isoNow(),
      diagnostics,
      abletonOpen: false
    };
  }

  return {
    workspacePath: state.workspacePath,
    liveSetFiles: 1,
    audioFiles: 2,
    presetFiles: 1,
    sampleFolders: 1,
    lastScannedAt: isoNow(),
    diagnostics,
    abletonOpen: false
  };
}

async function uploadObjects(projectId: string, response: SignUploadsResponse): Promise<void> {
  const state = readState(projectId);

  for (const upload of response.uploads) {
    const payload = JSON.stringify({
      projectId,
      hash: upload.hash,
      objectType: upload.objectType,
      uploadedAt: isoNow()
    });

    const requestHeaders = new Headers(upload.headers);
    if (!requestHeaders.has("Content-Type")) {
      requestHeaders.set("Content-Type", "application/octet-stream");
    }

    const result = await fetch(upload.url, {
      method: upload.method,
      headers: requestHeaders,
      body: payload
    });

    if (!result.ok) {
      throw new Error(`Upload failed for ${upload.hash}.`);
    }

    state.uploads[upload.hash] = payload;
  }

  writeState(projectId, state);
}

async function downloadObjects(projectId: string, response: SignDownloadsResponse): Promise<void> {
  const state = readState(projectId);

  for (const download of response.downloads) {
    const result = await fetch(download.url, {
      method: download.method,
      headers: download.headers
    });

    if (!result.ok) {
      throw new Error(`Download failed for ${download.hash}.`);
    }

    state.downloads[download.hash] = await result.text();
  }

  writeState(projectId, state);
}

function createBrowserDesktopBridge(): DesktopBridge {
  return {
    async pickFolder() {
      const value = window.prompt(
        "Enter the Ableton project folder path",
        "/Users/example/Music/Ableton Project"
      );
      return value?.trim() ? value.trim() : null;
    },
    async getProjectWorkspace(projectId: string) {
      return readState(projectId).workspacePath;
    },
    async setProjectWorkspace(projectId: string, workspacePath: string) {
      const state = readState(projectId);
      state.workspacePath = workspacePath;
      writeState(projectId, state);
    },
    async revealInFinder(_path: string) {},
    async openAbletonProject(_path: string) {},
    async watchWorkspace(_projectId: string, _path: string) {},
    async scanWorkspace(projectId: string) {
      const inventory = buildInventory(projectId);
      const state = readState(projectId);
      state.lastInventory = inventory;
      writeState(projectId, state);
      return inventory;
    },
    async getWorkspaceSnapshot(projectId: string) {
      const inventory = buildInventory(projectId);
      return [
        `Tracks changed: ${inventory.liveSetFiles}`,
        `Audio files added: ${inventory.audioFiles}`,
        `Automation changed: ${inventory.presetFiles > 0 ? "Yes" : "No"}`,
        `Samples missing: ${inventory.sampleFolders > 0 ? 0 : 1}`
      ];
    },
    async getEnvironmentDiagnostics(projectId: string) {
      return buildInventory(projectId).diagnostics.map((item) => item.message);
    },
    async startLocalScan(projectId: string) {
      const inventory = buildInventory(projectId);
      const state = readState(projectId);
      state.lastInventory = inventory;
      writeState(projectId, state);
    },
    async saveLocalVersion(input) {
      const state = readState(input.projectId);
      const version = {
        id: randomId("version"),
        message: input.message,
        notes: input.notes,
        createdAt: isoNow(),
        workspaceSummary: input.workspaceSummary,
        environmentSummary: input.environmentSummary
      };
      state.versions.unshift(version);
      writeState(input.projectId, state);
      return version;
    },
    async preparePublish(input) {
      const state = readState(input.projectId);
      const savedVersion = state.versions.find((item) => item.id === input.savedVersionId) ?? state.versions[0];
      const manifestHash = makeHash(`${input.projectId}:${input.savedVersionId}:manifest`);
      const commitHash = makeHash(`${input.projectId}:${input.savedVersionId}:commit`);
      const blobHash = makeHash(`${input.projectId}:${input.savedVersionId}:main-als`);
      const title = input.title.trim() || savedVersion?.message || "Untitled publish";

      return {
        existenceRequest: {
          chunkHashes: [],
          blobHashes: [blobHash],
          manifestHashes: [manifestHash]
        },
        uploadObjects: [
          {
            hash: blobHash,
            objectType: "blob",
            sizeBytes: 2048
          },
          {
            hash: manifestHash,
            objectType: "manifest",
            sizeBytes: 512
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
          commitPayload: {
            version: 1,
            repoId: input.repoId,
            parentCommitIds: [input.parentCommitId],
            authorUserId: "current_user",
            authorDisplay: "Current User",
            message: title,
            manifestHash,
            createdClientAt: isoNow(),
            tooling: {
              clientVersion: "0.1.0",
              abletonVersion: "11.2.11"
            }
          },
          manifestPayload: {
            version: 1,
            repoFormat: "gableton-phase1",
            files: [
              {
                path: "Live Set/Main.als",
                blobHash
              }
            ]
          }
        },
        createPullRequestRequest: {
          sourceRef: input.targetLine.toLowerCase(),
          targetRef: "main",
          title,
          description: input.description ?? ""
        }
      };
    },
    async uploadPreparedObjects(projectId: string, response: SignUploadsResponse) {
      await uploadObjects(projectId, response);
    },
    async downloadSignedObjects(projectId: string, response: SignDownloadsResponse) {
      await downloadObjects(projectId, response);
    },
    async applyWorkspaceMutation(projectId: string, manifest: ManifestRecord) {
      const state = readState(projectId);
      state.lastAppliedManifest = manifest;
      writeState(projectId, state);
    },
    async detectAbletonOpen(_projectId: string) {
      return false;
    }
  };
}

export function installBrowserDesktopBridge(): void {
  if (typeof window === "undefined") {
    return;
  }

  if (!window.gabletonDesktopBridge) {
    window.gabletonDesktopBridge = createBrowserDesktopBridge();
  }
}

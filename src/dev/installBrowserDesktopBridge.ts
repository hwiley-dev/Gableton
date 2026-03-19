import type { DesktopBridge } from "../services/desktop-bridge/types";
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
}

function readState(projectId: string): BrowserBridgeState {
  const raw = window.localStorage.getItem(storageKey(projectId));
  if (!raw) {
    return {
      versions: [],
      uploads: {},
      downloads: {}
    };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<BrowserBridgeState>;
    return {
      versions: Array.isArray(parsed.versions) ? parsed.versions : [],
      uploads: parsed.uploads && typeof parsed.uploads === "object" ? parsed.uploads : {},
      downloads: parsed.downloads && typeof parsed.downloads === "object" ? parsed.downloads : {},
      lastAppliedManifest: parsed.lastAppliedManifest
    };
  } catch {
    return {
      versions: [],
      uploads: {},
      downloads: {}
    };
  }
}

function writeState(projectId: string, state: BrowserBridgeState): void {
  window.localStorage.setItem(storageKey(projectId), JSON.stringify(state));
}

function latestVersionSummary(projectId: string): string[] {
  const state = readState(projectId);
  return (
    state.versions[0]?.workspaceSummary ?? [
      "Tracks changed: 3",
      "Audio files added: 2",
      "Automation changed: Yes",
      "Samples missing: 0"
    ]
  );
}

function latestEnvironmentSummary(projectId: string): string[] {
  const state = readState(projectId);
  return state.versions[0]?.environmentSummary ?? ["1 plugin is missing on this machine."];
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
      return null;
    },
    async revealInFinder(_path: string) {},
    async openAbletonProject(_path: string) {},
    async watchWorkspace(_path: string) {},
    async getWorkspaceSnapshot(projectId: string) {
      return latestVersionSummary(projectId);
    },
    async getEnvironmentDiagnostics(projectId: string) {
      return latestEnvironmentSummary(projectId);
    },
    async startLocalScan(_projectId: string) {},
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
                path: `${input.projectId}/Live Set/Main.als`,
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

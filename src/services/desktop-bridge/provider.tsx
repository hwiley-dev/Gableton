import { createContext, useContext, type PropsWithChildren } from "react";
import type {
  DesktopBridge,
  PreparePublishInput,
  PreparePublishResult,
  SaveLocalVersionInput,
  SavedLocalVersionRecord
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

const localVersions = new Map<string, SavedLocalVersionRecord[]>();

const demoBridge: DesktopBridge = {
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
  async saveLocalVersion(input: SaveLocalVersionInput) {
    const version: SavedLocalVersionRecord = {
      id: `version_${Math.random().toString(36).slice(2, 10)}`,
      message: input.message,
      notes: input.notes,
      createdAt: isoNow()
    };
    const existing = localVersions.get(input.projectId) ?? [];
    localVersions.set(input.projectId, [version, ...existing]);
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
          path: `${input.projectId}/Live Set/Main.als`,
          blobHash: makeHash(`${input.projectId}_main_als`)
        }
      ]
    };

    const commitPayload = {
      version: 1,
      repoId: input.repoId,
      parentCommitIds: [input.parentCommitId],
      authorUserId: "current_user",
      authorDisplay: "Current User",
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
  async uploadPreparedObjects(_projectId: string, _response) {},
  async downloadSignedObjects(_projectId: string, _response) {},
  async applyWorkspaceMutation(_projectId: string, _manifest: unknown) {},
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

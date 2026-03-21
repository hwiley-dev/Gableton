import type { AuthSession, OAuthSignInRequest } from "../services/auth/types";
import type {
  BridgeDiagnostic,
  DesktopBridge,
  WorkspaceInventory
} from "../services/desktop-bridge/types";
import type { ManifestRecord, SignDownloadsResponse, SignUploadsResponse } from "../services/api/types";

const STORAGE_PREFIX = "gableton:desktop-bridge";
const AUTH_STORAGE_KEY = `${STORAGE_PREFIX}:auth`;

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

interface StoredAuthSession {
  apiBaseUrl: string;
  authSession: AuthSession;
  refreshToken: string;
}

function createRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

function toBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const value of bytes) {
    binary += String.fromCharCode(value);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function createPkcePair(): Promise<{ verifier: string; challenge: string }> {
  const verifier = createRandomString(48);
  const encoded = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return {
    verifier,
    challenge: toBase64Url(digest)
  };
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

function readStoredAuthSession(): StoredAuthSession | null {
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredAuthSession>;
    if (
      typeof parsed.apiBaseUrl === "string" &&
      parsed.authSession &&
      typeof parsed.refreshToken === "string"
    ) {
      return parsed as StoredAuthSession;
    }
  } catch {
    return null;
  }

  return null;
}

function writeStoredAuthSession(session: StoredAuthSession): void {
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

function clearStoredAuthSession(): void {
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function readJsonResponse(response: Response): Promise<Record<string, unknown>> {
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : `Auth request failed with status ${response.status}.`;
    throw new Error(message);
  }
  return payload;
}

function mapAuthSession(payload: Record<string, unknown>): {
  session: AuthSession;
  refreshToken: string;
} {
  const user = payload.user as Record<string, unknown> | undefined;
  const refreshToken = typeof payload.refresh_token === "string" ? payload.refresh_token : "";

  return {
    session: {
      user: {
        id: typeof user?.id === "string" ? user.id : "unknown_user",
        email: typeof user?.email === "string" ? user.email : "",
        displayName:
          typeof user?.display_name === "string"
            ? user.display_name
            : typeof user?.displayName === "string"
              ? user.displayName
              : "Unknown User"
      },
      accessToken: typeof payload.access_token === "string" ? payload.access_token : "",
      accessTokenExpiresAt:
        typeof payload.expires_at === "string"
          ? payload.expires_at
          : new Date(Date.now() + 60 * 60 * 1000).toISOString()
    },
    refreshToken
  };
}

async function waitForPopupCallback(expectedState: string, popupWindow: Window): Promise<string> {
  return await new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Browser sign-in timed out."));
    }, 3 * 60 * 1000);

    const closeWatcher = window.setInterval(() => {
      if (popupWindow.closed) {
        cleanup();
        reject(new Error("Browser sign-in was cancelled."));
      }
    }, 400);

    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }

      const payload =
        event.data && typeof event.data === "object"
          ? (event.data as Record<string, unknown>)
          : undefined;
      if (payload?.type !== "gableton-oauth-callback") {
        return;
      }

      cleanup();

      if (typeof payload.error === "string" && payload.error) {
        reject(new Error(payload.error));
        return;
      }

      if (payload.state !== expectedState || typeof payload.code !== "string") {
        reject(new Error("Browser OAuth callback validation failed."));
        return;
      }

      resolve(payload.code);
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      window.clearInterval(closeWatcher);
      window.removeEventListener("message", onMessage);
      popupWindow.close();
    };

    window.addEventListener("message", onMessage);
  });
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
    async restoreAuthSession(apiBaseUrl: string) {
      const stored = readStoredAuthSession();
      if (!stored || stored.apiBaseUrl !== apiBaseUrl) {
        return null;
      }

      const response = await fetch(`${apiBaseUrl}/v1/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: stored.refreshToken })
      });
      const payload = await readJsonResponse(response);
      const refreshed = mapAuthSession(payload);
      writeStoredAuthSession({
        apiBaseUrl,
        authSession: refreshed.session,
        refreshToken: refreshed.refreshToken
      });
      return refreshed.session;
    },
    async signIn(input: OAuthSignInRequest) {
      const state = createRandomString(24);
      const pkce = await createPkcePair();
      const redirectUri = `${window.location.origin}/oauth/callback`;
      const authorizeUrl = new URL(`${input.apiBaseUrl}/v1/oauth/authorize`);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("client_id", "gableton-desktop");
      authorizeUrl.searchParams.set("redirect_uri", redirectUri);
      authorizeUrl.searchParams.set("state", state);
      authorizeUrl.searchParams.set("code_challenge", pkce.challenge);
      authorizeUrl.searchParams.set("code_challenge_method", "S256");
      if (input.loginHint) {
        authorizeUrl.searchParams.set("login_hint", input.loginHint);
      }

      const popupWindow = window.open(
        authorizeUrl.toString(),
        "gableton-oauth",
        "popup=yes,width=560,height=760"
      );
      if (!popupWindow) {
        throw new Error("Browser sign-in popup could not be opened.");
      }

      const code = await waitForPopupCallback(state, popupWindow);
      const response = await fetch(`${input.apiBaseUrl}/v1/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          code_verifier: pkce.verifier,
          client_id: "gableton-desktop"
        })
      });
      const payload = await readJsonResponse(response);
      const signedIn = mapAuthSession(payload);
      writeStoredAuthSession({
        apiBaseUrl: input.apiBaseUrl,
        authSession: signedIn.session,
        refreshToken: signedIn.refreshToken
      });
      return signedIn.session;
    },
    async signOut(apiBaseUrl: string) {
      const stored = readStoredAuthSession();
      if (stored && stored.apiBaseUrl === apiBaseUrl) {
        await fetch(`${apiBaseUrl}/v1/auth/logout`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: stored.refreshToken })
        }).catch(() => undefined);
      }
      clearStoredAuthSession();
    },
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
            authorUserId: input.authorUserId,
            authorDisplay: input.authorDisplay,
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

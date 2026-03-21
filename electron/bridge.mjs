import { app, dialog, ipcMain, shell } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const DEFAULT_WORKSPACE_SUMMARY = [
  "Tracks changed: 3",
  "Audio files added: 2",
  "Automation changed: Yes",
  "Samples missing: 0"
];
const DEFAULT_ENVIRONMENT_SUMMARY = ["1 plugin is missing on this machine."];
const BRIDGE_STATE_FILENAME = "bridge-state.json";

function makeHash(seed) {
  let value = 0;
  for (let index = 0; index < seed.length; index += 1) {
    value = (value * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return `sha256:${value.toString(16).padStart(8, "0")}`;
}

function isoNow() {
  return new Date().toISOString();
}

function randomId(prefix) {
  return `${prefix}_${randomUUID()}`;
}

function defaultBridgeState() {
  return { projects: {} };
}

function defaultProjectState() {
  return {
    versions: [],
    uploads: {},
    downloads: {},
    lastAppliedManifest: null
  };
}

function stateFilePath() {
  return path.join(app.getPath("userData"), BRIDGE_STATE_FILENAME);
}

async function readBridgeState() {
  try {
    const raw = await readFile(stateFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return defaultBridgeState();
    }
    return {
      projects: parsed.projects && typeof parsed.projects === "object" ? parsed.projects : {}
    };
  } catch {
    return defaultBridgeState();
  }
}

async function writeBridgeState(state) {
  const targetPath = stateFilePath();
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, JSON.stringify(state, null, 2), "utf8");
}

async function updateProjectState(projectId, mutator) {
  const state = await readBridgeState();
  const projectState = state.projects[projectId] ?? defaultProjectState();
  const nextProjectState = await mutator(projectState);
  state.projects[projectId] = nextProjectState;
  await writeBridgeState(state);
  return nextProjectState;
}

async function getProjectState(projectId) {
  const state = await readBridgeState();
  return state.projects[projectId] ?? defaultProjectState();
}

async function uploadPreparedObjects(projectId, response) {
  await updateProjectState(projectId, async (projectState) => {
    const nextState = {
      ...projectState,
      uploads: { ...projectState.uploads }
    };

    for (const upload of response.uploads) {
      const payload = JSON.stringify({
        projectId,
        hash: upload.hash,
        objectType: upload.objectType,
        uploadedAt: isoNow()
      });
      const headers = {
        "Content-Type": "application/octet-stream",
        ...(upload.headers || {})
      };
      const result = await fetch(upload.url, {
        method: upload.method,
        headers,
        body: payload
      });
      if (!result.ok) {
        throw new Error(`Upload failed for ${upload.hash}.`);
      }
      nextState.uploads[upload.hash] = payload;
    }

    return nextState;
  });
}

async function downloadSignedObjects(projectId, response) {
  await updateProjectState(projectId, async (projectState) => {
    const nextState = {
      ...projectState,
      downloads: { ...projectState.downloads }
    };

    for (const download of response.downloads) {
      const result = await fetch(download.url, {
        method: download.method,
        headers: download.headers || {}
      });
      if (!result.ok) {
        throw new Error(`Download failed for ${download.hash}.`);
      }
      nextState.downloads[download.hash] = await result.text();
    }

    return nextState;
  });
}

export function registerBridgeHandlers() {
  ipcMain.handle("gableton:pick-folder", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Choose Ableton Project Folder"
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return result.filePaths[0];
  });

  ipcMain.handle("gableton:reveal-in-finder", async (_event, targetPath) => {
    shell.showItemInFolder(targetPath);
  });

  ipcMain.handle("gableton:open-ableton-project", async (_event, targetPath) => {
    await shell.openPath(targetPath);
  });

  ipcMain.handle("gableton:watch-workspace", async () => {});

  ipcMain.handle("gableton:get-workspace-snapshot", async (_event, projectId) => {
    const projectState = await getProjectState(projectId);
    return projectState.versions[0]?.workspaceSummary ?? DEFAULT_WORKSPACE_SUMMARY;
  });

  ipcMain.handle("gableton:get-environment-diagnostics", async (_event, projectId) => {
    const projectState = await getProjectState(projectId);
    return projectState.versions[0]?.environmentSummary ?? DEFAULT_ENVIRONMENT_SUMMARY;
  });

  ipcMain.handle("gableton:start-local-scan", async () => {});

  ipcMain.handle("gableton:save-local-version", async (_event, input) => {
    const version = {
      id: randomId("version"),
      message: input.message,
      notes: input.notes,
      createdAt: isoNow(),
      workspaceSummary: input.workspaceSummary,
      environmentSummary: input.environmentSummary
    };

    await updateProjectState(input.projectId, async (projectState) => ({
      ...projectState,
      versions: [version, ...projectState.versions]
    }));

    return version;
  });

  ipcMain.handle("gableton:prepare-publish", async (_event, input) => {
    const projectState = await getProjectState(input.projectId);
    const savedVersion =
      projectState.versions.find((item) => item.id === input.savedVersionId) ?? projectState.versions[0];
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
  });

  ipcMain.handle("gableton:upload-prepared-objects", async (_event, projectId, response) => {
    await uploadPreparedObjects(projectId, response);
  });

  ipcMain.handle("gableton:download-signed-objects", async (_event, projectId, response) => {
    await downloadSignedObjects(projectId, response);
  });

  ipcMain.handle("gableton:apply-workspace-mutation", async (_event, projectId, manifest) => {
    await updateProjectState(projectId, async (projectState) => ({
      ...projectState,
      lastAppliedManifest: manifest
    }));
  });

  ipcMain.handle("gableton:detect-ableton-open", async () => false);
}

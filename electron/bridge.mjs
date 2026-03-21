import { app, dialog, ipcMain, shell } from "electron";
import { createReadStream, watch } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import {
  restoreStoredSession,
  signInWithSystemBrowser,
  signOutStoredSession
} from "./auth.mjs";

const BRIDGE_STATE_FILENAME = "bridge-state.json";
const AUDIO_EXTENSIONS = new Set([".wav", ".aif", ".aiff", ".flac", ".mp3", ".m4a"]);
const PRESET_EXTENSIONS = new Set([".adg", ".adv", ".alc"]);
const IGNORE_DIR_NAMES = new Set([".git", "node_modules", "dist", "release"]);
const execFileAsync = promisify(execFile);
const workspaceWatchers = new Map();

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
    workspacePath: null,
    versions: [],
    uploads: {},
    downloads: {},
    savedSnapshots: {},
    preparedUploads: {},
    lastAppliedManifest: null,
    lastInventory: null
  };
}

function normalizeProjectState(projectState) {
  const defaults = defaultProjectState();

  return {
    ...defaults,
    ...projectState,
    workspacePath: typeof projectState?.workspacePath === "string" ? projectState.workspacePath : null,
    versions: Array.isArray(projectState?.versions) ? projectState.versions : [],
    uploads: projectState?.uploads && typeof projectState.uploads === "object" ? projectState.uploads : {},
    downloads:
      projectState?.downloads && typeof projectState.downloads === "object"
        ? projectState.downloads
        : {},
    savedSnapshots:
      projectState?.savedSnapshots && typeof projectState.savedSnapshots === "object"
        ? projectState.savedSnapshots
        : {},
    preparedUploads:
      projectState?.preparedUploads && typeof projectState.preparedUploads === "object"
        ? projectState.preparedUploads
        : {}
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
  const projectState = normalizeProjectState(state.projects[projectId]);
  const nextProjectState = await mutator(projectState);
  state.projects[projectId] = normalizeProjectState(nextProjectState);
  await writeBridgeState(state);
  return state.projects[projectId];
}

async function getProjectState(projectId) {
  const state = await readBridgeState();
  return normalizeProjectState(state.projects[projectId]);
}

async function pathExists(targetPath) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function findFirstLiveSet(targetPath) {
  const targetStat = await stat(targetPath);
  if (targetStat.isFile() && path.extname(targetPath).toLowerCase() === ".als") {
    return targetPath;
  }
  if (!targetStat.isDirectory()) {
    return null;
  }

  const queue = [targetPath];
  while (queue.length > 0) {
    const current = queue.shift();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isFile() && path.extname(entry.name).toLowerCase() === ".als") {
        return entryPath;
      }
      if (entry.isDirectory() && !IGNORE_DIR_NAMES.has(entry.name)) {
        queue.push(entryPath);
      }
    }
  }

  return null;
}

async function detectAbletonOpen() {
  if (process.platform !== "darwin") {
    return false;
  }

  try {
    const { stdout } = await execFileAsync("pgrep", ["-ifl", "Ableton Live"]);
    return stdout.trim().length > 0;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 1) {
      return false;
    }
    return false;
  }
}

function hashBuffer(buffer) {
  return `sha256:${createHash("sha256").update(buffer).digest("hex")}`;
}

function hashString(value) {
  return hashBuffer(Buffer.from(value, "utf8"));
}

function toRelativeWorkspacePath(workspacePath, filePath) {
  return path.relative(workspacePath, filePath).split(path.sep).join("/");
}

function shouldTrackWorkspaceFile(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  return extension === ".als" || AUDIO_EXTENSIONS.has(extension) || PRESET_EXTENSIONS.has(extension);
}

async function hashFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);

    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => resolve(`sha256:${hash.digest("hex")}`));
  });
}

async function collectTrackedWorkspaceFiles(workspacePath) {
  const files = [];
  const pending = [workspacePath];

  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }

      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORE_DIR_NAMES.has(entry.name)) {
          pending.push(entryPath);
        }
        continue;
      }

      if (!entry.isFile() || !shouldTrackWorkspaceFile(entry.name)) {
        continue;
      }

      const entryStat = await stat(entryPath);
      files.push({
        relativePath: toRelativeWorkspacePath(workspacePath, entryPath),
        sourcePath: entryPath,
        sizeBytes: entryStat.size
      });
    }
  }

  files.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  return files;
}

async function buildWorkspaceSnapshot(workspacePath) {
  const trackedFiles = await collectTrackedWorkspaceFiles(workspacePath);
  if (trackedFiles.length === 0) {
    throw new Error("No Ableton project files were found in the connected workspace.");
  }

  const snapshotFiles = [];
  for (const file of trackedFiles) {
    snapshotFiles.push({
      ...file,
      blobHash: await hashFile(file.sourcePath)
    });
  }

  const manifestPayload = {
    version: 1,
    repoFormat: "gableton-phase1",
    files: snapshotFiles.map((file) => ({
      path: file.relativePath,
      blobHash: file.blobHash
    }))
  };
  const manifestBody = Buffer.from(JSON.stringify(manifestPayload), "utf8");

  return {
    manifestHash: hashBuffer(manifestBody),
    manifestPayload,
    files: snapshotFiles
  };
}

async function verifySnapshotUnchanged(snapshot) {
  for (const file of snapshot.files ?? []) {
    if (!(await pathExists(file.sourcePath))) {
      throw new Error(`Saved version file is missing: ${file.relativePath}`);
    }

    const currentHash = await hashFile(file.sourcePath);
    if (currentHash !== file.blobHash) {
      throw new Error("Workspace changed after the version was saved. Save a new version before publishing.");
    }
  }
}

function buildPreparedUploads(snapshot) {
  const preparedUploads = {};

  for (const file of snapshot.files ?? []) {
    preparedUploads[file.blobHash] = {
      objectType: "blob",
      sourcePath: file.sourcePath,
      sizeBytes: file.sizeBytes
    };
  }

  const manifestBody = Buffer.from(JSON.stringify(snapshot.manifestPayload), "utf8");
  preparedUploads[snapshot.manifestHash] = {
    objectType: "manifest",
    inlineBase64: manifestBody.toString("base64"),
    sizeBytes: manifestBody.byteLength
  };

  return preparedUploads;
}

async function collectWorkspaceInventory(workspacePath) {
  const summary = {
    liveSetFiles: 0,
    audioFiles: 0,
    presetFiles: 0,
    sampleFolders: 0
  };
  const pending = [workspacePath];

  while (pending.length > 0) {
    const current = pending.pop();
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith(".")) {
        continue;
      }
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name.toLowerCase() === "samples") {
          summary.sampleFolders += 1;
        }
        if (!IGNORE_DIR_NAMES.has(entry.name)) {
          pending.push(entryPath);
        }
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      const extension = path.extname(entry.name).toLowerCase();
      if (extension === ".als") {
        summary.liveSetFiles += 1;
      }
      if (AUDIO_EXTENSIONS.has(extension)) {
        summary.audioFiles += 1;
      }
      if (PRESET_EXTENSIONS.has(extension)) {
        summary.presetFiles += 1;
      }
    }
  }

  return summary;
}

async function scanWorkspace(projectId) {
  const projectState = await getProjectState(projectId);
  const workspacePath = projectState.workspacePath;
  const abletonOpen = await detectAbletonOpen();

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
      abletonOpen
    };
  }

  if (!(await pathExists(workspacePath))) {
    return {
      workspacePath,
      liveSetFiles: 0,
      audioFiles: 0,
      presetFiles: 0,
      sampleFolders: 0,
      lastScannedAt: isoNow(),
      diagnostics: [
        {
          kind: "workspace",
          severity: "blocking",
          message: "The connected Ableton project folder is no longer accessible."
        }
      ],
      abletonOpen
    };
  }

  const summary = await collectWorkspaceInventory(workspacePath);
  const diagnostics = [];

  if (summary.liveSetFiles === 0) {
    diagnostics.push({
      kind: "workspace",
      severity: "blocking",
      message: "No Ableton .als file was found in the selected folder."
    });
  }

  if (summary.sampleFolders === 0) {
    diagnostics.push({
      kind: "sample",
      severity: "warning",
      message: "No Samples folder was detected in the workspace."
    });
  }

  if (summary.audioFiles === 0) {
    diagnostics.push({
      kind: "sample",
      severity: "warning",
      message: "No audio files were detected in the workspace yet."
    });
  }

  if (abletonOpen) {
    diagnostics.push({
      kind: "workspace",
      severity: "warning",
      message: "Ableton Live appears to be open on this machine."
    });
  }

  return {
    workspacePath,
    ...summary,
    lastScannedAt: isoNow(),
    diagnostics,
    abletonOpen
  };
}

async function persistScannedInventory(projectId) {
  const inventory = await scanWorkspace(projectId);
  await updateProjectState(projectId, async (projectState) => ({
    ...projectState,
    lastInventory: inventory
  }));
  return inventory;
}

async function startWatchingWorkspace(projectId, workspacePath) {
  const existingWatcher = workspaceWatchers.get(projectId);
  if (existingWatcher) {
    existingWatcher.close();
  }

  const watcher = watch(
    workspacePath,
    { recursive: true },
    () => {
      void persistScannedInventory(projectId);
    }
  );

  workspaceWatchers.set(projectId, watcher);
}

async function uploadPreparedObjects(projectId, response) {
  await updateProjectState(projectId, async (projectState) => {
    const nextState = {
      ...projectState,
      uploads: { ...projectState.uploads }
    };

    for (const upload of response.uploads) {
      const preparedObject = projectState.preparedUploads[upload.hash];
      if (!preparedObject) {
        throw new Error(`Prepared object ${upload.hash} is missing from the local bridge state.`);
      }

      const payload = preparedObject.sourcePath
        ? await readFile(preparedObject.sourcePath)
        : Buffer.from(preparedObject.inlineBase64 || "", "base64");
      const headers = {
        "Content-Type":
          preparedObject.objectType === "manifest"
            ? "application/json; charset=utf-8"
            : "application/octet-stream",
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
      nextState.uploads[upload.hash] = isoNow();
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
      nextState.downloads[download.hash] = Buffer.from(await result.arrayBuffer()).toString("base64");
    }

    return nextState;
  });
}

export function registerBridgeHandlers() {
  ipcMain.handle("gableton:auth:restore-session", async (_event, apiBaseUrl) => {
    return await restoreStoredSession(apiBaseUrl);
  });

  ipcMain.handle("gableton:auth:sign-in", async (_event, input) => {
    return await signInWithSystemBrowser(input);
  });

  ipcMain.handle("gableton:auth:sign-out", async (_event, apiBaseUrl) => {
    await signOutStoredSession(apiBaseUrl);
  });

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

  ipcMain.handle("gableton:get-project-workspace", async (_event, projectId) => {
    return (await getProjectState(projectId)).workspacePath ?? null;
  });

  ipcMain.handle("gableton:set-project-workspace", async (_event, projectId, workspacePath) => {
    await updateProjectState(projectId, async (projectState) => ({
      ...projectState,
      workspacePath
    }));
  });

  ipcMain.handle("gableton:reveal-in-finder", async (_event, targetPath) => {
    shell.showItemInFolder(targetPath);
  });

  ipcMain.handle("gableton:open-ableton-project", async (_event, targetPath) => {
    const liveSetPath = await findFirstLiveSet(targetPath);
    await shell.openPath(liveSetPath ?? targetPath);
  });

  ipcMain.handle("gableton:watch-workspace", async (_event, projectId, workspacePath) => {
    await startWatchingWorkspace(projectId, workspacePath);
  });

  ipcMain.handle("gableton:scan-workspace", async (_event, projectId) => {
    return await persistScannedInventory(projectId);
  });

  ipcMain.handle("gableton:get-workspace-snapshot", async (_event, projectId) => {
    const inventory = await persistScannedInventory(projectId);
    return [
      `Tracks changed: ${inventory.liveSetFiles}`,
      `Audio files added: ${inventory.audioFiles}`,
      `Automation changed: ${inventory.presetFiles > 0 ? "Yes" : "No"}`,
      `Samples missing: ${inventory.sampleFolders > 0 ? 0 : 1}`
    ];
  });

  ipcMain.handle("gableton:get-environment-diagnostics", async (_event, projectId) => {
    const inventory = await persistScannedInventory(projectId);
    return inventory.diagnostics.map((item) => item.message);
  });

  ipcMain.handle("gableton:start-local-scan", async (_event, projectId) => {
    await persistScannedInventory(projectId);
  });

  ipcMain.handle("gableton:save-local-version", async (_event, input) => {
    const projectState = await getProjectState(input.projectId);
    if (!projectState.workspacePath) {
      throw new Error("Connect an Ableton project folder before saving a version.");
    }

    const snapshot = await buildWorkspaceSnapshot(projectState.workspacePath);
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
      versions: [version, ...projectState.versions],
      savedSnapshots: {
        ...projectState.savedSnapshots,
        [version.id]: snapshot
      }
    }));

    return version;
  });

  ipcMain.handle("gableton:prepare-publish", async (_event, input) => {
    const projectState = await getProjectState(input.projectId);
    const savedVersion =
      projectState.versions.find((item) => item.id === input.savedVersionId) ?? projectState.versions[0];
    const snapshot = projectState.savedSnapshots[input.savedVersionId];
    if (!snapshot) {
      throw new Error("The selected saved version is missing its workspace snapshot. Save the version again before publishing.");
    }
    await verifySnapshotUnchanged(snapshot);

    const title = input.title.trim() || savedVersion?.message || "Untitled publish";
    const preparedUploads = buildPreparedUploads(snapshot);
    const manifestHash = snapshot.manifestHash;
    const commitHash = hashString(
      JSON.stringify({
        parentCommitId: input.parentCommitId,
        manifestHash,
        savedVersionId: input.savedVersionId,
        title
      })
    );

    await updateProjectState(input.projectId, async (current) => ({
      ...current,
      preparedUploads
    }));

    return {
      existenceRequest: {
        chunkHashes: [],
        blobHashes: Object.entries(preparedUploads)
          .filter(([, item]) => item.objectType === "blob")
          .map(([hash]) => hash),
        manifestHashes: [manifestHash]
      },
      uploadObjects: Object.entries(preparedUploads).map(([hash, item]) => ({
        hash,
        objectType: item.objectType,
        sizeBytes: item.sizeBytes
      })),
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
        manifestPayload: snapshot.manifestPayload
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
    const projectState = await getProjectState(projectId);
    if (!projectState.workspacePath) {
      throw new Error("Connect an Ableton project folder before applying project updates.");
    }

    for (const file of manifest.files ?? []) {
      const encodedBody = projectState.downloads[file.blobHash];
      if (!encodedBody) {
        throw new Error(`Downloaded blob ${file.blobHash} is missing for ${file.path}.`);
      }

      const targetPath = path.join(projectState.workspacePath, ...file.path.split("/"));
      await mkdir(path.dirname(targetPath), { recursive: true });
      await writeFile(targetPath, Buffer.from(encodedBody, "base64"));
    }

    await updateProjectState(projectId, async (current) => ({
      ...current,
      lastAppliedManifest: manifest
    }));

    await persistScannedInventory(projectId);
  });

  ipcMain.handle("gableton:detect-ableton-open", async () => await detectAbletonOpen());
}

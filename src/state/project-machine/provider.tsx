import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren
} from "react";
import {
  createInitialProjectMachineState,
  type ProjectMachineState,
  type ProjectMachineValue,
  type PublishPayload,
  type SaveVersionPayload
} from "./types";
import {
  selectPublishEnabled,
  selectSaveVersionEnabled,
  selectUpdateEnabled
} from "../selectors/projectSelectors";
import { useApiClient } from "../../services/api/provider";
import { useDesktopBridge } from "../../services/desktop-bridge/provider";

const ProjectMachineContext = createContext<ProjectMachineValue | null>(null);

interface ProjectStateMachineProviderProps extends PropsWithChildren {
  projectId: string;
}

export function ProjectStateMachineProvider({
  children,
  projectId
}: ProjectStateMachineProviderProps) {
  const apiClient = useApiClient();
  const desktopBridge = useDesktopBridge();
  const [state, setState] = useState<ProjectMachineState>(() => createInitialProjectMachineState(projectId));

  useEffect(() => {
    setState(createInitialProjectMachineState(projectId));
  }, [projectId]);

  const value = useMemo<ProjectMachineValue>(() => {
    return {
      state,
      commands: {
        async openSaveVersionModal() {
          if (!selectSaveVersionEnabled(state)) {
            return { ok: false, reason: "Save version is not available right now." };
          }
          setState((current) => ({
            ...current,
            localVersion: current.localVersion === "dirty" ? "save_modal_open" : current.localVersion
          }));
          return { ok: true };
        },
        cancelSaveVersionModal() {
          setState((current) => ({
            ...current,
            localVersion: current.localVersion === "save_modal_open" ? "dirty" : current.localVersion
          }));
        },
        async confirmSaveVersion(payload: SaveVersionPayload) {
          if (state.localVersion !== "save_modal_open") {
            return { ok: false, reason: "Open the save modal before confirming." };
          }
          if (state.scan !== "idle") {
            return { ok: false, reason: "Wait for the workspace scan to finish." };
          }
          if (!payload.message.trim()) {
            return { ok: false, reason: "A version message is required." };
          }
          setState((current) => ({
            ...current,
            localVersion: "saving"
          }));

          try {
            const summary = await desktopBridge.getWorkspaceSnapshot(state.context.projectId);
            const diagnostics = await desktopBridge.getEnvironmentDiagnostics(state.context.projectId);
            const version = await desktopBridge.saveLocalVersion({
              projectId: state.context.projectId,
              message: payload.message,
              notes: payload.notes,
              scanRevision: state.context.scanRevision,
              workspaceSummary:
                Array.isArray(summary) && summary.every((item) => typeof item === "string")
                  ? summary
                  : [
                      `Tracks changed: ${state.context.workspaceSummary.tracksChanged}`,
                      `Audio files added: ${state.context.workspaceSummary.audioFilesAdded}`,
                      `Automation changed: ${state.context.workspaceSummary.automationChanged ? "Yes" : "No"}`
                    ],
              environmentSummary:
                Array.isArray(diagnostics) && diagnostics.every((item) => typeof item === "string")
                  ? diagnostics
                  : state.context.environmentWarnings.map((item) => item.message)
            });

            setState((current) => ({
              ...current,
              localVersion: "saved_unpublished",
              context: {
                ...current.context,
                hasUnsavedLocalChanges: false,
                hasSavedUnpublishedVersion: true,
                latestSavedLocalVersionId: version.id
              }
            }));
            return { ok: true };
          } catch (error) {
            setState((current) => ({
              ...current,
              localVersion: "save_failed"
            }));
            return {
              ok: false,
              reason: error instanceof Error ? error.message : "Saving the version failed."
            };
          }
        },
        async startPublish(payload: PublishPayload) {
          if (!selectPublishEnabled(state)) {
            return { ok: false, reason: "Publish changes is not available right now." };
          }
          if (!payload.title.trim()) {
            return { ok: false, reason: "A publish title is required." };
          }
          if (!state.context.latestSavedLocalVersionId) {
            return { ok: false, reason: "No saved version is available to publish." };
          }

          setState((current) => ({
            ...current,
            publish: "preflighting"
          }));

          try {
            const prepared = await desktopBridge.preparePublish({
              projectId: state.context.projectId,
              repoId: state.context.projectId,
              targetLine: payload.targetLine,
              title: payload.title,
              description: payload.description,
              parentCommitId: state.context.workspaceBaseCommitId,
              expectedRefHead: state.context.remoteHeadCommitId,
              savedVersionId: state.context.latestSavedLocalVersionId
            });

            const existence = await apiClient.checkObjectExistence(
              state.context.projectId,
              prepared.existenceRequest
            );
            const missingHashes = new Set([
              ...existence.missingBlobs,
              ...existence.missingChunks,
              ...existence.missingManifests
            ]);
            const uploads = await apiClient.signUploads(state.context.projectId, {
              objects: prepared.uploadObjects.filter((item) => missingHashes.has(item.hash))
            });

            setState((current) => ({
              ...current,
              publish: "publishing"
            }));

            await desktopBridge.uploadPreparedObjects(state.context.projectId, uploads);

            const stage = await apiClient.stageCommit(
              state.context.projectId,
              prepared.stageCommitRequest
            );
            const finalize = await apiClient.finalizeCommit(state.context.projectId, {
              ...prepared.finalizeCommitRequest,
              stagedCommitToken: stage.stagedCommitToken
            });

            const changeRequest = await apiClient.createPullRequest(
              state.context.projectId,
              prepared.createPullRequestRequest
            );

            setState((current) => ({
              ...current,
              publish: "change_request_open",
              localVersion: "clean",
              sync: "in_sync",
              context: {
                ...current.context,
                hasSavedUnpublishedVersion: false,
                hasUpdateAvailable: false,
                latestPublishedVersionId: current.context.latestSavedLocalVersionId,
                activeChangeRequestId: changeRequest.id,
                workspaceBaseCommitId: finalize.commitId,
                remoteHeadCommitId: finalize.refHead,
                openChangeRequest: changeRequest
              }
            }));
            return { ok: true };
          } catch (error) {
            setState((current) => ({
              ...current,
              publish: "publish_failed"
            }));
            return {
              ok: false,
              reason: error instanceof Error ? error.message : "Publishing failed."
            };
          }
        },
        async startUpdateProject() {
          if (!selectUpdateEnabled(state)) {
            return { ok: false, reason: "Update project is not available right now." };
          }

          setState((current) => ({
            ...current,
            sync: "updating"
          }));

          try {
            const manifest = await apiClient.getCommitManifest(
              state.context.projectId,
              state.context.remoteHeadCommitId
            );
            const downloads = await apiClient.signDownloads(state.context.projectId, {
              objects: manifest.files.map((file) => ({
                hash: file.blobHash,
                objectType: "blob"
              }))
            });
            await desktopBridge.downloadSignedObjects(state.context.projectId, downloads);
            await desktopBridge.applyWorkspaceMutation(state.context.projectId, manifest);

            setState((current) => ({
              ...current,
              sync: "in_sync",
              localVersion: current.localVersion === "dirty" ? current.localVersion : "clean",
              context: {
                ...current.context,
                hasUpdateAvailable: false,
                workspaceBaseCommitId: current.context.remoteHeadCommitId
              }
            }));
            return { ok: true };
          } catch (error) {
            setState((current) => ({
              ...current,
              sync: "update_failed"
            }));
            return {
              ok: false,
              reason: error instanceof Error ? error.message : "Updating the project failed."
            };
          }
        },
        retryScan() {
          setState((current) => ({
            ...current,
            scan: "idle"
          }));
        },
        async openConflictResolution() {
          setState((current) => ({
            ...current,
            publish: "publish_blocked"
          }));
          return { ok: true };
        }
      }
    };
  }, [apiClient, desktopBridge, projectId, state]);

  return <ProjectMachineContext.Provider value={value}>{children}</ProjectMachineContext.Provider>;
}

export function useProjectStateMachine(): ProjectMachineValue {
  const context = useContext(ProjectMachineContext);
  if (!context) {
    throw new Error("useProjectStateMachine must be used inside ProjectStateMachineProvider.");
  }
  return context;
}

import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react";
import {
  initialProjectMachineState,
  type ProjectMachineState,
  type ProjectMachineValue,
  type PublishPayload,
  type SaveVersionPayload
} from "./types";

const ProjectMachineContext = createContext<ProjectMachineValue | null>(null);

export function ProjectStateMachineProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ProjectMachineState>(initialProjectMachineState);

  const value = useMemo<ProjectMachineValue>(() => {
    return {
      state,
      commands: {
        openSaveVersionModal() {
          setState((current) => ({
            ...current,
            localVersion: current.localVersion === "dirty" ? "save_modal_open" : current.localVersion
          }));
        },
        confirmSaveVersion(_payload: SaveVersionPayload) {
          setState((current) => ({
            ...current,
            localVersion: "saved_unpublished",
            context: {
              ...current.context,
              hasUnsavedLocalChanges: false,
              hasSavedUnpublishedVersion: true,
              latestSavedLocalVersionId: "version_local_1"
            }
          }));
        },
        startPublish(_payload: PublishPayload) {
          setState((current) => ({
            ...current,
            publish: "change_request_open",
            localVersion: "clean",
            context: {
              ...current.context,
              hasSavedUnpublishedVersion: false,
              activeChangeRequestId: "cr_1"
            }
          }));
        },
        startUpdateProject() {
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
        },
        retryScan() {
          setState((current) => ({
            ...current,
            scan: "idle"
          }));
        },
        openConflictResolution() {
          setState((current) => ({
            ...current,
            publish: "publish_blocked"
          }));
        }
      }
    };
  }, [state]);

  return <ProjectMachineContext.Provider value={value}>{children}</ProjectMachineContext.Provider>;
}

export function useProjectStateMachine(): ProjectMachineValue {
  const context = useContext(ProjectMachineContext);
  if (!context) {
    throw new Error("useProjectStateMachine must be used inside ProjectStateMachineProvider.");
  }
  return context;
}

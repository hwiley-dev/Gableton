import type { ProjectMachineState } from "../project-machine/types";

export type HeadlineStatus =
  | "Up to date"
  | "Changes not saved"
  | "Version saved locally"
  | "Ready to publish"
  | "Review required"
  | "Update available"
  | "Conflict requires attention"
  | "Missing sample"
  | "Missing plugin"
  | "Workspace scan still in progress";

export type StatusTone = "neutral" | "success" | "warning" | "danger";

export function selectHeadlineStatus(state: ProjectMachineState): HeadlineStatus {
  if (state.publish === "publish_blocked") {
    return "Conflict requires attention";
  }
  if (state.environment === "blocking") {
    const hasSampleBlock = state.context.environmentBlocks.some((item) => item.kind === "sample");
    return hasSampleBlock ? "Missing sample" : "Missing plugin";
  }
  if (state.scan === "scanning") {
    return "Workspace scan still in progress";
  }
  if (state.sync === "update_available" || state.sync === "update_blocked") {
    return "Update available";
  }
  if (state.localVersion === "dirty") {
    return "Changes not saved";
  }
  if (state.publish === "change_request_open") {
    return "Review required";
  }
  if (state.localVersion === "saved_unpublished") {
    return "Version saved locally";
  }
  return "Up to date";
}

export function selectStatusTone(state: ProjectMachineState): StatusTone {
  const status = selectHeadlineStatus(state);
  if (status === "Conflict requires attention" || status === "Missing sample") {
    return "danger";
  }
  if (
    status === "Update available" ||
    status === "Changes not saved" ||
    status === "Missing plugin" ||
    status === "Workspace scan still in progress"
  ) {
    return "warning";
  }
  if (status === "Up to date") {
    return "success";
  }
  return "neutral";
}

export function selectSaveVersionEnabled(state: ProjectMachineState): boolean {
  return state.localVersion === "dirty" && state.scan === "idle";
}

export function selectPublishEnabled(state: ProjectMachineState): boolean {
  return (
    state.localVersion === "saved_unpublished" &&
    state.scan === "idle" &&
    state.environment !== "blocking" &&
    state.publish === "idle"
  );
}

export function selectUpdateEnabled(state: ProjectMachineState): boolean {
  return (
    state.sync === "update_available" &&
    state.mutationLock === "unlocked" &&
    state.localVersion !== "dirty"
  );
}

export function selectSaveVersionBlockingReason(state: ProjectMachineState): string | undefined {
  if (state.scan === "scanning") {
    return "Workspace scan still in progress.";
  }
  if (state.localVersion !== "dirty") {
    return "No unsaved changes detected.";
  }
  return undefined;
}

export function selectPublishBlockingReason(state: ProjectMachineState): string | undefined {
  if (state.localVersion !== "saved_unpublished") {
    return "Save a version before publishing.";
  }
  if (state.scan !== "idle") {
    return "Wait for the workspace scan to finish.";
  }
  if (state.environment === "blocking") {
    return "Resolve blocking environment issues before publishing.";
  }
  if (state.publish !== "idle") {
    return "Publishing is already in progress.";
  }
  return undefined;
}

export function selectUpdateBlockingReason(state: ProjectMachineState): string | undefined {
  if (state.sync !== "update_available") {
    return "No project update is available.";
  }
  if (state.localVersion === "dirty") {
    return "Save a version before updating the workspace.";
  }
  if (state.mutationLock !== "unlocked") {
    return "Close Ableton or wait for the workspace operation to finish.";
  }
  return undefined;
}

export function selectEnvironmentSummary(state: ProjectMachineState): string[] {
  return [...state.context.environmentWarnings, ...state.context.environmentBlocks].map(
    (issue) => issue.message
  );
}

export function selectWorkspaceSummary(state: ProjectMachineState): string[] {
  const summary = state.context.workspaceSummary;
  return [
    `Tracks changed: ${summary.tracksChanged}`,
    `Audio files added: ${summary.audioFilesAdded}`,
    `Automation changed: ${summary.automationChanged ? "Yes" : "No"}`,
    `Samples missing: ${summary.samplesMissing}`
  ];
}

export function selectOpenChangeRequestSummary(state: ProjectMachineState): string | undefined {
  const request = state.context.openChangeRequest;
  if (!request) {
    return undefined;
  }
  return `${request.title} (${request.approvals} approvals)`;
}

import { PageScaffold } from "../../shared/PageScaffold";
import { SectionCard } from "../../shared/SectionCard";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import { selectEnvironmentSummary, selectWorkspaceSummary } from "../../../state/selectors/projectSelectors";
import { useDesktopBridge } from "../../../services/desktop-bridge/provider";

export function WorkspacePage() {
  const { state, commands } = useProjectStateMachine();
  const desktopBridge = useDesktopBridge();
  const workspaceSummary = selectWorkspaceSummary(state);
  const environmentSummary = selectEnvironmentSummary(state);
  const workspaceInventory = state.context.workspaceInventory;
  const hasWorkspacePath = state.context.workspacePath.trim().length > 0;

  return (
    <PageScaffold
      title="Workspace"
      actions={
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => void commands.connectWorkspace()}>Choose folder</button>
          <button onClick={() => void commands.refreshWorkspace()}>Rescan</button>
          <button
            disabled={!hasWorkspacePath}
            onClick={() => void desktopBridge.openAbletonProject(state.context.workspacePath)}
          >
            Open in Ableton
          </button>
          <button
            disabled={!hasWorkspacePath}
            onClick={() => void desktopBridge.revealInFinder(state.context.workspacePath)}
          >
            Reveal in Finder
          </button>
        </div>
      }
    >
      <SectionCard title="Workspace path">
        <p>{hasWorkspacePath ? state.context.workspacePath : "No workspace connected."}</p>
      </SectionCard>
      <SectionCard title="Workspace inventory">
        <ul>
          <li>Live set files: {workspaceInventory.liveSetFiles}</li>
          <li>Audio files: {workspaceInventory.audioFiles}</li>
          <li>Preset files: {workspaceInventory.presetFiles}</li>
          <li>Sample folders: {workspaceInventory.sampleFolders}</li>
          <li>Last scanned: {workspaceInventory.lastScannedAt ?? "Not scanned yet"}</li>
          <li>Ableton open: {state.context.abletonOpen ? "Yes" : "No"}</li>
        </ul>
      </SectionCard>
      <SectionCard title="Local change summary">
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
      <SectionCard title="Environment diagnostics">
        <ul>
          {environmentSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </SectionCard>
    </PageScaffold>
  );
}

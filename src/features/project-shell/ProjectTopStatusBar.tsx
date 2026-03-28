import { useProjectStateMachine } from "../../state/project-machine/provider";
import {
  selectEnvironmentSummary,
  selectHeadlineStatus,
  selectStatusTone
} from "../../state/selectors/projectSelectors";
import { PrimaryActionCluster } from "../shared/PrimaryActionCluster";

export function ProjectTopStatusBar() {
  const { state } = useProjectStateMachine();
  const headline = selectHeadlineStatus(state);
  const tone = selectStatusTone(state);
  const environment = selectEnvironmentSummary(state);

  return (
    <div className="top-status-bar">
      <div className="top-status-bar__meta">
        <div className="top-status-bar__project">
          <div className="top-status-bar__project-name">{state.context.projectName}</div>
          <div className="status-chip" data-tone={tone}>
            {headline}
          </div>
        </div>
        <div className="top-status-bar__workspace">{state.context.workspaceName}</div>
        {environment.length ? (
          <div className="top-status-bar__environment">{environment.join(" | ")}</div>
        ) : null}
      </div>
      <PrimaryActionCluster />
    </div>
  );
}

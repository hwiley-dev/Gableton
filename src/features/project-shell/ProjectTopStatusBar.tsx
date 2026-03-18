import { useProjectStateMachine } from "../../state/project-machine/provider";
import {
  selectEnvironmentSummary,
  selectHeadlineStatus,
  selectStatusTone
} from "../../state/selectors/projectSelectors";
import { PrimaryActionCluster } from "../shared/PrimaryActionCluster";

const toneColors = {
  neutral: "#6b7280",
  success: "#1f7a1f",
  warning: "#9a6700",
  danger: "#b42318"
};

export function ProjectTopStatusBar() {
  const { state } = useProjectStateMachine();
  const headline = selectHeadlineStatus(state);
  const tone = selectStatusTone(state);
  const environment = selectEnvironmentSummary(state);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 16, alignItems: "center" }}>
      <div>
        <div style={{ fontWeight: 700 }}>{state.context.projectName}</div>
        <div style={{ fontSize: 14, color: toneColors[tone] }}>
          {state.context.workspaceName} | {headline}
        </div>
        {environment.length ? (
          <div style={{ fontSize: 12, marginTop: 4 }}>{environment.join(" | ")}</div>
        ) : null}
      </div>
      <PrimaryActionCluster />
    </div>
  );
}

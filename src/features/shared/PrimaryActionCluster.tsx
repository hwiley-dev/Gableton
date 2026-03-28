import { useAppRouter } from "../../app/router";
import { useProjectStateMachine } from "../../state/project-machine/provider";
import {
  selectPublishBlockingReason,
  selectPublishEnabled,
  selectSaveVersionBlockingReason,
  selectSaveVersionEnabled,
  selectUpdateBlockingReason,
  selectUpdateEnabled
} from "../../state/selectors/projectSelectors";

function ActionButton({
  label,
  enabled,
  title,
  variant,
  onClick
}: {
  label: string;
  enabled: boolean;
  title?: string;
  variant?: "primary" | "secondary";
  onClick: () => void;
}) {
  return (
    <button
      className={`action-button${variant === "primary" ? " action-button--primary" : ""}`}
      disabled={!enabled}
      onClick={onClick}
      title={title}
    >
      {label}
    </button>
  );
}

export function PrimaryActionCluster() {
  const { state, commands } = useProjectStateMachine();
  const { navigate } = useAppRouter();
  const projectPathBase = `/projects/${state.context.projectId}`;

  return (
    <div className="primary-action-cluster">
      <ActionButton
        label="Save version"
        variant="primary"
        enabled={selectSaveVersionEnabled(state)}
        title={selectSaveVersionBlockingReason(state)}
        onClick={async () => {
          const result = await commands.openSaveVersionModal();
          if (result.ok) {
            navigate(`${projectPathBase}/save-version`, { modal: true });
          }
        }}
      />
      <ActionButton
        label="Publish changes"
        enabled={selectPublishEnabled(state)}
        title={selectPublishBlockingReason(state)}
        onClick={() => navigate(`${projectPathBase}/publish`, { modal: true })}
      />
      <ActionButton
        label="Update project"
        enabled={selectUpdateEnabled(state)}
        title={selectUpdateBlockingReason(state)}
        onClick={async () => {
          await commands.startUpdateProject();
        }}
      />
    </div>
  );
}

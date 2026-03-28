import { useState } from "react";
import { useAppRouter } from "../../../app/router";
import { useProjectStateMachine } from "../../../state/project-machine/provider";
import {
  selectEnvironmentSummary,
  selectPublishBlockingReason,
  selectPublishEnabled,
  selectWorkspaceSummary
} from "../../../state/selectors/projectSelectors";
import { SectionCard } from "../../shared/SectionCard";

export function PublishChangesModal() {
  const { state, commands } = useProjectStateMachine();
  const { closeModal } = useAppRouter();
  const [title, setTitle] = useState("Add bridge synth textures");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string>();
  const publishEnabled = selectPublishEnabled(state);
  const blockingReason = selectPublishBlockingReason(state);
  const workspaceSummary = selectWorkspaceSummary(state);
  const environmentSummary = selectEnvironmentSummary(state);

  if (!publishEnabled) {
    return (
      <SectionCard title="Publish changes">
        <p>{blockingReason ?? "Publishing is not available right now."}</p>
        <div className="button-row">
          <button onClick={closeModal}>Close</button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Publish changes">
      <label className="field-grid">
        <span>Target line</span>
        <input value={state.context.activeLine} readOnly />
      </label>
      <label className="field-grid">
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label className="field-grid">
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
      </label>
      <div>
        <strong>Preflight summary</strong>
        <ul>
          <li>Saved version found</li>
          <li>Workspace scan is complete</li>
          <li>Base commit is known</li>
        </ul>
      </div>
      <div>
        <strong>Change summary</strong>
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div>
        <strong>Warnings</strong>
        <ul>
          {environmentSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {error ? <p className="error-text">{error}</p> : null}
      <div className="button-row">
        <button onClick={closeModal}>Cancel</button>
        <button
          onClick={async () => {
            const result = await commands.startPublish({
              targetLine: state.context.activeLine,
              title,
              description
            });
            if (result.ok) {
              closeModal();
            } else {
              setError(result.reason);
            }
          }}
        >
          Publish changes
        </button>
      </div>
    </SectionCard>
  );
}

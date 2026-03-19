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
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={closeModal}>Close</button>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Publish changes">
      <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <span>Target line</span>
        <input value={state.context.activeLine} readOnly />
      </label>
      <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <span>Title</span>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label style={{ display: "grid", gap: 8, marginBottom: 16 }}>
        <span>Description</span>
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} />
      </label>
      <div style={{ marginBottom: 16 }}>
        <strong>Preflight summary</strong>
        <ul>
          <li>Saved version found</li>
          <li>Workspace scan is complete</li>
          <li>Base commit is known</li>
        </ul>
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Change summary</strong>
        <ul>
          {workspaceSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Warnings</strong>
        <ul>
          {environmentSummary.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
      {error ? <p style={{ color: "#b42318" }}>{error}</p> : null}
      <div style={{ display: "flex", gap: 8 }}>
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

import { SectionCard } from "../../shared/SectionCard";

export function SaveVersionModal() {
  return (
    <SectionCard title="Save version">
      <p>Message, notes, generated summary, and environment warnings appear here.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button>Cancel</button>
        <button>Save version</button>
      </div>
    </SectionCard>
  );
}

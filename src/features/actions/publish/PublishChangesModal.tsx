import { SectionCard } from "../../shared/SectionCard";

export function PublishChangesModal() {
  return (
    <SectionCard title="Publish changes">
      <p>Target line, publish title, preflight status, and warnings appear here.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button>Cancel</button>
        <button>Publish changes</button>
      </div>
    </SectionCard>
  );
}

import { SectionCard } from "../../shared/SectionCard";

export function UpdateBlockedModal() {
  return (
    <SectionCard title="Update blocked">
      <p>You have local changes that are not saved yet. Save a version before updating.</p>
      <div style={{ display: "flex", gap: 8 }}>
        <button>Cancel</button>
        <button>Save version first</button>
      </div>
    </SectionCard>
  );
}

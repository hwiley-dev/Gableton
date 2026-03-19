import type { PropsWithChildren } from "react";

export function ModalOverlay({ children }: PropsWithChildren) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.35)",
        display: "grid",
        placeItems: "center",
        padding: 24
      }}
    >
      <div style={{ width: "min(640px, 100%)", background: "#ffffff", borderRadius: 12, padding: 16 }}>
        {children}
      </div>
    </div>
  );
}

import type { PropsWithChildren } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section style={{ border: "1px solid #d7d7d7", padding: 16, borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {children}
    </section>
  );
}

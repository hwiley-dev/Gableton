import type { PropsWithChildren } from "react";

interface SectionCardProps extends PropsWithChildren {
  title: string;
}

export function SectionCard({ title, children }: SectionCardProps) {
  return (
    <section className="section-card">
      <h2 className="section-card__title">{title}</h2>
      <div className="section-card__body">{children}</div>
    </section>
  );
}

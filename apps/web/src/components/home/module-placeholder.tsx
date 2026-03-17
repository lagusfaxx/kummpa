import { SectionCard } from "@kumpa/ui";

interface ModulePlaceholderProps {
  title: string;
  description: string;
  note?: string;
}

export function ModulePlaceholder({
  title,
  description,
  note = "Esta seccion no forma parte del recorrido principal de la aplicacion."
}: ModulePlaceholderProps) {
  return (
    <SectionCard title={title} subtitle={description}>
      <p className="text-sm text-slate-700">{note}</p>
    </SectionCard>
  );
}

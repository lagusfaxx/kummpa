import Link from "next/link";
import { EmptyState } from "@/components/feedback/empty-state";

export default function NotFound() {
  return (
    <EmptyState
      eyebrow="Ruta invalida"
      title="Pagina no encontrada"
      description="La ruta no existe o aun no fue habilitada en la fase actual."
      action={
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(15,23,42,0.18)] transition active:scale-[0.98]"
        >
          Volver al inicio
        </Link>
      }
    />
  );
}

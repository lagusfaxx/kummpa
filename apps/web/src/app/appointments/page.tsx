import Link from "next/link";

export default function AppointmentsPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <section className="card p-8 text-center">
        <span className="kumpa-eyebrow">Reservas</span>
        <h1 className="mt-3 text-3xl font-bold">Las nuevas reservas se hacen desde Cerca de ti</h1>
        <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted-foreground))]">
          Mantuvimos esta ruta para no romper enlaces antiguos. Ahora buscar, comparar y reservar vive en Cerca de ti; el historial queda dentro de Cuenta.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/explore" className="btn btn-primary">Ir a explorar</Link>
          <Link href="/account" className="btn btn-outline">Ver mi cuenta</Link>
        </div>
      </section>
    </div>
  );
}

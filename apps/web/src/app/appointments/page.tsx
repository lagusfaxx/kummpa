"use client";

import Link from "next/link";
import { AuthGate } from "@/components/auth/auth-gate";

export default function AppointmentsPage() {
  return (
    <AuthGate>
      <div className="mx-auto max-w-2xl space-y-6 py-8 text-center">
        <h1 className="text-3xl font-bold">Reservas</h1>
        <p className="text-slate-600">
          Las reservas ahora se realizan directamente desde Explorar o la ficha de cada servicio.
        </p>
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link href="/explore" className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800">
            Explorar servicios
          </Link>
          <Link href="/account" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            Ver historial en mi cuenta
          </Link>
        </div>
      </div>
    </AuthGate>
  );
}

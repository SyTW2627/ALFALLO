import { formatearValorHito, porcentaje, diasRestantes } from "../../lib/progreso.js";

export default function ListaRetos({ retos }) {
  const completados = retos.filter((r) => r.completado).length;
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-suave">
          Retos de esta semana · {completados}/{retos.length} completados
        </p>
        {retos[0] && <p className="text-xs text-suave">{diasRestantes(retos[0].terminaEn)} · se renuevan cada lunes</p>}
      </div>
      <ul className="space-y-3">
        {retos.map((r) => (
          <li
            key={r.key}
            className={`rounded-2xl border p-5 ${r.completado ? "border-acento/30 bg-acento/5" : "border-borde bg-superficie"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">{r.titulo}</p>
              {r.completado ? (
                <span className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-acento">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                  Completado
                </span>
              ) : (
                <span className="shrink-0 text-xs font-semibold tabular-nums text-suave">
                  {Math.floor(porcentaje(r.actual, r.objetivo))} %
                </span>
              )}
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-elevada">
              <div
                className={`h-full rounded-full ${r.completado ? "bg-acento" : "bg-primario"}`}
                style={{ width: `${Math.max(porcentaje(r.actual, r.objetivo), 2)}%` }}
              />
            </div>
            <p className="mt-2 text-xs tabular-nums text-suave">
              {formatearValorHito(r.unidad, Math.min(r.actual, r.objetivo))} de {formatearValorHito(r.unidad, r.objetivo)}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
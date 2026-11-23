import { formatearValorHito, formatearFechaCorta, porcentaje, diasRestantes } from "../../lib/progreso.js";

function Reto({ reto: r }) {
  return (
    <li className={`rounded-2xl border p-5 ${r.completado ? "border-acento/30 bg-acento/5" : "border-borde bg-superficie"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold">{r.titulo}</p>
          {r.descripcion && <p className="mt-0.5 text-sm text-suave">{r.descripcion}</p>}
        </div>
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
      <div className="mt-2 flex flex-wrap justify-between gap-2 text-xs tabular-nums text-suave">
        <span>
          {formatearValorHito(r.unidad, Math.min(r.actual, r.objetivo))} de {formatearValorHito(r.unidad, r.objetivo)}
        </span>
        {r.tipo === "especial" && (
          <span>
            {formatearFechaCorta(r.empiezaEn)} – {formatearFechaCorta(new Date(new Date(r.terminaEn).getTime() - 1))} ·{" "}
            {diasRestantes(r.terminaEn)}
          </span>
        )}
      </div>
    </li>
  );
}

export default function ListaRetos({ retos }) {
  const semanales = retos.filter((r) => r.tipo !== "especial");
  const especiales = retos.filter((r) => r.tipo === "especial");
  const completados = semanales.filter((r) => r.completado).length;

  return (
    <div className="space-y-8">
      {especiales.length > 0 && (
        <section aria-labelledby="retos-especiales">
          <h3 id="retos-especiales" className="mb-4 text-sm text-suave">
            <span className="font-bold text-primario">Retos especiales</span> ·{" "}
            {especiales.filter((r) => r.completado).length}/{especiales.length} completados
          </h3>
          <ul className="space-y-3">
            {especiales.map((r) => (
              <Reto key={r.key} reto={r} />
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="retos-semanales">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="retos-semanales" className="text-sm text-suave">
            Retos de esta semana · {completados}/{semanales.length} completados
          </h3>
          {semanales[0] && (
            <p className="text-xs text-suave">{diasRestantes(semanales[0].terminaEn)} · se renuevan cada lunes</p>
          )}
        </div>
        <ul className="space-y-3">
          {semanales.map((r) => (
            <Reto key={r.key} reto={r} />
          ))}
        </ul>
      </section>
    </div>
  );
}

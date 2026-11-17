import InsigniaRango from "./InsigniaRango.jsx";
import {
  colorRango,
  formatearNumero,
  formatearRatio,
  formatearFechaCorta,
  pesoParaReps,
} from "../../lib/progreso.js";

// Escalera de 7 segmentos: rellena hasta el rango actual.
function Escalera({ umbrales, nivel }) {
  return (
    <div className="mt-4 flex gap-1" aria-hidden="true">
      {umbrales.map((u) => (
        <div
          key={u.rango.key}
          className="h-1.5 flex-1 rounded-full"
          style={{ background: u.rango.nivel <= nivel ? colorRango(u.rango) : "var(--color-elevada)" }}
        />
      ))}
    </div>
  );
}

export default function TarjetaRango({ rango: r }) {
  const actual = r.actual;
  const nivel = actual?.rango?.nivel ?? 0;
  const mejorEsMayor = (r.mejor?.rango?.nivel ?? 0) > nivel;

  // Progreso dentro del tramo actual (del umbral actual al siguiente).
  let progreso = 0;
  if (actual?.ratio != null && r.siguiente) {
    const desde = nivel > 0 ? r.umbrales[nivel - 1].ratio : 0;
    progreso = Math.max(0, Math.min(100, ((actual.ratio - desde) / (r.siguiente.ratio - desde)) * 100));
  }

  return (
    <article className="flex flex-col rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex items-start gap-4">
        <InsigniaRango rango={actual?.rango} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bold">{r.label}</h3>
          <p
            className="text-lg font-extrabold"
            style={actual?.rango ? { color: colorRango(actual.rango) } : undefined}
          >
            {actual?.rango?.label ?? (r.estado === "sin-datos" ? "Sin registros" : "Sin rango")}
          </p>
        </div>
        {actual && (
          <div className="shrink-0 text-right">
            <p className="text-[10px] uppercase tracking-wider text-suave">1RM estimado</p>
            <p className="text-lg font-bold tabular-nums">{formatearNumero(actual.e1rm)} kg</p>
            {actual.ratio != null && <p className="text-xs text-suave">{formatearRatio(actual.ratio)} tu peso</p>}
          </div>
        )}
      </div>

      {r.estado === "sin-datos" && (
        <p className="mt-4 text-sm text-suave">
          {r.mejor
            ? "No lo has entrenado en los últimos 90 días."
            : `Registra series de 1 a 10 repeticiones de ${r.label.toLowerCase()} para obtener tu rango.`}
        </p>
      )}

      {r.estado === "sin-peso" && (
        <p className="mt-4 text-sm text-suave">Añade tu peso corporal para calcular tu rango.</p>
      )}

      {r.estado === "ok" && !actual && (
        <p className="mt-4 text-sm text-suave">No lo has entrenado en los últimos 90 días.</p>
      )}

      {actual && r.estado === "ok" && (
        <>
          <Escalera umbrales={r.umbrales} nivel={nivel} />
          {r.siguiente ? (
            <>
              <div
                className="mt-3 h-2 overflow-hidden rounded-full bg-elevada"
                role="progressbar"
                aria-valuenow={Math.round(progreso)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Progreso hacia ${r.siguiente.rango.label}`}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${Math.max(progreso, 3)}%`, background: colorRango(r.siguiente.rango) }}
                />
              </div>
              <p className="mt-2 text-sm">
                Te faltan <span className="font-bold">{formatearNumero(r.siguiente.faltaKg)} kg</span> de 1RM para{" "}
                <span className="font-bold" style={{ color: colorRango(r.siguiente.rango) }}>
                  {r.siguiente.rango.label}
                </span>
              </p>
              <p className="text-xs text-suave">
                Por ejemplo, {formatearNumero(pesoParaReps(r.siguiente.e1rmNecesario, actual.reps))} kg × {actual.reps}
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm font-semibold" style={{ color: colorRango(actual.rango) }}>
              Rango máximo alcanzado.
            </p>
          )}
        </>
      )}

      {actual && (
        <p className="mt-3 text-xs text-suave">
          Mejor serie reciente: {formatearNumero(actual.kg)} kg × {actual.reps} · {formatearFechaCorta(actual.fecha)}
        </p>
      )}

      {mejorEsMayor && (
        <p className="mt-1 text-xs text-suave">
          Tu mejor rango: <span style={{ color: colorRango(r.mejor.rango) }}>{r.mejor.rango.label}</span> (
          {formatearFechaCorta(r.mejor.fecha)})
        </p>
      )}

      {r.pendiente && (
        <p className="mt-3 rounded-lg border border-primario/30 bg-primario/10 px-3 py-2 text-xs text-primario">
          La marca de {formatearNumero(r.pendiente.kg)} kg × {r.pendiente.reps} es mucho mayor que las anteriores. Si no
          fue un error al escribir, repítela en otra sesión y contará para tu rango.
        </p>
      )}

      <details className="mt-auto pt-4 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-suave hover:text-white">Ver tabla de rangos</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-[10px] uppercase tracking-wider text-suave">
            <tr>
              <th className="pb-2 font-medium">Rango</th>
              <th className="pb-2 font-medium">× peso</th>
              <th className="pb-2 text-right font-medium">1RM para ti</th>
            </tr>
          </thead>
          <tbody>
            {r.umbrales.map((u) => (
              <tr key={u.rango.key} className="border-t border-borde">
                <td className="py-1.5">
                  <span className="mr-2 inline-block h-2 w-2 rounded-full" style={{ background: colorRango(u.rango) }} />
                  {u.rango.label}
                </td>
                <td className="py-1.5 tabular-nums text-suave">{formatearRatio(u.ratio)}</td>
                <td className="py-1.5 text-right font-semibold tabular-nums">
                  {u.e1rm != null ? `${formatearNumero(u.e1rm)} kg` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}
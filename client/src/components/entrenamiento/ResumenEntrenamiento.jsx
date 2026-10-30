import {
    etiquetaObjetivo,
    totalSeries,
    volumenTotal,
    formatearKg,
    nuevasMarcas,
  } from "../../lib/entrenamiento.js";
  
  // "4 × 8" si todas las series tienen las mismas reps; si no, "8 · 8 · 6".
  function describirSeries(series) {
    const reps = series.map((s) => s.reps);
    return reps.every((r) => r === reps[0]) ? `${reps.length} × ${reps[0]}` : reps.join(" · ");
  }
  
  export default function ResumenEntrenamiento({ entrenamiento, maximo, onOtro }) {
    const ejercicios = entrenamiento.ejercicios.filter((e) => e.series.length > 0);
    const marcas = nuevasMarcas(ejercicios, maximo);
  
    return (
      <div className="mx-auto max-w-2xl">
        <header className="mb-6 text-center">
          <div
            aria-hidden="true"
            className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-acento/15 text-acento ring-8 ring-acento/10"
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <p className="mt-5 text-[11px] font-bold uppercase tracking-widest text-acento">Entrenamiento completado</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Buen trabajo. Hoy has sumado.</h1>
        </header>
  
        <section className="rounded-2xl border border-borde bg-superficie p-5">
          <div className="flex items-center justify-between gap-3">
            <span className="font-semibold text-primario">
              {entrenamiento.titulo}
              {entrenamiento.objetivo && ` · ${etiquetaObjetivo(entrenamiento.objetivo)}`}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-acento">Completado</span>
          </div>
  
          <dl className="mt-4 grid grid-cols-3 gap-2">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Duración</dt>
              <dd className="mt-1 text-xl font-bold">{entrenamiento.duracionMin ?? "—"} min</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Volumen</dt>
              <dd className="mt-1 text-xl font-bold">{formatearKg(volumenTotal(ejercicios))}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Series</dt>
              <dd className="mt-1 text-xl font-bold">{totalSeries(ejercicios)}</dd>
            </div>
          </dl>
  
          <table className="mt-5 w-full text-left text-sm">
            <thead className="text-[10px] uppercase tracking-wider text-suave">
              <tr>
                <th className="pb-2 font-medium">Ejercicio</th>
                <th className="pb-2 font-medium">Series × reps</th>
                <th className="pb-2 font-medium">Peso máx.</th>
              </tr>
            </thead>
            <tbody>
              {ejercicios.map((e) => (
                <tr key={e.id} className="border-t border-borde">
                  <td className="py-2 pr-2">{e.nombre}</td>
                  <td className="py-2 pr-2 text-suave">{describirSeries(e.series)}</td>
                  <td className="py-2 font-semibold">{formatearKg(Math.max(...e.series.map((s) => s.kg)))}</td>
                </tr>
              ))}
            </tbody>
          </table>
  
          {marcas.map((m) => (
            <p key={m.nombre} className="mt-3 rounded-lg bg-acento/10 px-3 py-2 text-xs font-semibold text-acento">
              Nueva marca personal · {m.nombre} +{formatearKg(m.mejora)}
            </p>
          ))}
  
          {entrenamiento.notas && (
            <p className="mt-4 rounded-lg border border-borde bg-fondo p-3 text-sm text-suave">{entrenamiento.notas}</p>
          )}
        </section>
  
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <a
            href="/"
            className="inline-flex h-12 items-center justify-center rounded-lg bg-primario px-6 text-sm font-bold text-fondo transition hover:brightness-110"
          >
            Volver al inicio
          </a>
          <button
            type="button"
            onClick={onOtro}
            className="inline-flex h-12 items-center justify-center rounded-lg border border-borde bg-superficie px-6 text-sm font-semibold transition hover:border-primario/50"
          >
            Empezar otro
          </button>
        </div>
      </div>
    );
  }
  
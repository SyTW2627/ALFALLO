import { useEffect, useState } from "react";
import { compararCaraACara } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import InsigniaRango from "../progreso/InsigniaRango.jsx";
import { MODALIDADES, detalleMarca, formatearMarca, valorMarca } from "../../lib/versus.js";

// Dos barras enfrentadas desde el centro: la más larga es la del que gana en ese ejercicio.
function BarrasEnfrentadas({ mio, suyo, ganador }) {
  const max = Math.max(mio ?? 0, suyo ?? 0) || 1;
  const ancho = (v) => `${((v ?? 0) / max) * 100}%`;
  return (
    <div className="grid grid-cols-2 gap-1" aria-hidden="true">
      <div className="flex h-2 justify-end overflow-hidden rounded-l-full bg-elevada">
        <div className={`h-full rounded-l-full ${ganador === "yo" ? "bg-primario" : "bg-suave/50"}`} style={{ width: ancho(mio) }} />
      </div>
      <div className="flex h-2 overflow-hidden rounded-r-full bg-elevada">
        <div className={`h-full rounded-r-full ${ganador === "rival" ? "bg-acento" : "bg-suave/50"}`} style={{ width: ancho(suyo) }} />
      </div>
    </div>
  );
}

function Veredicto({ datos, modalidad }) {
  const r = datos.resumen[modalidad === "kg" ? "kg" : "relativa"];
  const nombre = datos.rival.nombre;
  const decididos = r.yo + r.rival;
  let texto;
  if (decididos === 0) texto = "Aún no hay ejercicios en los que podáis compararos. ¡Registrad series de los básicos!";
  else if (r.yo > r.rival) texto = modalidad === "kg" ? `Mueves más hierro que ${nombre}.` : `Kilo a kilo, eres más fuerte que ${nombre}.`;
  else if (r.rival > r.yo) texto = modalidad === "kg" ? `${nombre} mueve más hierro que tú. Por ahora.` : `Kilo a kilo, ${nombre} te supera. Por ahora.`;
  else texto = "Empate. Esto solo se arregla con un versus.";

  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-suave">Ejercicios ganados</p>
      <p className="mt-2 flex items-center justify-center gap-4 text-5xl font-black tabular-nums tracking-tight">
        <span className={r.yo >= r.rival ? "text-primario" : ""}>{r.yo}</span>
        <span className="text-lg font-black italic text-suave">VS</span>
        <span className={r.rival >= r.yo ? "text-acento" : ""}>{r.rival}</span>
      </p>
      <div className="mt-1 flex justify-center gap-16 text-xs text-suave">
        <span>Tú</span>
        <span className="max-w-24 truncate">{nombre}</span>
      </div>
      <p className="mt-4 text-sm font-semibold">{texto}</p>
      {r.empates > 0 && <p className="mt-1 text-xs text-suave">{r.empates} empatados</p>}
    </div>
  );
}

export default function CaraACara({ amigos, inicial, onRetar }) {
  const mutuos = amigos.filter((a) => a.mutuo);
  const [id, setId] = useState(() => (inicial && mutuos.some((a) => a.id === inicial) ? inicial : mutuos[0]?.id ?? ""));
  const [modalidad, setModalidad] = useState("kg");
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    let vigente = true;
    setDatos(null);
    setError("");
    compararCaraACara(id)
      .then((d) => vigente && setDatos(d))
      .catch((err) => {
        if (salirSiSesionCaducada(err)) return;
        if (vigente) setError(err.message || "No se ha podido hacer la comparación.");
      });
    return () => {
      vigente = false;
    };
  }, [id]);

  if (!mutuos.length) {
    return (
      <div className="rounded-2xl border border-primario/30 bg-primario/10 p-5 text-sm">
        <p className="font-semibold">El cara a cara es solo entre amigos.</p>
        <p className="mt-1 text-suave">
          Compara tu fuerza con alguien que te siga y a quien sigas. Así nadie ve tus marcas sin que tú quieras.{" "}
          <a href="/descubrir" className="font-semibold text-primario hover:underline">
            Busca gente en Descubrir
          </a>
          .
        </p>
      </div>
    );
  }

  const sinPeso = datos && modalidad === "relativa" && (!datos.yo.tienePeso || !datos.rival.tienePeso);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1">
          <span className="sr-only">Comparar con</span>
          <select value={id} onChange={(e) => setId(e.target.value)} className="h-11 w-full rounded-xl border border-borde bg-superficie px-3 text-sm">
            {mutuos.map((a) => (
              <option key={a.id} value={a.id}>
                Tú vs {a.nombre}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-1 rounded-full border border-borde p-1" role="group" aria-label="Comparar por">
          {MODALIDADES.map((m) => (
            <button
              key={m.valor}
              type="button"
              aria-pressed={modalidad === m.valor}
              onClick={() => setModalidad(m.valor)}
              className={`h-9 flex-1 rounded-full px-4 text-xs font-semibold transition sm:flex-none ${
                modalidad === m.valor ? "bg-primario/15 text-primario" : "text-suave hover:text-texto"
              }`}
            >
              {m.etiqueta}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}
      {!datos && !error && (
        <p role="status" className="text-sm text-suave">
          Midiendo fuerzas…
        </p>
      )}

      {datos && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5" aria-label="Comparación por ejercicio">
            <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-xs font-semibold text-suave">
              <span>Tú</span>
              <span />
              <span className="truncate text-right">{datos.rival.nombre}</span>
            </div>
            {sinPeso && (
              <p className="mb-3 rounded-xl bg-elevada p-3 text-xs text-suave">
                {!datos.yo.tienePeso ? "Registra tu peso corporal en Logros" : `${datos.rival.nombre} no ha registrado su peso corporal`} para
                comparar la proporción.
              </p>
            )}
            <ul className="divide-y divide-borde">
              {datos.ejercicios.map((e) => {
                const ganador = modalidad === "kg" ? e.ganadorKg : e.ganadorRelativa;
                const mio = valorMarca(e.yo, modalidad);
                const suyo = valorMarca(e.rival, modalidad);
                return (
                  <li key={e.key} className="py-3.5">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{e.label}</p>
                      <button
                        type="button"
                        onClick={() => onRetar({ rival: id, ejercicio: e.key, modalidad })}
                        className="text-xs font-semibold text-primario hover:underline"
                      >
                        Retar aquí
                      </button>
                    </div>
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <InsigniaRango rango={e.yo?.rango} tamano={30} />
                        <div className="min-w-0">
                          <p className={`text-base font-extrabold tabular-nums ${ganador === "yo" ? "text-primario" : ""}`}>
                            {formatearMarca(e.yo, modalidad)}
                          </p>
                          <p className="truncate text-[11px] text-suave">{detalleMarca(e.yo)}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-black italic text-suave">VS</span>
                      <div className="flex min-w-0 flex-row-reverse items-center gap-2 text-right">
                        <InsigniaRango rango={e.rival?.rango} tamano={30} />
                        <div className="min-w-0">
                          <p className={`text-base font-extrabold tabular-nums ${ganador === "rival" ? "text-acento" : ""}`}>
                            {formatearMarca(e.rival, modalidad)}
                          </p>
                          <p className="truncate text-[11px] text-suave">{detalleMarca(e.rival)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2">
                      <BarrasEnfrentadas mio={mio} suyo={suyo} ganador={ganador} />
                    </div>
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-[11px] text-suave">
              Mejor 1RM estimado (Epley) de los últimos {datos.ventanaDias} días, con series de 1 a 10 repeticiones.
            </p>
          </section>

          <aside className="order-first space-y-4 lg:order-none lg:sticky lg:top-6 lg:self-start">
            <Veredicto datos={datos} modalidad={modalidad} />
            <button
              type="button"
              onClick={() => onRetar({ rival: id, modalidad })}
              className="h-12 w-full rounded-xl bg-primario text-sm font-extrabold text-tinta transition hover:brightness-110"
            >
              Retar a {datos.rival.nombre}
            </button>
          </aside>
        </div>
      )}
    </div>
  );
}

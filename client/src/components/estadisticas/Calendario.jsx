import { useMemo, useState } from "react";
import { etiquetaObjetivo, formatearKg } from "../../lib/entrenamiento.js";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];
const nombreMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const nombreDia = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" });

// Clave "2026-11-08" en la hora local del usuario (no en UTC: un entreno a las 00:30 cuenta para ese día).
const claveDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const mayuscula = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// Celdas del mes: huecos al principio para que el día 1 caiga en su día de la semana (empezando en lunes).
function celdasDelMes(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const diasMes = new Date(anio, mes + 1, 0).getDate();
  return [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasMes }, (_, i) => new Date(anio, mes, i + 1)),
  ];
}

function BotonMes({ etiqueta, disabled, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className="grid h-9 w-9 place-items-center rounded-lg border border-borde text-suave transition hover:border-primario/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-borde"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}

export default function Calendario({ entrenamientos, className = "" }) {
  const hoy = new Date();
  const [mes, setMes] = useState(() => ({ anio: hoy.getFullYear(), mes: hoy.getMonth() }));
  const [seleccionado, setSeleccionado] = useState(null); // clave del día abierto

  // Entrenamientos agrupados por día.
  const porDia = useMemo(() => {
    const mapa = new Map();
    for (const w of entrenamientos) {
      const k = claveDia(w.fecha);
      mapa.set(k, [...(mapa.get(k) ?? []), w]);
    }
    return mapa;
  }, [entrenamientos]);

  const primero = entrenamientos[0]?.fecha ?? hoy; // vienen ordenados del más antiguo al más reciente
  const esPrimerMes = mes.anio < primero.getFullYear() || (mes.anio === primero.getFullYear() && mes.mes <= primero.getMonth());
  const esMesActual = mes.anio === hoy.getFullYear() && mes.mes === hoy.getMonth();

  const celdas = celdasDelMes(mes.anio, mes.mes);
  const diasDelMes = celdas.filter((d) => d && porDia.has(claveDia(d)));
  const sesionesMes = diasDelMes.reduce((a, d) => a + porDia.get(claveDia(d)).length, 0);

  const cambiarMes = (delta) => {
    const d = new Date(mes.anio, mes.mes + delta, 1);
    setMes({ anio: d.getFullYear(), mes: d.getMonth() });
    setSeleccionado(null);
  };

  const delDia = seleccionado ? porDia.get(seleccionado) ?? [] : [];
  const fechaSeleccionada = seleccionado ? new Date(`${seleccionado}T12:00:00`) : null;

  return (
    <section className={`rounded-2xl border border-borde bg-superficie p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-bold">Calendario</h2>
          <p className="text-xs text-suave">
            {diasDelMes.length} {diasDelMes.length === 1 ? "día entrenado" : "días entrenados"}
            {sesionesMes > diasDelMes.length && ` · ${sesionesMes} sesiones`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <BotonMes etiqueta="Mes anterior" disabled={esPrimerMes} onClick={() => cambiarMes(-1)}>
            <path d="m15 18-6-6 6-6" />
          </BotonMes>
          <p className="w-36 text-center text-sm font-semibold" aria-live="polite">
            {mayuscula(nombreMes.format(new Date(mes.anio, mes.mes, 1)))}
          </p>
          <BotonMes etiqueta="Mes siguiente" disabled={esMesActual} onClick={() => cambiarMes(1)}>
            <path d="m9 18 6-6-6-6" />
          </BotonMes>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Rejilla del mes */}
        <div>
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold uppercase tracking-wider text-suave" aria-hidden="true">
            {DIAS_SEMANA.map((d) => (
              <span key={d}>{d}</span>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-7 gap-1.5">
            {celdas.map((d, i) => {
              if (!d) return <span key={`h${i}`} aria-hidden="true" />;
              const k = claveDia(d);
              const sesiones = porDia.get(k)?.length ?? 0;
              const esHoy = k === claveDia(hoy);
              const abierto = k === seleccionado;
              const base = "relative grid aspect-square place-items-center rounded-lg text-sm tabular-nums transition";

              if (!sesiones) {
                return (
                  <span key={k} className={`${base} ${esHoy ? "border border-primario/60 text-white" : "text-suave/70"}`}>
                    {d.getDate()}
                  </span>
                );
              }
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={abierto}
                  aria-label={`${nombreDia.format(d)}: ${sesiones} ${sesiones === 1 ? "entrenamiento" : "entrenamientos"}`}
                  onClick={() => setSeleccionado(abierto ? null : k)}
                  className={`${base} bg-primario font-bold text-fondo hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario ${
                    abierto ? "ring-2 ring-white ring-offset-2 ring-offset-superficie" : ""
                  }`}
                >
                  {d.getDate()}
                  {sesiones > 1 && (
                    <span className="absolute right-1 top-0.5 text-[9px] font-extrabold leading-none">×{sesiones}</span>
                  )}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-suave">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-primario" aria-hidden="true" /> Entrenaste
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded border border-primario/60" aria-hidden="true" /> Hoy
            </span>
          </div>
        </div>

        {/* Detalle del día */}
        <div className="min-w-0">
          {!seleccionado ? (
            <div className="grid h-full min-h-32 place-items-center rounded-xl border border-dashed border-borde p-4 text-center text-sm text-suave">
              {diasDelMes.length
                ? "Toca un día marcado para ver qué entrenaste."
                : "No entrenaste ningún día de este mes."}
            </div>
          ) : (
            <div>
              <p className="text-sm font-bold">{mayuscula(nombreDia.format(fechaSeleccionada))}</p>
              <ul className="mt-3 space-y-3">
                {delDia.map((w) => (
                  <li key={w.id} className="rounded-xl border border-borde bg-fondo p-4">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate font-semibold">
                        {w.titulo}
                        {w.objetivo && <span className="font-normal text-suave"> · {etiquetaObjetivo(w.objetivo)}</span>}
                      </p>
                      {w.duracionMin != null && <span className="shrink-0 text-xs text-suave">{w.duracionMin} min</span>}
                    </div>
                    <p className="mt-1 text-xs text-suave">
                      {w.series} series · {formatearKg(w.volumen)}
                    </p>
                    <p className="mt-2 truncate text-xs text-suave">
                      {w.ejercicios.filter((e) => e.series.length).map((e) => e.nombre).join(" · ")}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
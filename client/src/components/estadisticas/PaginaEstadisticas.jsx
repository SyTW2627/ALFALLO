import { useEffect, useMemo, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerHistorial } from "../../lib/api.js";
import { etiquetaZona, etiquetaObjetivo, formatearKg, salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import {
  RANGOS,
  prepararHistorial,
  filtrarPorRango,
  porSemana,
  rachaSemanas,
  resumen,
  ejerciciosEntrenados,
  progresion,
  records,
  seriesPorZona,
  fechaCorta,
  fechaLarga,
  numeroCompacto,
} from "../../lib/estadisticas.js";
import { GraficoBarras, GraficoLinea } from "./graficos.jsx";

const RANGO_GUARDADO = "alfallo:estadisticas:rango";

function leerRango() {
  try {
    const r = localStorage.getItem(RANGO_GUARDADO);
    return RANGOS.some((x) => x.valor === r) ? r : "3m";
  } catch {
    return "3m";
  }
}

function Tarjeta({ titulo, children, accion, className = "" }) {
  return (
    <section className={`rounded-2xl border border-borde bg-superficie p-5 ${className}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-bold">{titulo}</h2>
        {accion}
      </div>
      {children}
    </section>
  );
}

function Kpi({ etiqueta, valor, detalle, acento = false }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <p className="text-xs text-suave">{etiqueta}</p>
      <p className={`mt-2 text-xl font-extrabold tabular-nums sm:text-2xl ${acento ? "text-acento" : ""}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-suave">{detalle}</p>}
    </div>
  );
}

function Vacio({ children }) {
  return <p className="py-8 text-center text-sm text-suave">{children}</p>;
}

export default function PaginaEstadisticas() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [todos, setTodos] = useState([]);
  const [rango, setRango] = useState("3m");
  const [ejercicio, setEjercicio] = useState("");
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }
    setRango(leerRango());
    let cancelado = false;
    setEstado("cargando");
    obtenerHistorial()
      .then((h) => {
        if (cancelado) return;
        setTodos(prepararHistorial(h));
        setEstado("listo");
      })
      .catch((err) => {
        if (cancelado || salirSiSesionCaducada(err)) return;
        setError(err.message || "No se han podido cargar tus estadísticas.");
        setEstado("error");
      });
    return () => {
      cancelado = true;
    };
  }, [intento]);

  const cambiarRango = (valor) => {
    setRango(valor);
    try {
      localStorage.setItem(RANGO_GUARDADO, valor);
    } catch {
      /* almacenamiento no disponible */
    }
  };

  const enRango = useMemo(() => filtrarPorRango(todos, rango), [todos, rango]);
  const datos = useMemo(() => {
    const ejercicios = ejerciciosEntrenados(enRango);
    return {
      resumen: resumen(enRango),
      racha: rachaSemanas(todos),
      semanas: porSemana(enRango, rango),
      zonas: seriesPorZona(enRango),
      ejercicios,
      records: records(todos).slice(0, 6),
      recientes: [...todos].reverse().slice(0, 5),
    };
  }, [enRango, todos, rango]);

  // Si el ejercicio elegido no aparece en el rango, se usa el más entrenado.
  const idEjercicio = datos.ejercicios.some((e) => e.id === ejercicio) ? ejercicio : datos.ejercicios[0]?.id ?? "";
  const puntos = useMemo(() => progresion(enRango, idEjercicio), [enRango, idEjercicio]);

  if (estado === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando estadísticas...
      </p>
    );
  }

  if (estado === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const cabecera = (
    <header className="mb-6">
      <p className="text-xs text-suave">Mi espacio / Estadísticas</p>
      <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tu progreso</h1>
      <p className="mt-1 text-sm text-suave">Lo que no se mide, no se mejora.</p>
    </header>
  );

  if (todos.length === 0) {
    return (
      <div>
        {cabecera}
        <div className="rounded-2xl border border-dashed border-borde bg-superficie p-8 text-center">
          <p className="text-lg font-bold">Aún no hay nada que medir.</p>
          <p className="mt-1 text-sm text-suave">Termina tu primer entrenamiento y aquí verás tu volumen, récords y progresión.</p>
          <a
            href="/entrenamiento"
            className="mt-5 inline-flex h-12 items-center rounded-lg bg-primario px-6 text-sm font-bold text-fondo transition hover:brightness-110"
          >
            Empezar entrenamiento
          </a>
        </div>
      </div>
    );
  }

  const { resumen: r } = datos;
  const maxZona = datos.zonas[0]?.series ?? 1;
  const nombreEjercicio = datos.ejercicios.find((e) => e.id === idEjercicio)?.nombre ?? "";

  return (
    <div>
      {cabecera}

      {/* Filtro de rango: una sola fila, afecta a todo salvo racha y récords */}
      <div role="group" aria-label="Periodo" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {RANGOS.map((x) => (
          <button
            key={x.valor}
            type="button"
            aria-pressed={rango === x.valor}
            onClick={() => cambiarRango(x.valor)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
              rango === x.valor ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-white"
            }`}
          >
            {x.etiqueta}
          </button>
        ))}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi etiqueta="Entrenamientos" valor={r.entrenamientos} detalle={`${r.series} series`} />
        <Kpi etiqueta="Volumen total" valor={formatearKg(r.volumen)} detalle="reps × peso" />
        <Kpi etiqueta="Duración media" valor={r.duracionMedia !== null ? `${r.duracionMedia} min` : "—"} />
        <Kpi
          etiqueta="Racha"
          valor={`${datos.racha} ${datos.racha === 1 ? "semana" : "semanas"}`}
          detalle="seguidas entrenando"
          acento={datos.racha > 0}
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[3fr_2fr]">
        {/* Volumen semanal */}
        <Tarjeta titulo="Volumen por semana">
          {r.entrenamientos === 0 ? (
            <Vacio>No hay entrenamientos en este periodo.</Vacio>
          ) : (
            <>
              <GraficoBarras
                etiqueta="Volumen levantado por semana"
                datos={datos.semanas.map((s) => ({
                  clave: s.inicio.getTime(),
                  etiqueta: fechaCorta(s.inicio),
                  valor: s.volumen,
                  semana: s,
                }))}
                formatoEje={(v) => numeroCompacto(v)}
                renderTooltip={(d) => (
                  <>
                    <p className="text-suave">Semana del {fechaCorta(d.semana.inicio)}</p>
                    <p className="mt-0.5 text-sm font-bold text-white">{formatearKg(d.valor)}</p>
                    <p className="text-suave">
                      {d.semana.entrenamientos} {d.semana.entrenamientos === 1 ? "entrenamiento" : "entrenamientos"}
                    </p>
                  </>
                )}
              />
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-suave hover:text-white">Ver datos</summary>
                <table className="mt-2 w-full text-left">
                  <thead className="text-[10px] uppercase tracking-wider text-suave">
                    <tr>
                      <th className="pb-2 font-medium">Semana</th>
                      <th className="pb-2 font-medium">Entrenamientos</th>
                      <th className="pb-2 text-right font-medium">Volumen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datos.semanas
                      .filter((s) => s.entrenamientos > 0)
                      .reverse()
                      .map((s) => (
                        <tr key={s.inicio.getTime()} className="border-t border-borde">
                          <td className="py-2">{fechaCorta(s.inicio)}</td>
                          <td className="py-2 text-suave">{s.entrenamientos}</td>
                          <td className="py-2 text-right font-semibold tabular-nums">{formatearKg(s.volumen)}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </details>
            </>
          )}
        </Tarjeta>

        {/* Series por zona */}
        <Tarjeta titulo="Series por zona">
          {datos.zonas.length === 0 ? (
            <Vacio>Sin series en este periodo.</Vacio>
          ) : (
            <ul className="space-y-3">
              {datos.zonas.slice(0, 8).map((z) => (
                <li key={z.zona}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span>{etiquetaZona(z.zona)}</span>
                    <span className="font-semibold tabular-nums">{z.series}</span>
                  </div>
                  <div className="mt-1.5 h-2 rounded-full bg-elevada">
                    <div
                      className="h-2 rounded-full bg-primario"
                      style={{ width: `${Math.max((z.series / maxZona) * 100, 2)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      </div>

      {/* Progresión por ejercicio */}
      <Tarjeta
        className="mt-4"
        titulo="Progresión de peso"
        accion={
          datos.ejercicios.length > 0 && (
            <label className="flex items-center gap-2 text-xs text-suave">
              <span className="sr-only">Ejercicio</span>
              <select
                value={idEjercicio}
                onChange={(e) => setEjercicio(e.target.value)}
                className="h-10 max-w-[240px] rounded-lg border border-borde bg-fondo px-3 text-sm text-white outline-none focus:border-primario"
              >
                {datos.ejercicios.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} ({e.sesiones})
                  </option>
                ))}
              </select>
            </label>
          )
        }
      >
        {puntos.length < 2 ? (
          <Vacio>
            {puntos.length === 1
              ? `Solo hay una sesión de ${nombreEjercicio} en este periodo. Con la siguiente verás tu progresión.`
              : "No hay ejercicios con series en este periodo."}
          </Vacio>
        ) : (
          <>
            <p className="-mt-2 mb-3 text-xs text-suave">
              Mejor serie de cada sesión ·{" "}
              <span className={puntos.at(-1).kg >= puntos[0].kg ? "font-semibold text-acento" : "font-semibold text-white"}>
                {puntos.at(-1).kg - puntos[0].kg >= 0 ? "+" : ""}
                {formatearKg(puntos.at(-1).kg - puntos[0].kg)}
              </span>{" "}
              desde {fechaCorta(puntos[0].fecha)}
            </p>
            <GraficoLinea
              etiqueta={`Progresión de peso en ${nombreEjercicio}`}
              puntos={puntos.map((p) => ({ ...p, clave: p.fecha.getTime(), etiqueta: fechaCorta(p.fecha), valor: p.kg }))}
              formatoEje={(v) => `${numeroCompacto(v)}`}
              formatoValor={(v) => formatearKg(v)}
              renderTooltip={(p) => (
                <>
                  <p className="text-suave">
                    {fechaCorta(p.fecha)} · {p.titulo}
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-white">
                    {formatearKg(p.kg)} × {p.reps}
                  </p>
                </>
              )}
            />
          </>
        )}
      </Tarjeta>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Récords */}
        <Tarjeta titulo="Récords personales">
          {datos.records.length === 0 ? (
            <Vacio>Todavía no hay récords con peso.</Vacio>
          ) : (
            <ul className="divide-y divide-borde">
              {datos.records.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{x.nombre}</p>
                    <p className="text-xs text-suave">{fechaLarga(x.fecha)}</p>
                  </div>
                  <p className="shrink-0 text-right">
                    <span className="font-bold tabular-nums">{formatearKg(x.kg)}</span>
                    <span className="text-sm text-suave"> × {x.reps}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>

        {/* Últimos entrenamientos */}
        <Tarjeta titulo="Últimos entrenamientos">
          <ul className="divide-y divide-borde">
            {datos.recientes.map((w) => (
              <li key={w.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {w.titulo}
                    {w.objetivo && <span className="font-normal text-suave"> · {etiquetaObjetivo(w.objetivo)}</span>}
                  </p>
                  <p className="text-xs text-suave">
                    {fechaLarga(w.fecha)}
                    {w.duracionMin !== null && ` · ${w.duracionMin} min`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold tabular-nums">{formatearKg(w.volumen)}</p>
                  <p className="text-xs text-suave">{w.series} series</p>
                </div>
              </li>
            ))}
          </ul>
        </Tarjeta>
      </div>
    </div>
  );
}
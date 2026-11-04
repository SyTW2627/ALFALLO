import { useState } from "react";
import {
  ApiError,
  empezarEntrenamiento,
  guardarEntrenamiento,
  obtenerEntrenamientoActivo,
} from "../../lib/api.js";
import {
  OBJETIVOS,
  etiquetaObjetivo,
  normalizarEntrenamiento,
  guardarPlan,
  conPlan,
  salirSiSesionCaducada,
} from "../../lib/entrenamiento.js";

export default function ElegirEntrenamiento({ dias, onEmpezado }) {
  const [cargando, setCargando] = useState(null); // clave del día o "libre"
  const [error, setError] = useState("");
  const [titulo, setTitulo] = useState("");
  const [objetivo, setObjetivo] = useState("");

  const empezar = async (clave, { titulo, objetivo, ejercicios = [] }) => {
    setCargando(clave);
    setError("");
    try {
      const creado = normalizarEntrenamiento(await empezarEntrenamiento({ titulo, objetivo }));

      // Si viene de una rutina, cargamos ya sus ejercicios (sin series) en el entrenamiento.
      if (ejercicios.length) {
        await guardarEntrenamiento({ ejercicios: ejercicios.map((e) => ({ id: e.id, series: [] })) });
        guardarPlan(creado.id, ejercicios);
      }
      onEmpezado({ ...creado, ejercicios: ejercicios.map((e) => ({ ...e, series: [] })) });
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      // Ya había uno en curso (p. ej. empezado desde otro dispositivo): lo retomamos.
      if (err instanceof ApiError && err.status === 409) {
        try {
          const activo = conPlan(normalizarEntrenamiento(await obtenerEntrenamientoActivo()));
          if (activo) return onEmpezado(activo);
        } catch {
          /* se muestra el error de abajo */
        }
      }
      setError(err.message || "No se ha podido empezar el entrenamiento.");
      setCargando(null);
    }
  };

  const empezarLibre = (e) => {
    e.preventDefault();
    const t = titulo.trim();
    if (!t) {
      setError("Ponle un nombre a tu entrenamiento (por ejemplo, Torso).");
      return;
    }
    empezar("libre", { titulo: t, objetivo });
  };

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs text-suave">Mi espacio / Entrenar</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">¿Qué toca hoy?</h1>
        <p className="mt-1 text-sm text-suave">Elige un día de tu rutina o empieza un entrenamiento libre.</p>
      </header>

      {error && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
        >
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Días de rutina */}
        <section aria-labelledby="desde-rutina">
          <h2 id="desde-rutina" className="mb-3 text-lg font-bold">
            Desde tus rutinas
          </h2>

          {dias.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-borde bg-superficie p-6 text-center">
              <p className="font-semibold">Aún no tienes rutinas.</p>
              <p className="mt-1 text-sm text-suave">
                Crea una para tener tus series y descansos listos cada día.
              </p>
              <a
                href="/rutinas"
                className="mt-4 inline-flex h-11 items-center rounded-lg border border-borde px-5 text-sm font-semibold transition hover:border-primario/50"
              >
                Ir a rutinas
              </a>
            </div>
          ) : (
            <ul className="grid gap-4 sm:grid-cols-2">
              {dias.map((d) => (
                <li key={d.clave} className="flex flex-col rounded-2xl border border-borde bg-superficie p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-xs text-suave">{d.rutina}</p>
                      <p className="mt-1 truncate text-xl font-extrabold">{d.nombre}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-primario/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-primario">
                      {etiquetaObjetivo(d.objetivo)}
                    </span>
                  </div>

                  <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                    {d.ejercicios.slice(0, 4).map((e) => (
                      <li key={e.id} className="flex justify-between gap-3">
                        <span className="truncate">{e.nombre}</span>
                        <span className="shrink-0 text-suave">
                          {e.plan.series} × {e.plan.reps}
                        </span>
                      </li>
                    ))}
                    {d.ejercicios.length > 4 && (
                      <li className="text-xs text-suave">+{d.ejercicios.length - 4} ejercicios más</li>
                    )}
                  </ul>

                  <button
                    type="button"
                    disabled={cargando !== null}
                    onClick={() =>
                      empezar(d.clave, { titulo: d.nombre, objetivo: d.objetivo, ejercicios: d.ejercicios })
                    }
                    className="mt-5 h-11 rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {cargando === d.clave ? "Empezando..." : "Empezar"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Entrenamiento libre */}
        <aside aria-labelledby="libre">
          <h2 id="libre" className="mb-3 text-lg font-bold">
            Entrenamiento libre
          </h2>
          <form
            onSubmit={empezarLibre}
            noValidate
            className="rounded-2xl border border-primario/30 bg-gradient-to-br from-primario/15 to-superficie p-5"
          >
            <label htmlFor="titulo" className="block text-xs font-medium text-suave">
              Nombre
            </label>
            <input
              id="titulo"
              type="text"
              maxLength={40}
              placeholder="Torso, Pierna, Empuje..."
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="mt-1 h-12 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario"
            />

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-suave">Objetivo (opcional)</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(OBJETIVOS).map(([valor, { etiqueta }]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={objetivo === valor}
                    onClick={() => setObjetivo((o) => (o === valor ? "" : valor))}
                    className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                      objetivo === valor
                        ? "border-primario bg-primario/15 text-primario"
                        : "border-borde text-suave hover:text-white"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </fieldset>

            <button
              type="submit"
              disabled={cargando !== null}
              className="mt-5 h-12 w-full rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-60"
            >
              {cargando === "libre" ? "Empezando..." : "Empezar entrenamiento"}
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
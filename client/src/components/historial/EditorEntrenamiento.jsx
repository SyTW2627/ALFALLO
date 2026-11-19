import { useEffect, useMemo, useRef, useState } from "react";
import { editarEntrenamiento, esErrorDeRed } from "../../lib/api.js";
import {
  OBJETIVOS,
  etiquetaZona,
  formatearKg,
  leerNumero,
  normalizarEntrenamiento,
  salirSiSesionCaducada,
} from "../../lib/entrenamiento.js";
import {
  aBorrador,
  validarBorrador,
  huella,
  lineaNueva,
  nuevaSerie,
  conMetricas,
  formatearFechaLarga,
} from "../../lib/historial.js";
import BuscadorEjercicios from "../entrenamiento/BuscadorEjercicios.jsx";

const claseCampo =
  "mt-1 h-12 w-full rounded-lg border bg-fondo px-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario";
const claseNumero =
  "h-10 w-full rounded-lg border bg-fondo px-2 text-center text-sm font-semibold tabular-nums text-white outline-none transition placeholder:text-suave/50 focus:border-primario";

function Icono({ d, size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

function BotonIcono({ etiqueta, d, onClick, disabled, peligro }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={etiqueta}
      className={`grid h-9 w-9 place-items-center rounded-lg text-suave transition disabled:opacity-30 disabled:hover:bg-transparent ${
        peligro ? "hover:bg-red-500/10 hover:text-red-400" : "hover:bg-elevada hover:text-white"
      }`}
    >
      <Icono d={d} />
    </button>
  );
}

function EjercicioEditable({ linea, errores, esPrimero, esUltimo, onCambiar, onMover, onQuitar }) {
  const cambiarSerie = (clave, campo, valor) =>
    onCambiar({ ...linea, series: linea.series.map((s) => (s.clave === clave ? { ...s, [campo]: valor } : s)) });
  const borrarSerie = (clave) => onCambiar({ ...linea, series: linea.series.filter((s) => s.clave !== clave) });
  const anadirSerie = () => onCambiar({ ...linea, series: [...linea.series, nuevaSerie(linea.series.at(-1))] });

  const volumen = linea.series.reduce((a, s) => {
    const v = leerNumero(s.kg) * leerNumero(s.reps);
    return Number.isFinite(v) ? a + v : a;
  }, 0);

  return (
    <article className="rounded-2xl border border-borde bg-superficie p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate font-bold">{linea.nombre}</h3>
          <p className="mt-0.5 text-xs text-suave">
            {etiquetaZona(linea.zona)}
            {linea.zona && " · "}
            {linea.series.length} series · {formatearKg(volumen)}
          </p>
        </div>
        <div className="flex shrink-0 items-center">
          <BotonIcono etiqueta={`Subir ${linea.nombre}`} d="m18 15-6-6-6 6" disabled={esPrimero} onClick={() => onMover(-1)} />
          <BotonIcono etiqueta={`Bajar ${linea.nombre}`} d="m6 9 6 6 6-6" disabled={esUltimo} onClick={() => onMover(1)} />
          <BotonIcono etiqueta={`Quitar ${linea.nombre}`} d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" peligro onClick={onQuitar} />
        </div>
      </div>

      {linea.series.length > 0 ? (
        <table className="mt-3 w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-suave">
            <tr>
              <th className="w-10 pb-2 font-medium">Serie</th>
              <th className="pb-2 pr-2 font-medium">Peso (kg)</th>
              <th className="pb-2 pr-2 font-medium">Reps</th>
              <th className="w-10 pb-2">
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {linea.series.map((s, i) => {
              const error = errores?.[s.clave];
              return (
                <tr key={s.clave} className="border-t border-borde align-top">
                  <td className="py-2 font-bold text-primario">
                    <span className="inline-block pt-2.5">{i + 1}</span>
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="decimal"
                      aria-label={`Peso de la serie ${i + 1} de ${linea.nombre}`}
                      placeholder="0"
                      value={s.kg}
                      onChange={(e) => cambiarSerie(s.clave, "kg", e.target.value)}
                      className={`${claseNumero} ${error ? "border-red-500/60" : "border-borde"}`}
                    />
                  </td>
                  <td className="py-2 pr-2">
                    <input
                      inputMode="numeric"
                      aria-label={`Repeticiones de la serie ${i + 1} de ${linea.nombre}`}
                      placeholder="0"
                      value={s.reps}
                      onChange={(e) => cambiarSerie(s.clave, "reps", e.target.value)}
                      className={`${claseNumero} ${error ? "border-red-500/60" : "border-borde"}`}
                    />
                    {error && <p className="mt-1 text-[11px] text-red-400">{error}</p>}
                  </td>
                  <td className="py-2 text-right">
                    <BotonIcono etiqueta={`Borrar serie ${i + 1}`} d="M18 6 6 18M6 6l12 12" peligro onClick={() => borrarSerie(s.clave)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <p className="mt-3 text-xs text-suave">Sin series: este ejercicio no se guardará si lo dejas así.</p>
      )}

      <button
        type="button"
        onClick={anadirSerie}
        className="mt-3 h-10 w-full rounded-lg border border-dashed border-borde text-sm font-semibold text-suave transition hover:border-primario/50 hover:text-white"
      >
        + Añadir serie
      </button>
    </article>
  );
}

export default function EditorEntrenamiento({ entrenamiento, catalogo, onGuardado, onSalir }) {
  const [borrador, setBorrador] = useState(() => aBorrador(entrenamiento));
  const [buscador, setBuscador] = useState(false);
  const [intentado, setIntentado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [confirmarSalir, setConfirmarSalir] = useState(false);

  const original = useRef(huella(borrador));
  const hayCambios = huella(borrador) !== original.current;
  const { valido, errores, datos } = useMemo(() => validarBorrador(borrador), [borrador]);
  const e = intentado ? errores : {};

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    const aviso = (ev) => {
      if (hayCambios && !guardando) ev.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [hayCambios, guardando]);

  const cambiar = (campo, valor) => setBorrador((b) => ({ ...b, [campo]: valor }));
  const cambiarEjercicios = (fn) => setBorrador((b) => ({ ...b, ejercicios: fn(b.ejercicios) }));

  const moverEjercicio = (indice, direccion) =>
    cambiarEjercicios((lista) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= lista.length) return lista;
      const copia = [...lista];
      [copia[indice], copia[destino]] = [copia[destino], copia[indice]];
      return copia;
    });

  const guardar = async (ev) => {
    ev.preventDefault();
    setIntentado(true);
    setErrorServidor("");
    if (!valido) return;
    if (!hayCambios) return onSalir();

    setGuardando(true);
    try {
      const respuesta = await editarEntrenamiento(borrador.id, datos);
      onGuardado(conMetricas(normalizarEntrenamiento(respuesta)));
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setErrorServidor(
        esErrorDeRed(err)
          ? "Sin conexión: los cambios no se han guardado. Inténtalo cuando vuelvas a tener red."
          : err.message || "No se han podido guardar los cambios."
      );
      setGuardando(false);
    }
  };

  const salir = () => (hayCambios ? setConfirmarSalir(true) : onSalir());
  const fechaVista = datos.inicio ? formatearFechaLarga(new Date(datos.inicio)) : null;

  return (
    <form onSubmit={guardar} noValidate>
      <header className="mb-6">
        <button
          type="button"
          onClick={salir}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-suave transition hover:text-white"
        >
          <Icono d="M19 12H5M12 19l-7-7 7-7" size={14} />
          Historial
        </button>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Editar entrenamiento</h1>
        <p className="mt-1 text-sm text-suave">{fechaVista ?? "Corrige series, pesos, fecha o notas."}</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {/* Datos generales */}
          <section className="rounded-2xl border border-borde bg-superficie p-5" aria-label="Datos generales">
            <label htmlFor="titulo-entreno" className="block text-xs font-medium text-suave">
              Nombre
            </label>
            <input
              id="titulo-entreno"
              type="text"
              maxLength={40}
              value={borrador.titulo}
              onChange={(ev) => cambiar("titulo", ev.target.value)}
              aria-invalid={!!e.titulo}
              className={`${claseCampo} ${e.titulo ? "border-red-500/60" : "border-borde"}`}
            />
            {e.titulo && <p className="mt-1 text-xs text-red-400">{e.titulo}</p>}

            <fieldset className="mt-4">
              <legend className="text-xs font-medium text-suave">Objetivo</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {Object.entries(OBJETIVOS).map(([valor, { etiqueta }]) => (
                  <button
                    key={valor}
                    type="button"
                    aria-pressed={borrador.objetivo === valor}
                    onClick={() => cambiar("objetivo", borrador.objetivo === valor ? "" : valor)}
                    className={`h-10 rounded-full border px-4 text-sm font-semibold transition ${
                      borrador.objetivo === valor
                        ? "border-primario bg-primario/15 text-primario"
                        : "border-borde text-suave hover:text-white"
                    }`}
                  >
                    {etiqueta}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="col-span-2 sm:col-span-1">
                <label htmlFor="fecha-entreno" className="block text-xs font-medium text-suave">
                  Fecha
                </label>
                <input
                  id="fecha-entreno"
                  type="date"
                  value={borrador.fecha}
                  onChange={(ev) => cambiar("fecha", ev.target.value)}
                  className={`${claseCampo} ${e.fecha ? "border-red-500/60" : "border-borde"} [color-scheme:dark]`}
                />
              </div>
              <div>
                <label htmlFor="hora-entreno" className="block text-xs font-medium text-suave">
                  Hora de inicio
                </label>
                <input
                  id="hora-entreno"
                  type="time"
                  value={borrador.hora}
                  onChange={(ev) => cambiar("hora", ev.target.value)}
                  className={`${claseCampo} ${e.fecha ? "border-red-500/60" : "border-borde"} [color-scheme:dark]`}
                />
              </div>
              <div>
                <label htmlFor="duracion-entreno" className="block text-xs font-medium text-suave">
                  Duración (min)
                </label>
                <input
                  id="duracion-entreno"
                  inputMode="numeric"
                  value={borrador.duracion}
                  onChange={(ev) => cambiar("duracion", ev.target.value)}
                  className={`${claseCampo} ${e.duracion ? "border-red-500/60" : "border-borde"}`}
                />
              </div>
            </div>
            {(e.fecha || e.duracion) && <p className="mt-1 text-xs text-red-400">{e.fecha || e.duracion}</p>}
          </section>

          {/* Ejercicios */}
          <section aria-labelledby="titulo-ejercicios" className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 id="titulo-ejercicios" className="text-lg font-bold">
                Ejercicios
              </h2>
              <button
                type="button"
                onClick={() => setBuscador(true)}
                className="h-10 rounded-lg border border-borde px-4 text-sm font-semibold transition hover:border-primario/50"
              >
                + Añadir ejercicio
              </button>
            </div>

            {e.ejercicios && (
              <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {e.ejercicios}
              </p>
            )}

            {borrador.ejercicios.length === 0 && (
              <p className="rounded-2xl border border-dashed border-borde bg-superficie p-6 text-center text-sm text-suave">
                No hay ejercicios. Añade al menos uno con alguna serie.
              </p>
            )}

            {borrador.ejercicios.map((linea, i) => (
              <EjercicioEditable
                key={linea.clave}
                linea={linea}
                errores={e.series}
                esPrimero={i === 0}
                esUltimo={i === borrador.ejercicios.length - 1}
                onCambiar={(nueva) => cambiarEjercicios((l) => l.map((x) => (x.clave === linea.clave ? nueva : x)))}
                onMover={(dir) => moverEjercicio(i, dir)}
                onQuitar={() => cambiarEjercicios((l) => l.filter((x) => x.clave !== linea.clave))}
              />
            ))}
          </section>

          {/* Notas */}
          <section className="rounded-2xl border border-borde bg-superficie p-5">
            <label htmlFor="notas-entreno" className="block text-xs font-medium text-suave">
              Notas
            </label>
            <textarea
              id="notas-entreno"
              rows={3}
              maxLength={500}
              placeholder="Sensaciones, molestias, cambios..."
              value={borrador.notas}
              onChange={(ev) => cambiar("notas", ev.target.value)}
              className="mt-1 w-full rounded-lg border border-borde bg-fondo p-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario"
            />
          </section>
        </div>

        {/* Acciones */}
        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-borde bg-superficie p-5">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-suave">Series</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">
                  {datos.ejercicios.reduce((a, x) => a + x.series.length, 0)}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider text-suave">Volumen</dt>
                <dd className="mt-1 text-xl font-bold tabular-nums">
                  {formatearKg(
                    datos.ejercicios.reduce(
                      (a, x) => a + x.series.reduce((b, s) => b + (Number.isFinite(s.kg * s.reps) ? s.kg * s.reps : 0), 0),
                      0
                    )
                  )}
                </dd>
              </div>
            </dl>

            {errorServidor && (
              <p role="alert" className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {errorServidor}
              </p>
            )}
            {intentado && !valido && (
              <p role="alert" className="mt-4 text-xs text-red-400">
                Revisa los campos marcados en rojo.
              </p>
            )}

            <button
              type="submit"
              disabled={guardando}
              className="mt-4 h-12 w-full rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </button>

            {confirmarSalir ? (
              <div className="mt-3 rounded-lg border border-borde bg-fondo p-3 text-center text-xs">
                <p className="text-suave">Tienes cambios sin guardar. ¿Salir igualmente?</p>
                <div className="mt-2 flex justify-center gap-4">
                  <button type="button" onClick={onSalir} className="font-bold text-red-400 hover:underline">
                    Salir sin guardar
                  </button>
                  <button type="button" onClick={() => setConfirmarSalir(false)} className="font-semibold text-suave hover:text-white">
                    Seguir editando
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={salir}
                disabled={guardando}
                className="mt-3 h-11 w-full rounded-lg text-sm font-semibold text-suave transition hover:bg-elevada hover:text-white"
              >
                Cancelar
              </button>
            )}
          </div>
        </aside>
      </div>

      {buscador && (
        <BuscadorEjercicios
          catalogo={catalogo}
          yaAnadidos={new Set(borrador.ejercicios.map((x) => x.id))}
          onElegir={(ej) => {
            cambiarEjercicios((l) => [...l, lineaNueva(ej)]);
            setBuscador(false);
          }}
          onCerrar={() => setBuscador(false)}
        />
      )}
    </form>
  );
}

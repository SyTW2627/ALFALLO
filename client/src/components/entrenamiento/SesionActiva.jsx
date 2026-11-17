import { useCallback, useEffect, useRef, useState } from "react";
import {
  etiquetaObjetivo,
  totalSeries,
  volumenTotal,
  formatearKg,
  formatearReloj,
  descansoPara,
  borrarPlan,
  normalizarEntrenamiento,
} from "../../lib/entrenamiento.js";
import {
  cambiarActual,
  terminarActual,
  descartarActual,
  sincronizar,
  sincronizarEnUnMomento,
  suscribir,
  aEntrenamiento,
} from "../../lib/sinConexion.js";
import TarjetaEjercicio from "./TarjetaEjercicio.jsx";
import BuscadorEjercicios from "./BuscadorEjercicios.jsx";
import TemporizadorDescanso from "./TemporizadorDescanso.jsx";

// Texto del indicador de guardado a partir del estado de la sincronización.
function estadoGuardado(r) {
  if (r.enviando) return { texto: "Guardando...", clase: "text-suave" };
  if (r.estado === "sin-conexion") return { texto: "Sin conexión · guardado en el móvil", clase: "text-primario" };
  if (r.estado === "sin-sesion") return { texto: "Guardado en el móvil · inicia sesión para subirlo", clase: "text-primario" };
  if (r.estado === "error" || r.estado === "conflicto") return { texto: "Sin subir", clase: "text-red-400", reintentar: true };
  if (r.sinEnviar > 0) return { texto: "Guardado en el móvil", clase: "text-suave" };
  return { texto: "Guardado", clase: "text-acento" };
}

function Cronometro({ inicio }) {
  const [ahora, setAhora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="tabular-nums" aria-label="Tiempo transcurrido">
      {formatearReloj((ahora - new Date(inicio).getTime()) / 1000)}
    </span>
  );
}

function Metrica({ etiqueta, valor }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-suave">{etiqueta}</dt>
      <dd className="mt-1 text-xl font-bold tabular-nums">{valor}</dd>
    </div>
  );
}

export default function SesionActiva({ inicial, catalogo, historial, onTerminado, onDescartado }) {
  const [ejercicios, setEjercicios] = useState(inicial.ejercicios);
  const [notas, setNotas] = useState(inicial.notas);
  const [sync, setSync] = useState({ estado: "ok", sinEnviar: 0 });
  const [buscador, setBuscador] = useState(false);
  const [descanso, setDescanso] = useState(null); // { fin, total, ejercicio }
  const [confirmar, setConfirmar] = useState(null); // "terminar" | "descartar"
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  /* ---------- Guardado ----------
   * Cada cambio se escribe al instante en el móvil (lib/sinConexion.js) y se envía a la API
   * poco después. Sin conexión no se pierde nada: se sube solo cuando vuelve la red.
   */
  const datos = useRef({ ejercicios: inicial.ejercicios, notas: inicial.notas });

  useEffect(() => suscribir(setSync), []);
  useEffect(() => {
    sincronizar(); // por si quedó algo sin subir de antes
  }, []);

  const cambiar = useCallback((cambios, { esperar = 400 } = {}) => {
    datos.current = { ...datos.current, ...cambios };
    if (cambios.ejercicios) setEjercicios(cambios.ejercicios);
    cambiarActual(cambios);
    sincronizarEnUnMomento(esperar);
  }, []);

  /* ---------- Acciones sobre ejercicios ---------- */
  const actualizarEjercicio = (id, fn) =>
    cambiar({ ejercicios: datos.current.ejercicios.map((e) => (e.id === id ? fn(e) : e)) });

  const anadirSerie = (ejercicio, serie) => {
    actualizarEjercicio(ejercicio.id, (e) => ({ ...e, series: [...e.series, serie] }));
    const segundos = descansoPara(ejercicio, inicial.objetivo);
    setDescanso({ fin: Date.now() + segundos * 1000, total: segundos, ejercicio: ejercicio.nombre });
  };

  const borrarSerie = (id, indice) =>
    actualizarEjercicio(id, (e) => ({ ...e, series: e.series.filter((_, i) => i !== indice) }));

  const quitarEjercicio = (id) => cambiar({ ejercicios: datos.current.ejercicios.filter((e) => e.id !== id) });

  const anadirEjercicio = (ejercicio) =>
    cambiar({ ejercicios: [...datos.current.ejercicios, { ...ejercicio, series: [], plan: null }] });

  const mover = (indice, direccion) => {
    const lista = [...datos.current.ejercicios];
    const destino = indice + direccion;
    if (destino < 0 || destino >= lista.length) return;
    [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
    cambiar({ ejercicios: lista });
  };

  /* ---------- Terminar / descartar ---------- */
  const terminar = async () => {
    setOcupado(true);
    setError("");
    const terminado = terminarActual(); // queda guardado en el móvil con su hora de fin
    const r = await sincronizar();
    const respuesta = r.terminados?.[terminado.localId];
    if (terminado.idServidor) borrarPlan(terminado.idServidor);

    if (respuesta) {
      // `novedades` (rangos, hitos y retos conseguidos) la calcula el servidor al terminar.
      onTerminado({ ...normalizarEntrenamiento(respuesta), novedades: respuesta.novedades ?? null });
    } else {
      // Sin conexión (o error): se enseña el resumen con los datos del móvil y se subirá más tarde.
      onTerminado({ ...aEntrenamiento(terminado), pendiente: true, motivo: r.mensaje ?? null });
    }
  };

  const descartar = () => {
    descartarActual();
    sincronizarEnUnMomento(0);
    if (inicial.idServidor) borrarPlan(inicial.idServidor);
    onDescartado();
  };

  const series = totalSeries(ejercicios);
  const volumen = volumenTotal(ejercicios);
  const guardado = estadoGuardado(sync);

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs text-suave">Mi espacio / Entrenar</p>
          <h1 className="mt-2 truncate text-3xl font-extrabold tracking-tight md:text-4xl">{inicial.titulo}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-acento/10 px-2.5 py-1 font-bold uppercase tracking-wider text-acento">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-acento" aria-hidden="true" />
              En curso
            </span>
            {inicial.objetivo && (
              <span className="rounded-full bg-primario/10 px-2.5 py-1 font-bold uppercase tracking-wider text-primario">
                {etiquetaObjetivo(inicial.objetivo)}
              </span>
            )}
            <span role="status" className={`font-semibold ${guardado.clase}`}>
              {guardado.texto}
            </span>
            {guardado.reintentar && (
              <button type="button" onClick={() => sincronizar()} className="font-semibold text-primario hover:underline">
                Reintentar
              </button>
            )}
          </div>
        </div>
        <p className="text-4xl font-extrabold text-primario md:text-5xl">
          <Cronometro inicio={inicial.inicio} />
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Ejercicios */}
        <section aria-label="Ejercicios" className="space-y-4">
          {ejercicios.length === 0 && (
            <div className="rounded-2xl border border-dashed border-borde bg-superficie p-6 text-center">
              <p className="font-semibold">Tu entrenamiento está vacío.</p>
              <p className="mt-1 text-sm text-suave">Añade el primer ejercicio para empezar a registrar series.</p>
            </div>
          )}

          {ejercicios.map((e, i) => (
            <TarjetaEjercicio
              key={e.id}
              ejercicio={e}
              anterior={historial.ultima[e.id]}
              esPrimero={i === 0}
              esUltimo={i === ejercicios.length - 1}
              onAnadirSerie={(serie) => anadirSerie(e, serie)}
              onBorrarSerie={(indice) => borrarSerie(e.id, indice)}
              onQuitar={() => quitarEjercicio(e.id)}
              onMover={(dir) => mover(i, dir)}
            />
          ))}

          <button
            type="button"
            onClick={() => setBuscador(true)}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primario/50 text-sm font-bold text-primario transition hover:bg-primario/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              +
            </span>
            Añadir ejercicio
          </button>
        </section>

        {/* Panel lateral */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-borde bg-superficie p-5">
            <Metrica etiqueta="Ejercicios" valor={ejercicios.length} />
            <Metrica etiqueta="Series" valor={series} />
            <Metrica etiqueta="Volumen" valor={formatearKg(volumen)} />
          </dl>

          <div className="rounded-2xl border border-borde bg-superficie p-5">
            <label htmlFor="notas" className="block text-xs font-medium text-suave">
              Notas
            </label>
            <textarea
              id="notas"
              rows={3}
              maxLength={500}
              placeholder="Sensaciones, molestias, cambios..."
              value={notas}
              onChange={(e) => {
                setNotas(e.target.value);
                cambiar({ notas: e.target.value }, { esperar: 800 });
              }}
              className="mt-1 w-full resize-y rounded-lg border border-borde bg-fondo p-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario"
            />
          </div>

          {guardado.reintentar && sync.mensaje && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {sync.mensaje} Tus series siguen guardadas en este móvil.
            </p>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300"
            >
              {error}
            </p>
          )}

          {confirmar === "terminar" ? (
            <div className="rounded-2xl border border-primario/40 bg-primario/10 p-5">
              <p className="font-bold">¿Terminar el entrenamiento?</p>
              <p className="mt-1 text-sm text-suave">
                {series} series · {formatearKg(volumen)}. Se guardará en tu historial.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={terminar}
                  className="h-11 flex-1 rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 disabled:opacity-60"
                >
                  {ocupado ? "Guardando..." : "Terminar"}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => setConfirmar(null)}
                  className="h-11 flex-1 rounded-lg border border-borde text-sm font-semibold transition hover:border-primario/50"
                >
                  Seguir
                </button>
              </div>
            </div>
          ) : confirmar === "descartar" ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
              <p className="font-bold">¿Descartar el entrenamiento?</p>
              <p className="mt-1 text-sm text-suave">Se borrarán todas las series de hoy. No se puede deshacer.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={descartar}
                  className="h-11 flex-1 rounded-lg bg-red-500 text-sm font-bold text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {ocupado ? "Descartando..." : "Descartar"}
                </button>
                <button
                  type="button"
                  disabled={ocupado}
                  onClick={() => setConfirmar(null)}
                  className="h-11 flex-1 rounded-lg border border-borde text-sm font-semibold transition hover:border-primario/50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled={series === 0}
                onClick={() => setConfirmar("terminar")}
                className="h-12 w-full rounded-lg bg-primario text-sm font-bold text-fondo shadow-lg shadow-primario/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                Terminar entrenamiento
              </button>
              {series === 0 && (
                <p className="text-center text-xs text-suave">Registra al menos una serie para poder terminar.</p>
              )}
              <button
                type="button"
                onClick={() => setConfirmar("descartar")}
                className="h-11 w-full rounded-lg text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                Descartar entrenamiento
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Espacio para que el temporizador flotante no tape el último ejercicio */}
      {descanso && <div className="h-24" aria-hidden="true" />}

      {descanso && (
        <TemporizadorDescanso
          key={descanso.fin}
          fin={descanso.fin}
          total={descanso.total}
          ejercicio={descanso.ejercicio}
          onCerrar={() => setDescanso(null)}
        />
      )}

      {buscador && (
        <BuscadorEjercicios
          catalogo={catalogo}
          yaAnadidos={new Set(ejercicios.map((e) => e.id))}
          onElegir={(e) => {
            anadirEjercicio(e);
            setBuscador(false);
          }}
          onCerrar={() => setBuscador(false)}
        />
      )}
    </div>
  );
}
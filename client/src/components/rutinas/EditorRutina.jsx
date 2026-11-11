import { useEffect, useMemo, useRef, useState } from "react";
import { crearRutina, actualizarRutina } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import {
  MAX_DIAS,
  nuevoDia,
  lineaEjercicio,
  normalizarRutina,
  aPayload,
  validarRutina,
  resumenRutina,
  plural,
} from "../../lib/rutinas.js";
import DiaRutina from "./DiaRutina.jsx";
import BuscadorEjercicios from "../entrenamiento/BuscadorEjercicios.jsx";

export default function EditorRutina({ inicial, catalogo, onGuardada, onSalir }) {
  const [rutina, setRutina] = useState(inicial);
  const [buscadorDia, setBuscadorDia] = useState(null); // clave del día que está añadiendo ejercicios
  const [intentado, setIntentado] = useState(false); // los errores se muestran tras el primer intento de guardar
  const [guardando, setGuardando] = useState(false);
  const [errorServidor, setErrorServidor] = useState("");
  const [confirmarSalir, setConfirmarSalir] = useState(false);

  const original = useRef(JSON.stringify(aPayload(inicial)));
  const hayCambios = JSON.stringify(aPayload(rutina)) !== original.current;
  const { valida, errores } = useMemo(() => validarRutina(rutina), [rutina]);
  const resumen = resumenRutina(rutina);
  const esNueva = !rutina.id;

  // Aviso del navegador si se cierra la pestaña con cambios sin guardar.
  useEffect(() => {
    const aviso = (e) => {
      if (hayCambios && !guardando) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [hayCambios, guardando]);

  /* ---------- Días ---------- */
  const cambiarDias = (fn) => setRutina((r) => ({ ...r, dias: fn(r.dias) }));
  const cambiarDia = (clave, dia) => cambiarDias((dias) => dias.map((d) => (d.clave === clave ? dia : d)));

  const anadirDia = () =>
    cambiarDias((dias) => [...dias, nuevoDia(dias.length + 1, dias.at(-1)?.objetivo ?? "hypertrophy")]);

  const duplicarDia = (indice) =>
    cambiarDias((dias) => {
      const copia = { ...nuevoDia(), nombre: `${dias[indice].nombre} (copia)`.slice(0, 40), objetivo: dias[indice].objetivo };
      copia.ejercicios = dias[indice].ejercicios.map((e) => ({ ...e }));
      return [...dias.slice(0, indice + 1), copia, ...dias.slice(indice + 1)];
    });

  const moverDia = (indice, direccion) =>
    cambiarDias((dias) => {
      const destino = indice + direccion;
      if (destino < 0 || destino >= dias.length) return dias;
      const lista = [...dias];
      [lista[indice], lista[destino]] = [lista[destino], lista[indice]];
      return lista;
    });

  const quitarDia = (clave) => cambiarDias((dias) => dias.filter((d) => d.clave !== clave));

  const diaBuscador = rutina.dias.find((d) => d.clave === buscadorDia);

  /* ---------- Guardar ---------- */
  const guardar = async (e) => {
    e.preventDefault();
    setIntentado(true);
    setErrorServidor("");
    if (!valida) return;

    setGuardando(true);
    try {
      const payload = aPayload(rutina);
      const respuesta = esNueva ? await crearRutina(payload) : await actualizarRutina(rutina.id, payload);
      onGuardada(normalizarRutina(respuesta), esNueva);
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setErrorServidor(err.message || "No se ha podido guardar la rutina.");
      setGuardando(false);
    }
  };

  const salir = () => (hayCambios ? setConfirmarSalir(true) : onSalir());

  return (
    <form onSubmit={guardar} noValidate>
      <header className="mb-6">
        <button
          type="button"
          onClick={salir}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-suave transition hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m12 19-7-7 7-7" />
            <path d="M19 12H5" />
          </svg>
          Mis rutinas
        </button>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          {esNueva ? "Nueva rutina" : "Editar rutina"}
        </h1>
        <p className="mt-1 text-sm text-suave">Organiza tus días. Las series y descansos se ajustan al objetivo de cada uno.</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 space-y-4">
          {/* Nombre */}
          <div className="rounded-2xl border border-borde bg-superficie p-5">
            <label htmlFor="nombre-rutina" className="block text-xs font-medium text-suave">
              Nombre de la rutina
            </label>
            <input
              id="nombre-rutina"
              type="text"
              maxLength={60}
              placeholder="Torso / Pierna, Push Pull Legs..."
              value={rutina.nombre}
              onChange={(e) => setRutina((r) => ({ ...r, nombre: e.target.value }))}
              aria-invalid={intentado && errores.nombre ? "true" : undefined}
              aria-describedby={intentado && errores.nombre ? "nombre-rutina-error" : undefined}
              className={`mt-1 h-12 w-full rounded-lg border bg-fondo px-3 text-base font-semibold text-white outline-none transition placeholder:font-normal placeholder:text-suave/60 focus:border-primario ${
                intentado && errores.nombre ? "border-red-500/60" : "border-borde"
              }`}
            />
            {intentado && errores.nombre && (
              <p id="nombre-rutina-error" className="mt-1 text-xs text-red-400">
                {errores.nombre}
              </p>
            )}
          </div>

          {/* Días */}
          {rutina.dias.map((d, i) => (
            <DiaRutina
              key={d.clave}
              dia={d}
              numero={i + 1}
              total={rutina.dias.length}
              error={intentado ? errores.dias[d.clave] : null}
              puedeDuplicar={rutina.dias.length < MAX_DIAS}
              onCambiar={(dia) => cambiarDia(d.clave, dia)}
              onMover={(dir) => moverDia(i, dir)}
              onDuplicar={() => duplicarDia(i)}
              onQuitar={() => quitarDia(d.clave)}
              onAnadirEjercicio={() => setBuscadorDia(d.clave)}
            />
          ))}

          <button
            type="button"
            onClick={anadirDia}
            disabled={rutina.dias.length >= MAX_DIAS}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-borde text-sm font-bold text-suave transition hover:border-primario/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {rutina.dias.length >= MAX_DIAS ? `Máximo ${MAX_DIAS} días` : `+ Añadir día ${rutina.dias.length + 1}`}
          </button>
        </div>

        {/* Panel lateral: resumen y acciones */}
        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <dl className="grid grid-cols-3 gap-2 rounded-2xl border border-borde bg-superficie p-5">
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Días</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{resumen.dias}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Ejercicios</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{resumen.ejercicios}</dd>
            </div>
            <div>
              <dt className="text-[10px] uppercase tracking-wider text-suave">Series</dt>
              <dd className="mt-1 text-xl font-bold tabular-nums">{resumen.series}</dd>
            </div>
          </dl>

          {catalogo.length === 0 && (
            <p className="rounded-lg border border-primario/30 bg-primario/10 px-3 py-2 text-sm text-primario">
              No se ha podido cargar el catálogo de ejercicios, así que no podrás añadir ejercicios nuevos.
            </p>
          )}

          {intentado && !valida && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errores.general ?? "Revisa los campos marcados antes de guardar."}
            </p>
          )}

          {errorServidor && (
            <p role="alert" className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {errorServidor}
            </p>
          )}

          {confirmarSalir ? (
            <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-5">
              <p className="font-bold">¿Salir sin guardar?</p>
              <p className="mt-1 text-sm text-suave">Perderás los cambios que has hecho en esta rutina.</p>
              <div className="mt-4 flex gap-2">
                <button
                  type="button"
                  onClick={onSalir}
                  className="h-11 flex-1 rounded-lg bg-red-500 text-sm font-bold text-white transition hover:brightness-110"
                >
                  Salir
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmarSalir(false)}
                  className="h-11 flex-1 rounded-lg border border-borde text-sm font-semibold transition hover:border-primario/50"
                >
                  Seguir editando
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                type="submit"
                disabled={guardando || (!esNueva && !hayCambios)}
                className="h-12 w-full rounded-lg bg-primario text-sm font-bold text-fondo shadow-lg shadow-primario/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {guardando ? "Guardando..." : esNueva ? "Crear rutina" : hayCambios ? "Guardar cambios" : "Sin cambios"}
              </button>
              <button
                type="button"
                onClick={salir}
                className="h-11 w-full rounded-lg text-sm font-semibold text-suave transition hover:bg-elevada hover:text-white"
              >
                Cancelar
              </button>
            </div>
          )}

          <p className="text-xs text-suave">
            {plural(resumen.dias, "día", "días")} de {MAX_DIAS} como máximo. Puedes cambiar el orden con las flechas.
          </p>
        </aside>
      </div>

      {diaBuscador && (
        <BuscadorEjercicios
          catalogo={catalogo}
          yaAnadidos={new Set(diaBuscador.ejercicios.map((e) => e.id))}
          onElegir={(ejercicio) => {
            cambiarDia(diaBuscador.clave, {
              ...diaBuscador,
              ejercicios: [...diaBuscador.ejercicios, lineaEjercicio(ejercicio, diaBuscador.objetivo)],
            });
            setBuscadorDia(null);
          }}
          onCerrar={() => setBuscadorDia(null)}
        />
      )}
    </form>
  );
}
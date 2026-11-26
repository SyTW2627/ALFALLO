import { useEffect, useState } from "react";
import { crearVersus } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { MODALIDADES, piqueAleatorio } from "../../lib/versus.js";

const MAX_MENSAJE = 140;

function Opcion({ activa, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      aria-pressed={activa}
      onClick={onClick}
      className={`rounded-xl border text-sm font-semibold transition ${
        activa ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-texto"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function Grupo({ titulo, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-suave">{titulo}</legend>
      {children}
    </fieldset>
  );
}

// Formulario para lanzar un versus. `inicial` permite llegar con el rival o el ejercicio ya elegidos
// (desde un perfil, desde la comparación cara a cara o al pedir la revancha).
export default function NuevoVersus({ opciones, inicial, onCreado }) {
  const { amigos, ejercicios, duraciones, tengoPeso } = opciones;
  const [rival, setRival] = useState("");
  const [ejercicio, setEjercicio] = useState(ejercicios[0]?.key ?? "bench");
  const [modalidad, setModalidad] = useState("kg");
  const [dias, setDias] = useState(7);
  const [mensaje, setMensaje] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inicial) return;
    if (inicial.rival && amigos.some((a) => a.id === inicial.rival)) setRival(inicial.rival);
    if (inicial.ejercicio) setEjercicio(inicial.ejercicio);
    if (inicial.modalidad) setModalidad(inicial.modalidad);
    if (inicial.dias) setDias(inicial.dias);
    if (inicial.mensaje !== undefined) setMensaje(inicial.mensaje);
  }, [inicial, amigos]);

  if (!amigos.length) {
    return (
      <div className="rounded-2xl border border-primario/30 bg-primario/10 p-5 text-sm">
        <p className="font-semibold">Aún no sigues a nadie a quien retar.</p>
        <p className="mt-1 text-suave">
          Solo puedes lanzar un versus a gente que sigues.{" "}
          <a href="/descubrir" className="font-semibold text-primario hover:underline">
            Encuentra rivales en Descubrir
          </a>
          .
        </p>
      </div>
    );
  }

  const faltaPeso = modalidad === "relativa" && !tengoPeso;

  async function enviar(e) {
    e.preventDefault();
    if (!rival) {
      setError("Elige a quién quieres retar.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const duelo = await crearVersus({ rival, ejercicio, modalidad, dias, mensaje: mensaje.trim() || undefined });
      setMensaje("");
      onCreado(duelo);
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido lanzar el versus.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-5 rounded-2xl border border-borde bg-superficie p-4 sm:p-5" aria-labelledby="titulo-nuevo-versus">
      <div>
        <h2 id="titulo-nuevo-versus" className="font-sans text-lg font-bold tracking-normal">
          Lanzar un versus
        </h2>
        <p className="mt-0.5 text-xs text-suave">Tu rival tiene que aceptarlo. Desde ese momento, cada serie cuenta.</p>
      </div>

      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-suave">Rival</span>
        <select
          value={rival}
          onChange={(e) => setRival(e.target.value)}
          className="h-11 w-full rounded-xl border border-borde bg-fondo px-3 text-sm"
        >
          <option value="">Elige a alguien que sigues…</option>
          {amigos.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre}
              {a.mutuo ? " · amigo" : ""}
            </option>
          ))}
        </select>
      </label>

      <Grupo titulo="Ejercicio">
        <div className="flex flex-wrap gap-2">
          {ejercicios.map((x) => (
            <Opcion key={x.key} activa={ejercicio === x.key} onClick={() => setEjercicio(x.key)} className="h-9 px-3">
              {x.label}
            </Opcion>
          ))}
        </div>
      </Grupo>

      <Grupo titulo="¿Quién gana?">
        <div className="grid gap-2 sm:grid-cols-2">
          {MODALIDADES.map((m) => (
            <Opcion key={m.valor} activa={modalidad === m.valor} onClick={() => setModalidad(m.valor)} className="p-3 text-left">
              <span className="block">{m.etiqueta}</span>
              <span className="mt-0.5 block text-xs font-normal text-suave">{m.detalle}</span>
            </Opcion>
          ))}
        </div>
        {faltaPeso && (
          <p className="mt-2 text-xs text-peligro">
            Para competir por proporción necesitas tu peso corporal.{" "}
            <a href="/progreso" className="font-semibold underline">
              Regístralo en Logros
            </a>
            .
          </p>
        )}
      </Grupo>

      <Grupo titulo="Duración">
        <div className="grid grid-cols-4 gap-2">
          {duraciones.map((d) => (
            <Opcion key={d} activa={dias === d} onClick={() => setDias(d)} className="h-9">
              {d} días
            </Opcion>
          ))}
        </div>
      </Grupo>

      <label className="block">
        <span className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.12em] text-suave">
          Mensaje para picar
          <span className="font-normal normal-case tracking-normal tabular-nums">
            {mensaje.length}/{MAX_MENSAJE}
          </span>
        </span>
        <div className="flex gap-2">
          <input
            value={mensaje}
            maxLength={MAX_MENSAJE}
            onChange={(e) => setMensaje(e.target.value)}
            placeholder="Opcional. Ej.: el que pierda paga los batidos"
            className="h-11 min-w-0 flex-1 rounded-xl border border-borde bg-fondo px-3 text-sm"
          />
          <button
            type="button"
            onClick={() => setMensaje((m) => piqueAleatorio(m))}
            title="Sugerir un mensaje"
            className="h-11 shrink-0 rounded-xl border border-borde px-3 text-sm font-semibold text-suave transition hover:text-texto"
          >
            <span aria-hidden="true">🔥</span> Picar
          </button>
        </div>
      </label>

      {error && (
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || faltaPeso}
        className="h-12 w-full rounded-xl bg-primario text-sm font-extrabold text-tinta transition hover:brightness-110 disabled:opacity-50"
      >
        {enviando ? "Lanzando…" : "Lanzar el reto"}
      </button>
    </form>
  );
}

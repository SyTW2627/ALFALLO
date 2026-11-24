import { useCallback, useEffect, useState } from "react";
import { listarAdmin, crearAdmin, eliminarAdmin, editarNotificacion } from "../../lib/api.js";
import { Texto, AreaTexto, BotonPrimario, BotonSecundario, Mensaje, Etiquetita, mensajeDeError, aFechaInput } from "./controles.jsx";

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
const fechaLarga = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

const TIPOS = { aviso: "Aviso", hito: "Nuevo hito", reto: "Nuevo reto" };

const VACIO = { titulo: "", mensaje: "", enlace: "", cuando: "ahora", publicarEn: "" };

/* ---------- Fechas para programar ---------- */

// "aaaa-mm-ddThh:mm" en hora local, el formato de <input type="datetime-local">.
const aFechaHoraInput = (d) => `${aFechaInput(d)}T${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

function mananaALas8() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(8, 0, 0, 0);
  return d;
}

// El próximo lunes a las 8:00 (hoy, si es lunes y aún no son las 8).
function proximoLunesALas8() {
  const d = new Date();
  d.setHours(8, 0, 0, 0);
  const dias = (8 - d.getDay()) % 7; // getDay(): 0 = domingo, 1 = lunes
  d.setDate(d.getDate() + dias);
  if (d <= new Date()) d.setDate(d.getDate() + 7);
  return d;
}

const ATAJOS = [
  { etiqueta: "Mañana a las 8:00", fecha: mananaALas8 },
  { etiqueta: "El lunes a las 8:00", fecha: proximoLunesALas8 },
];

function ItemNotificacion({ n, onPublicar, onEliminar }) {
  return (
    <li className="rounded-2xl border border-borde bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="font-bold">{n.titulo}</p>
        <Etiquetita color={n.tipo === "aviso" ? "suave" : n.tipo === "hito" ? "acento" : "primario"}>{TIPOS[n.tipo] ?? n.tipo}</Etiquetita>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-suave">{n.mensaje}</p>
      <p className="mt-2 text-xs text-suave">
        {n.estado === "programada" ? (
          <span className="font-semibold text-primario">Se publicará el {fechaLarga.format(new Date(n.fecha))}</span>
        ) : (
          <>Publicada el {fecha.format(new Date(n.fecha ?? n.createdAt))}</>
        )}
        {n.enlace && <> · Enlace: <span className="text-texto">{n.enlace}</span></>}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {n.estado === "programada" && <BotonSecundario onClick={() => onPublicar(n)}>Publicar ahora</BotonSecundario>}
        <BotonSecundario peligro onClick={() => onEliminar(n)}>
          {n.estado === "programada" ? "Cancelar" : "Eliminar"}
        </BotonSecundario>
      </div>
    </li>
  );
}

export default function GestionNotificaciones({ alPerderAdmin }) {
  const [lista, setLista] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [enviando, setEnviando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");
  const [errorLista, setErrorLista] = useState("");

  const cargar = useCallback(async () => {
    try {
      setLista(await listarAdmin("notifications"));
    } catch (err) {
      setErrorLista(mensajeDeError(err, alPerderAdmin));
    }
  }, [alPerderAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));
  const programarPara = (d) => setForm((f) => ({ ...f, cuando: "programar", publicarEn: aFechaHoraInput(d) }));

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setAviso("");
    const enlace = form.enlace.trim();
    if (!form.titulo.trim() || !form.mensaje.trim()) return setError("El título y el mensaje son obligatorios.");
    if (enlace && !/^(\/\S*|https:\/\/\S+)$/.test(enlace)) return setError("El enlace debe empezar por / (página de la app) o por https://");

    let publicarEn;
    if (form.cuando === "programar") {
      const d = new Date(form.publicarEn);
      if (!form.publicarEn || Number.isNaN(d.getTime())) return setError("Elige la fecha y la hora de publicación.");
      if (d <= new Date()) return setError("La fecha de publicación tiene que ser futura.");
      publicarEn = d.toISOString();
    }

    setEnviando(true);
    try {
      await crearAdmin("notifications", {
        titulo: form.titulo.trim(),
        mensaje: form.mensaje.trim(),
        enlace: enlace || undefined,
        publicarEn,
      });
      setForm(VACIO);
      setAviso(
        publicarEn
          ? `Notificación programada para el ${fechaLarga.format(new Date(publicarEn))}.`
          : "Notificación enviada. Todos los usuarios la verán en la campanita."
      );
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setEnviando(false);
    }
  }

  async function publicarYa(n) {
    if (!window.confirm(`¿Publicar ahora "${n.titulo}"?`)) return;
    setErrorLista("");
    try {
      await editarNotificacion(n._id, { publicarEn: null });
      cargar();
    } catch (err) {
      setErrorLista(mensajeDeError(err, alPerderAdmin));
    }
  }

  async function eliminar(n) {
    const pregunta =
      n.estado === "programada"
        ? `¿Cancelar la notificación programada "${n.titulo}"?`
        : `¿Eliminar la notificación "${n.titulo}"? Dejará de verse en la campanita.`;
    if (!window.confirm(pregunta)) return;
    setErrorLista("");
    try {
      await eliminarAdmin("notifications", n._id);
      cargar();
    } catch (err) {
      setErrorLista(mensajeDeError(err, alPerderAdmin));
    }
  }

  const programadas = lista?.filter((n) => n.estado === "programada") ?? [];
  // Las programadas, de la más próxima a la más lejana.
  programadas.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const publicadas = lista?.filter((n) => n.estado !== "programada") ?? [];


  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borde bg-superficie p-5">
          <h3 className="font-bold">Enviar notificación a todos</h3>
          <Texto id="notif-titulo" label="Título" value={form.titulo} onChange={cambiar("titulo")} maxLength={80} required />
          <AreaTexto id="notif-mensaje" label="Mensaje" value={form.mensaje} onChange={cambiar("mensaje")} maxLength={500} required />
          <Texto
            id="notif-enlace"
            label="Enlace"
            ayuda="opcional"
            value={form.enlace}
            onChange={cambiar("enlace")}
            placeholder="/progreso?tab=retos"
          />

          <fieldset>
            <legend className="text-xs font-medium text-suave">Cuándo se publica</legend>
            <div className="mt-2 flex gap-1 rounded-full border border-borde p-1" role="radiogroup">
              {[
                { valor: "ahora", etiqueta: "Ahora" },
                { valor: "programar", etiqueta: "Programar" },
              ].map((o) => (
                <button
                  key={o.valor}
                  type="button"
                  role="radio"
                  aria-checked={form.cuando === o.valor}
                  onClick={() =>
                    o.valor === "programar" && !form.publicarEn ? programarPara(proximoLunesALas8()) : setForm((f) => ({ ...f, cuando: o.valor }))
                  }
                  className={`h-8 flex-1 rounded-full text-xs font-semibold transition ${
                    form.cuando === o.valor ? "bg-primario/15 text-primario" : "text-suave hover:text-texto"
                  }`}
                >
                  {o.etiqueta}
                </button>
              ))}
            </div>
            {form.cuando === "programar" && (
              <div className="mt-3 space-y-2">
                <Texto
                  id="notif-fecha"
                  label="Fecha y hora"
                  type="datetime-local"
                  min={aFechaHoraInput(new Date())}
                  value={form.publicarEn}
                  onChange={cambiar("publicarEn")}
                  required
                />
                <div className="flex flex-wrap gap-2">
                  {ATAJOS.map((a) => (
                    <BotonSecundario key={a.etiqueta} onClick={() => programarPara(a.fecha())}>
                      {a.etiqueta}
                    </BotonSecundario>
                  ))}
                </div>
              </div>
            )}
          </fieldset>

          <Mensaje>{error}</Mensaje>
          <BotonPrimario type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : form.cuando === "programar" ? "Programar notificación" : "Enviar a todos"}
          </BotonPrimario>
        </form>
        <Mensaje tipo="ok">{aviso}</Mensaje>
      </div>

      <div className="space-y-6">
        <Mensaje>{errorLista}</Mensaje>
        {programadas.length > 0 && (
          <section aria-labelledby="lista-programadas">
            <h3 id="lista-programadas" className="mb-3 text-sm font-bold text-primario">
              Programadas · {programadas.length}
            </h3>
            <ul className="space-y-3">
              {programadas.map((n) => (
                <ItemNotificacion key={n._id} n={n} onPublicar={publicarYa} onEliminar={eliminar} />
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="lista-notificaciones">
          <h3 id="lista-notificaciones" className="mb-3 text-sm font-bold text-suave">
            Publicadas {lista ? `· ${publicadas.length}` : ""}
          </h3>
          {!lista ? (
            <p className="text-sm text-suave">Cargando...</p>
          ) : !publicadas.length ? (
            <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
              Todavía no se ha publicado ninguna notificación.
            </p>
          ) : (
            <ul className="space-y-3">
              {publicadas.map((n) => (
                <ItemNotificacion key={n._id} n={n} onPublicar={publicarYa} onEliminar={eliminar} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

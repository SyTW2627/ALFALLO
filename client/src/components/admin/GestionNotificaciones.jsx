import { useCallback, useEffect, useState } from "react";
import { listarAdmin, crearAdmin, eliminarAdmin } from "../../lib/api.js";
import { Texto, AreaTexto, BotonPrimario, BotonSecundario, Mensaje, Etiquetita, mensajeDeError } from "./controles.jsx";

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const TIPOS = { aviso: "Aviso", hito: "Nuevo hito", reto: "Nuevo reto" };

const VACIO = { titulo: "", mensaje: "", enlace: "" };

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

  async function enviar(e) {
    e.preventDefault();
    setError("");
    setAviso("");
    const enlace = form.enlace.trim();
    if (!form.titulo.trim() || !form.mensaje.trim()) return setError("El título y el mensaje son obligatorios.");
    if (enlace && !/^(\/\S*|https:\/\/\S+)$/.test(enlace)) return setError("El enlace debe empezar por / (página de la app) o por https://");

    setEnviando(true);
    try {
      await crearAdmin("notifications", {
        titulo: form.titulo.trim(),
        mensaje: form.mensaje.trim(),
        enlace: enlace || undefined,
      });
      setForm(VACIO);
      setAviso("Notificación enviada. Todos los usuarios la verán en la campanita.");
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setEnviando(false);
    }
  }

  async function eliminar(n) {
    if (!window.confirm(`¿Eliminar la notificación "${n.titulo}"? Dejará de verse en la campanita.`)) return;
    setErrorLista("");
    try {
      await eliminarAdmin("notifications", n._id);
      cargar();
    } catch (err) {
      setErrorLista(mensajeDeError(err, alPerderAdmin));
    }
  }

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
          <Mensaje>{error}</Mensaje>
          <BotonPrimario type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar a todos"}
          </BotonPrimario>
        </form>
        <Mensaje tipo="ok">{aviso}</Mensaje>
      </div>

      <section aria-labelledby="lista-notificaciones">
        <h3 id="lista-notificaciones" className="mb-3 text-sm font-bold text-suave">
          Enviadas {lista ? `· ${lista.length}` : ""}
        </h3>
        <Mensaje>{errorLista}</Mensaje>
        {!lista ? (
          <p className="text-sm text-suave">Cargando...</p>
        ) : !lista.length ? (
          <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
            Todavía no se ha enviado ninguna notificación.
          </p>
        ) : (
          <ul className="space-y-3">
            {lista.map((n) => (
              <li key={n._id} className="rounded-2xl border border-borde bg-superficie p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-bold">{n.titulo}</p>
                  <Etiquetita color={n.tipo === "aviso" ? "suave" : n.tipo === "hito" ? "acento" : "primario"}>
                    {TIPOS[n.tipo] ?? n.tipo}
                  </Etiquetita>
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-suave">{n.mensaje}</p>
                <p className="mt-2 text-xs text-suave">
                  {fecha.format(new Date(n.createdAt))}
                  {n.enlace && <> · Enlace: <span className="text-white">{n.enlace}</span></>}
                </p>
                <div className="mt-3">
                  <BotonSecundario peligro onClick={() => eliminar(n)}>
                    Eliminar
                  </BotonSecundario>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

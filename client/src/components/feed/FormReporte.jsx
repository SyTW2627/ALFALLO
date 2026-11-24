import { useState } from "react";
import { reportarPost, reportarComentario, ApiError } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";

export const MOTIVOS_REPORTE = [
  { valor: "spam", etiqueta: "Spam o publicidad" },
  { valor: "ofensivo", etiqueta: "Lenguaje ofensivo" },
  { valor: "acoso", etiqueta: "Acoso a otra persona" },
  { valor: "inapropiado", etiqueta: "Contenido inapropiado" },
  { valor: "otro", etiqueta: "Otro motivo" },
];

// Formulario pequeño para reportar una publicación o (si llega `idComentario`) un comentario.
export default function FormReporte({ idPost, idComentario, onCerrar }) {
  const [motivo, setMotivo] = useState("spam");
  const [detalle, setDetalle] = useState("");
  const [estado, setEstado] = useState("editando"); // editando | enviando | hecho
  const [mensaje, setMensaje] = useState("");

  const id = `reporte-${idPost}-${idComentario ?? "post"}`;

  async function enviar(e) {
    e.preventDefault();
    setEstado("enviando");
    setMensaje("");
    try {
      const datos = { motivo, detalle: detalle.trim() || undefined };
      const r = idComentario ? await reportarComentario(idPost, idComentario, datos) : await reportarPost(idPost, datos);
      setMensaje(r.message || "Gracias. Un administrador lo revisará.");
      setEstado("hecho");
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      // 409 = ya lo había reportado: no es un error para el usuario.
      if (err instanceof ApiError && err.status === 409) {
        setMensaje("Ya lo habías reportado. Un administrador lo revisará.");
        setEstado("hecho");
        return;
      }
      setMensaje(err?.message || "No se ha podido enviar el reporte.");
      setEstado("editando");
    }
  }

  if (estado === "hecho") {
    return (
      <div role="status" className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-acento/30 bg-acento/5 px-3 py-2 text-xs text-acento">
        <span>{mensaje}</span>
        <button type="button" onClick={onCerrar} className="font-semibold text-suave hover:text-texto">
          Cerrar
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={enviar} className="mt-2 space-y-2 rounded-xl border border-borde bg-fondo p-3" aria-label="Reportar">
      <p className="text-xs font-semibold">{idComentario ? "Reportar comentario" : "Reportar publicación"}</p>
      <label htmlFor={`${id}-motivo`} className="sr-only">
        Motivo
      </label>
      <select
        id={`${id}-motivo`}
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        className="h-10 w-full rounded-lg border border-borde bg-superficie px-3 text-sm outline-none focus:border-primario"
      >
        {MOTIVOS_REPORTE.map((m) => (
          <option key={m.valor} value={m.valor}>
            {m.etiqueta}
          </option>
        ))}
      </select>
      <label htmlFor={`${id}-detalle`} className="sr-only">
        Detalle (opcional)
      </label>
      <input
        id={`${id}-detalle`}
        value={detalle}
        onChange={(e) => setDetalle(e.target.value)}
        maxLength={300}
        placeholder="Detalle (opcional)"
        className="h-10 w-full rounded-lg border border-borde bg-superficie px-3 text-sm outline-none placeholder:text-suave focus:border-primario"
      />
      {mensaje && (
        <p role="alert" className="text-xs text-peligro">
          {mensaje}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="h-9 rounded-lg bg-primario px-4 text-xs font-bold text-tinta transition hover:brightness-110 disabled:opacity-50"
        >
          {estado === "enviando" ? "Enviando…" : "Enviar reporte"}
        </button>
        <button type="button" onClick={onCerrar} className="h-9 rounded-lg px-3 text-xs font-semibold text-suave hover:text-texto">
          Cancelar
        </button>
      </div>
    </form>
  );
}

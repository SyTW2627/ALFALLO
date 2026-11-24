import { useCallback, useEffect, useState } from "react";
import { listarReportes, resolverReporte } from "../../lib/api.js";
import { MOTIVOS_REPORTE } from "../feed/FormReporte.jsx";
import { BotonSecundario, Mensaje, Etiquetita, mensajeDeError } from "./controles.jsx";

const fecha = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const nombreMotivo = (m) => MOTIVOS_REPORTE.find((x) => x.valor === m)?.etiqueta ?? m;

const VISTAS = [
  { valor: "pendiente", etiqueta: "Pendientes" },
  { valor: "resuelto", etiqueta: "Resueltos" },
];

function Grupo({ g, pendiente, onResolver, ocupado }) {
  const [verDetalle, setVerDetalle] = useState(false);
  const motivos = Object.entries(g.motivos).filter(([, n]) => n > 0);

  return (
    <li className="rounded-2xl border border-borde bg-superficie p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Etiquetita color={g.tipo === "comentario" ? "suave" : "primario"}>
          {g.tipo === "comentario" ? "Comentario" : "Publicación"}
        </Etiquetita>
        <span className="text-sm font-semibold">de {g.autor?.nombre ?? "Usuario eliminado"}</span>
        <span className="ml-auto text-xs font-bold text-peligro">
          {g.total} {g.total === 1 ? "reporte" : "reportes"}
        </span>
      </div>

      <blockquote className="mt-3 whitespace-pre-line break-words rounded-xl border-l-2 border-red-400/60 bg-fondo px-3 py-2 text-sm">
        {g.contenido || <span className="text-suave">(sin texto)</span>}
      </blockquote>
      {!g.existe && pendiente && <p className="mt-1 text-xs text-suave">Este contenido ya no existe (lo borró su autor).</p>}

      <div className="mt-3 flex flex-wrap gap-1.5">
        {motivos.map(([m, n]) => (
          <Etiquetita key={m} color="rojo">
            {nombreMotivo(m)}
            {n > 1 ? ` ×${n}` : ""}
          </Etiquetita>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setVerDetalle((v) => !v)}
        aria-expanded={verDetalle}
        className="mt-2 text-xs font-semibold text-suave hover:text-texto"
      >
        {verDetalle ? "Ocultar quién lo reportó" : "Ver quién lo reportó"}
      </button>
      {verDetalle && (
        <ul className="mt-2 space-y-1 text-xs text-suave">
          {g.reportes.map((r, i) => (
            <li key={i}>
              <span className="text-texto">{r.por}</span> · {nombreMotivo(r.motivo)} · {fecha.format(new Date(r.fecha))}
              {r.detalle && <> · “{r.detalle}”</>}
            </li>
          ))}
        </ul>
      )}

      {pendiente ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {g.existe && (
            <BotonSecundario peligro disabled={ocupado} onClick={() => onResolver(g, "eliminar")}>
              {g.tipo === "comentario" ? "Eliminar comentario" : "Eliminar publicación"}
            </BotonSecundario>
          )}
          <BotonSecundario disabled={ocupado} onClick={() => onResolver(g, "descartar")}>
            {g.existe ? "Descartar (no pasa nada)" : "Cerrar"}
          </BotonSecundario>
        </div>
      ) : (
        <p className="mt-3 text-xs text-suave">
          {g.estado === "eliminado" ? "Eliminado" : "Descartado"}
          {g.resueltoPor ? ` por ${g.resueltoPor}` : ""}
          {g.resueltoEn ? ` · ${fecha.format(new Date(g.resueltoEn))}` : ""}
        </p>
      )}
    </li>
  );
}

export default function GestionModeracion({ alPerderAdmin }) {
  const [vista, setVista] = useState("pendiente");
  const [grupos, setGrupos] = useState(null);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    setError("");
    try {
      setGrupos(await listarReportes(vista));
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }, [vista, alPerderAdmin]);

  useEffect(() => {
    setGrupos(null);
    cargar();
  }, [cargar]);

  async function resolver(g, accion) {
    const pregunta =
      accion === "eliminar"
        ? `¿Eliminar ${g.tipo === "comentario" ? "este comentario" : "esta publicación"} de ${g.autor?.nombre ?? "este usuario"}?`
        : "¿Descartar estos reportes? El contenido se queda como está.";
    if (!window.confirm(pregunta)) return;
    setOcupado(true);
    setAviso("");
    try {
      await resolverReporte({ post: g.post, comment: g.comment ?? undefined, accion });
      setAviso(accion === "eliminar" ? "Contenido eliminado." : "Reportes descartados.");
      await cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-suave">
          Publicaciones y comentarios que los usuarios han reportado. Lo más reportado aparece primero.
        </p>
        <div className="flex gap-1 rounded-full border border-borde p-1" role="group" aria-label="Ver reportes">
          {VISTAS.map((v) => (
            <button
              key={v.valor}
              type="button"
              aria-pressed={vista === v.valor}
              onClick={() => setVista(v.valor)}
              className={`h-8 rounded-full px-3 text-xs font-semibold transition ${
                vista === v.valor ? "bg-primario/15 text-primario" : "text-suave hover:text-texto"
              }`}
            >
              {v.etiqueta}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <Mensaje>{error}</Mensaje>
        <Mensaje tipo="ok">{aviso}</Mensaje>
        {!grupos ? (
          !error && <p className="text-sm text-suave">Cargando...</p>
        ) : !grupos.length ? (
          <p className="rounded-2xl border border-dashed border-borde p-8 text-center text-sm text-suave">
            {vista === "pendiente" ? "No hay reportes pendientes. Todo en orden." : "Todavía no se ha resuelto ningún reporte."}
          </p>
        ) : (
          <ul className="space-y-3">
            {grupos.map((g) => (
              <Grupo key={g.clave} g={g} pendiente={vista === "pendiente"} onResolver={resolver} ocupado={ocupado} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

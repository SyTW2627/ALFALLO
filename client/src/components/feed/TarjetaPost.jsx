import { useState } from "react";
import { iniciales } from "../../lib/auth.js";
import { darKudos, quitarKudos, comentarPost, eliminarComentario, eliminarPost } from "../../lib/api.js";
import {
  etiquetaObjetivo,
  totalSeries,
  volumenTotal,
  formatearKg,
  salirSiSesionCaducada,
} from "../../lib/entrenamiento.js";
import { normalizarComentario, haceCuanto, MAX_COMENTARIO } from "../../lib/feed.js";

// "4 × 8" si todas las series tienen las mismas reps; si no, "8 · 8 · 6".
function describirSeries(series) {
  const reps = series.map((s) => s.reps);
  return reps.every((r) => r === reps[0]) ? `${reps.length} × ${reps[0]}` : reps.join(" · ");
}

function Avatar({ nombre, pequeno = false }) {
  return (
    <div
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full bg-elevada font-bold ${
        pequeno ? "h-8 w-8 text-[10px]" : "h-10 w-10 text-xs"
      }`}
    >
      {iniciales(nombre)}
    </div>
  );
}

function DatosEntrenamiento({ entrenamiento }) {
  const ejercicios = entrenamiento.ejercicios.filter((e) => e.series.length > 0);
  return (
    <div className="mt-4 rounded-xl border border-borde bg-fondo p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-primario">
          {entrenamiento.titulo}
          {entrenamiento.objetivo && ` · ${etiquetaObjetivo(entrenamiento.objetivo)}`}
        </span>
        <span className="text-[10px] font-bold uppercase tracking-wider text-acento">Completado</span>
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-suave">Duración</dt>
          <dd className="mt-1 text-xl font-bold">{entrenamiento.duracionMin ?? "—"} min</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-suave">Volumen</dt>
          <dd className="mt-1 text-xl font-bold">{formatearKg(volumenTotal(ejercicios))}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-suave">Series</dt>
          <dd className="mt-1 text-xl font-bold">{totalSeries(ejercicios)}</dd>
        </div>
      </dl>

      {ejercicios.length > 0 && (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-[10px] uppercase tracking-wider text-suave">
            <tr>
              <th className="pb-2 font-medium">Ejercicio</th>
              <th className="pb-2 font-medium">Series × reps</th>
              <th className="pb-2 font-medium">Peso máx.</th>
            </tr>
          </thead>
          <tbody>
            {ejercicios.map((e, i) => (
              <tr key={`${e.id}-${i}`} className="border-t border-borde">
                <td className="py-2 pr-2">{e.nombre}</td>
                <td className="py-2 pr-2 text-suave">{describirSeries(e.series)}</td>
                <td className="py-2 font-semibold">{formatearKg(Math.max(...e.series.map((s) => s.kg)))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function TarjetaPost({ post, idUsuario, onEliminado }) {
  const [kudos, setKudos] = useState({ total: post.kudos, mio: post.tengoKudos });
  const [comentarios, setComentarios] = useState(post.comentarios);
  const [verComentarios, setVerComentarios] = useState(false);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [borrando, setBorrando] = useState(false);
  const [error, setError] = useState("");

  const esMio = post.autor.id === idUsuario;

  function manejarError(err, mensaje) {
    if (salirSiSesionCaducada(err)) return;
    setError(err?.message || mensaje);
  }

  // Actualización optimista: el botón cambia al momento y se corrige si la API falla.
  async function alternarKudos() {
    const anterior = kudos;
    setKudos({ total: anterior.total + (anterior.mio ? -1 : 1), mio: !anterior.mio });
    setError("");
    try {
      const r = await (anterior.mio ? quitarKudos(post.id) : darKudos(post.id));
      setKudos({ total: r.kudosCount, mio: r.hasKudo });
    } catch (err) {
      setKudos(anterior);
      manejarError(err, "No se han podido dar los ánimos.");
    }
  }

  async function enviarComentario(e) {
    e.preventDefault();
    const limpio = texto.trim();
    if (!limpio || enviando) return;
    setEnviando(true);
    setError("");
    try {
      const nuevo = normalizarComentario(await comentarPost(post.id, limpio));
      setComentarios((cs) => [...cs, nuevo]);
      setTexto("");
    } catch (err) {
      manejarError(err, "No se ha podido publicar el comentario.");
    } finally {
      setEnviando(false);
    }
  }

  async function borrarComentario(id) {
    setError("");
    try {
      await eliminarComentario(post.id, id);
      setComentarios((cs) => cs.filter((c) => c.id !== id));
    } catch (err) {
      manejarError(err, "No se ha podido borrar el comentario.");
    }
  }

  async function borrarPost() {
    if (!window.confirm("¿Quitar esta publicación del feed? Tu entrenamiento no se borra.")) return;
    setBorrando(true);
    setError("");
    try {
      await eliminarPost(post.id);
      onEliminado?.(post.id);
    } catch (err) {
      setBorrando(false);
      manejarError(err, "No se ha podido eliminar la publicación.");
    }
  }

  return (
    <article className="rounded-2xl border border-borde bg-superficie p-5">
      <header className="flex items-center gap-3">
        <Avatar nombre={post.autor.nombre} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {post.autor.nombre}
            {esMio && <span className="ml-2 text-xs font-normal text-suave">(tú)</span>}
          </p>
          <p className="text-xs text-suave">
            <time dateTime={post.fecha}>{haceCuanto(post.fecha)}</time>
          </p>
        </div>
        {esMio && (
          <button
            type="button"
            onClick={borrarPost}
            disabled={borrando}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-suave transition hover:bg-elevada hover:text-red-300 disabled:opacity-50"
          >
            {borrando ? "Eliminando…" : "Eliminar"}
          </button>
        )}
      </header>

      {post.texto && <p className="mt-4 whitespace-pre-line break-words text-sm">{post.texto}</p>}

      {post.entrenamiento ? (
        <DatosEntrenamiento entrenamiento={post.entrenamiento} />
      ) : (
        <p className="mt-4 rounded-xl border border-borde bg-fondo p-4 text-sm text-suave">
          Este entrenamiento ya no está disponible.
        </p>
      )}

      <div className="mt-4 flex items-center gap-4 text-sm">
        <button
          type="button"
          onClick={alternarKudos}
          aria-pressed={kudos.mio}
          className={`rounded-lg px-3 py-2 font-semibold transition ${
            kudos.mio ? "bg-primario/15 text-primario hover:bg-primario/25" : "bg-elevada hover:bg-borde"
          }`}
        >
          {kudos.mio ? "Ánimos dados" : "Dar ánimos"} · {kudos.total}
        </button>
        <button
          type="button"
          onClick={() => setVerComentarios((v) => !v)}
          aria-expanded={verComentarios}
          className="text-suave transition hover:text-white"
        >
          {comentarios.length === 1 ? "1 comentario" : `${comentarios.length} comentarios`}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}

      {verComentarios && (
        <section className="mt-4 space-y-3 border-t border-borde pt-4" aria-label="Comentarios">
          {comentarios.map((c) => (
            <div key={c.id} className="flex gap-3">
              <Avatar nombre={c.autor.nombre} pequeno />
              <div className="min-w-0 flex-1 rounded-xl bg-elevada px-3 py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-xs font-semibold">
                    {c.autor.nombre} <span className="font-normal text-suave">· {haceCuanto(c.fecha)}</span>
                  </p>
                  {/* Puede borrarlo su autor o el dueño del post (igual que en la API) */}
                  {(c.autor.id === idUsuario || esMio) && (
                    <button
                      type="button"
                      onClick={() => borrarComentario(c.id)}
                      className="text-[11px] text-suave transition hover:text-red-300"
                    >
                      Borrar
                    </button>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-line break-words text-sm">{c.texto}</p>
              </div>
            </div>
          ))}

          <form onSubmit={enviarComentario} className="flex gap-2">
            <label htmlFor={`comentario-${post.id}`} className="sr-only">
              Escribe un comentario
            </label>
            <input
              id={`comentario-${post.id}`}
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              maxLength={MAX_COMENTARIO}
              placeholder="Escribe un comentario…"
              className="h-11 min-w-0 flex-1 rounded-lg border border-borde bg-fondo px-3 text-sm placeholder:text-suave focus:border-primario focus:outline-none"
            />
            <button
              type="submit"
              disabled={!texto.trim() || enviando}
              className="h-11 rounded-lg bg-primario px-4 text-sm font-bold text-fondo transition hover:brightness-110 disabled:opacity-50"
            >
              {enviando ? "…" : "Enviar"}
            </button>
          </form>
        </section>
      )}
    </article>
  );
}

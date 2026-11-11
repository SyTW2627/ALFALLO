import { useState } from "react";
import { publicarEntrenamiento, ApiError } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { MAX_TEXTO_POST } from "../../lib/feed.js";

// Se muestra en el resumen de un entrenamiento terminado para compartirlo en el feed.
export default function PublicarEntrenamiento({ idEntrenamiento }) {
  const [texto, setTexto] = useState("");
  const [estado, setEstado] = useState("editando"); // editando | enviando | publicado
  const [error, setError] = useState("");

  async function publicar(e) {
    e.preventDefault();
    setEstado("enviando");
    setError("");
    try {
      await publicarEntrenamiento({ idEntrenamiento, texto });
      setEstado("publicado");
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      // 409: este entrenamiento ya estaba publicado → para el usuario es lo mismo que publicarlo.
      if (err instanceof ApiError && err.status === 409) {
        setEstado("publicado");
        return;
      }
      setError(err?.message || "No se ha podido publicar el entrenamiento.");
      setEstado("editando");
    }
  }

  if (estado === "publicado") {
    return (
      <div className="mt-6 rounded-2xl border border-acento/30 bg-acento/10 p-5 text-center">
        <p className="font-bold text-acento">¡Publicado en la comunidad!</p>
        <a href="/" className="mt-2 inline-block text-sm font-semibold text-suave underline hover:text-white">
          Ver el feed
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={publicar} className="mt-6 rounded-2xl border border-borde bg-superficie p-5">
      <label htmlFor="texto-post" className="text-sm font-bold">
        Compártelo con la comunidad
      </label>
      <textarea
        id="texto-post"
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        maxLength={MAX_TEXTO_POST}
        rows={3}
        placeholder="¿Cómo ha ido? (opcional)"
        className="mt-3 w-full resize-none rounded-lg border border-borde bg-fondo p-3 text-sm placeholder:text-suave focus:border-primario focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3">
        <span className="text-xs text-suave">
          {texto.length}/{MAX_TEXTO_POST}
        </span>
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110 disabled:opacity-50"
        >
          {estado === "enviando" ? "Publicando…" : "Publicar"}
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-xs text-red-300">
          {error}
        </p>
      )}
    </form>
  );
}

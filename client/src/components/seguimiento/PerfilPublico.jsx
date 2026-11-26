import { useEffect, useState } from "react";
import { getUsuario, iniciales } from "../../lib/auth.js";
import { obtenerPerfilPublico } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { normalizarPerfilPublico } from "../../lib/seguimiento.js";
import Esqueleto from "../Esqueleto.jsx";
import TarjetaPost from "../feed/TarjetaPost.jsx";
import BotonSeguir from "./BotonSeguir.jsx";

function formatearFecha(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

function Estadistica({ etiqueta, valor }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-4 text-center">
      <p className="text-xl font-bold">{valor}</p>
      <p className="mt-1 text-xs text-suave">{etiqueta}</p>
    </div>
  );
}

function Aviso({ titulo, texto }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-6 text-center">
      <p className="font-bold">{titulo}</p>
      <p className="mt-1 text-sm text-suave">{texto}</p>
      <a href="/" className="mt-4 inline-block text-sm font-semibold text-primario">
        Volver al inicio
      </a>
    </div>
  );
}

// Perfil de otro usuario: /usuario?id=<id>
export default function PerfilPublico() {
  const [yo, setYo] = useState(null);
  const [perfil, setPerfil] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const actual = getUsuario();
    if (!actual) {
      window.location.replace("/login");
      return;
    }
    setYo(actual);

    const id = new URLSearchParams(window.location.search).get("id");
    if (!id) {
      setError("No se ha indicado qué usuario quieres ver.");
      return;
    }
    // Tu propio perfil ya tiene su página.
    if (id === actual.id) {
      window.location.replace("/perfil-usuario");
      return;
    }

    let cancelado = false;
    obtenerPerfilPublico(id)
      .then((r) => !cancelado && setPerfil(normalizarPerfilPublico(r)))
      .catch((err) => {
        if (cancelado || salirSiSesionCaducada(err)) return;
        setError(err?.status === 404 || err?.status === 400 ? "Este usuario no existe." : err?.message);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (error) return <Aviso titulo="No se puede mostrar el perfil" texto={error} />;
  if (!perfil) return <Esqueleto variante="perfil" />;

  const { estadisticas } = perfil;

  // Al seguir / dejar de seguir, la API devuelve el nuevo número de seguidores.
  function alCambiarSeguimiento({ loSigo, seguidores }) {
    setPerfil((p) => ({ ...p, loSigo, estadisticas: { ...p.estadisticas, seguidores } }));
  }

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs text-suave">Comunidad / Perfil</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">{perfil.nombre}</h1>
      </header>

      <section className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-acento/10 text-lg font-bold text-acento ring-1 ring-acento/30">
          {iniciales(perfil.nombre)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{perfil.nombre}</p>
          <p className="truncate text-sm text-suave">Miembro desde {formatearFecha(perfil.creadoEn)}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2 sm:flex-row sm:items-center">
          {perfil.loSigo && (
            <a
              href={`/versus?rival=${encodeURIComponent(perfil.id)}`}
              className="inline-flex h-10 items-center rounded-lg border border-acento/50 px-3 text-sm font-bold text-acento transition hover:bg-acento/10"
            >
              Retar
            </a>
          )}
          <BotonSeguir idUsuario={perfil.id} loSigo={perfil.loSigo} onCambio={alCambiarSeguimiento} />
        </div>
      </section>

      <div className="mt-4 grid grid-cols-3 gap-4">
        <Estadistica etiqueta="Entrenamientos" valor={estadisticas.entrenamientos} />
        <Estadistica etiqueta="Seguidores" valor={estadisticas.seguidores} />
        <Estadistica etiqueta="Siguiendo" valor={estadisticas.seguidos} />
      </div>

      <section className="mt-8" aria-labelledby="publicaciones">
        <h2 id="publicaciones" className="mb-3 text-lg font-bold">
          Entrenamientos publicados
        </h2>
        {perfil.posts.length === 0 ? (
          <p className="rounded-2xl border border-borde bg-superficie p-6 text-center text-sm text-suave">
            {perfil.nombre} todavía no ha publicado ningún entrenamiento.
          </p>
        ) : (
          <div className="space-y-4">
            {perfil.posts.map((p) => (
              <TarjetaPost key={p.id} post={p} idUsuario={yo.id} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerFeed, obtenerSeguidos } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { normalizarPost, POSTS_POR_PAGINA } from "../../lib/feed.js";
import { normalizarUsuarioBasico } from "../../lib/seguimiento.js";
import TarjetaPost from "./TarjetaPost.jsx";

function Cargando() {
  return (
    <div aria-busy="true" className="space-y-4">
      <span className="sr-only" role="status">Cargando el feed…</span>
      <div className="h-64 animate-pulse rounded-2xl border border-borde bg-superficie" />
      <div className="h-64 animate-pulse rounded-2xl border border-borde bg-superficie" />
    </div>
  );
}

function Aviso({ titulo, texto, children }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-6 text-center">
      <p className="font-bold">{titulo}</p>
      <p className="mt-1 text-sm text-suave">{texto}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// `soloSeguidos`: en el inicio solo se ven los entrenamientos de la gente que sigues (y los tuyos).
// Sin él (página Descubrir) se ven todos y cada autor lleva su botón de seguir.
export default function FeedComunidad({ soloSeguidos = false }) {
  // undefined = aún no se ha comprobado la sesión (evita parpadeos en el primer render)
  const [usuario, setUsuario] = useState(undefined);
  const [posts, setPosts] = useState([]);
  const [pagina, setPagina] = useState(1);
  const [hayMas, setHayMas] = useState(false);
  const [estado, setEstado] = useState("cargando"); // cargando | listo | error | mas
  const [error, setError] = useState("");
  const [intento, setIntento] = useState(0);
  // Ids de la gente que sigues (solo hace falta para mostrar los botones de seguir).
  const [seguidos, setSeguidos] = useState(null);

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  useEffect(() => {
    if (!usuario) return;
    let cancelado = false;
    setEstado(pagina === 1 ? "cargando" : "mas");
    setError("");

    obtenerFeed({ pagina, limite: POSTS_POR_PAGINA, soloSeguidos })
      .then((datos) => {
        if (cancelado) return;
        const nuevos = datos.map(normalizarPost);
        // Se evitan duplicados por si alguien publicó entre una página y la siguiente.
        setPosts((prev) => {
          const base = pagina === 1 ? [] : prev;
          const vistos = new Set(base.map((p) => p.id));
          return [...base, ...nuevos.filter((p) => !vistos.has(p.id))];
        });
        // Si llegó una página completa, probablemente haya más.
        setHayMas(nuevos.length === POSTS_POR_PAGINA);
        setEstado("listo");
      })
      .catch((err) => {
        if (cancelado || salirSiSesionCaducada(err)) return;
        setError(err?.message || "No se ha podido cargar el feed.");
        setEstado("error");
      });

    return () => {
      cancelado = true;
    };
  }, [usuario, pagina, intento, soloSeguidos]);

  useEffect(() => {
    if (!usuario || soloSeguidos) return;
    obtenerSeguidos(usuario.id)
      .then((lista) => setSeguidos(new Set(lista.map((u) => normalizarUsuarioBasico(u).id))))
      .catch(() => setSeguidos(new Set())); // sin la lista, todos aparecen como "Seguir"
  }, [usuario, soloSeguidos]);

  // Mantiene el Set al día para que todos los posts del mismo autor muestren lo mismo.
  function alCambiarSeguimiento(idAutor, loSigo) {
    setSeguidos((prev) => {
      const nuevo = new Set(prev);
      loSigo ? nuevo.add(idAutor) : nuevo.delete(idAutor);
      return nuevo;
    });
  }

  if (usuario === undefined) return <Cargando />;

  if (!usuario) {
    return (
      <Aviso titulo="Únete a la comunidad" texto="Inicia sesión para ver y animar los entrenamientos de los demás.">
        <a
          href="/login"
          className="inline-flex h-11 items-center rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Iniciar sesión
        </a>
      </Aviso>
    );
  }

  if (estado === "cargando") return <Cargando />;

  if (estado === "error" && posts.length === 0) {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (posts.length === 0 && soloSeguidos) {
    return (
      <Aviso
        titulo="Tu feed está vacío"
        texto="Aquí verás los entrenamientos de la gente que sigues. Encuentra a alguien con quien motivarte."
      >
        <a
          href="/descubrir"
          className="inline-flex h-11 items-center rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Descubrir gente
        </a>
      </Aviso>
    );
  }

  if (posts.length === 0) {
    return (
      <Aviso
        titulo="Todavía no hay publicaciones"
        texto="Termina un entrenamiento y publícalo para ser el primero en el feed."
      >
        <a
          href="/entrenamiento"
          className="inline-flex h-11 items-center rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Empezar entrenamiento
        </a>
      </Aviso>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <TarjetaPost
          key={p.id}
          post={p}
          idUsuario={usuario.id}
          seguidos={seguidos}
          onCambioSeguimiento={alCambiarSeguimiento}
          onEliminado={(id) => setPosts((ps) => ps.filter((x) => x.id !== id))}
        />
      ))}

      {estado === "error" && (
        <p role="alert" className="text-center text-sm text-red-300">
          {error}
        </p>
      )}

      {(hayMas || estado === "error") && (
        <button
          type="button"
          onClick={() => (estado === "error" ? setIntento((n) => n + 1) : setPagina((n) => n + 1))}
          disabled={estado === "mas"}
          className="h-11 w-full rounded-lg border border-borde bg-superficie text-sm font-semibold transition hover:border-primario/50 disabled:opacity-50"
        >
          {estado === "mas" ? "Cargando…" : estado === "error" ? "Reintentar" : "Ver más"}
        </button>
      )}
    </div>
  );
}

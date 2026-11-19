import { useEffect, useState } from "react";
import { iniciales } from "../../lib/auth.js";
import { obtenerSeguidos, obtenerSeguidores } from "../../lib/api.js";
import { normalizarUsuarioBasico, urlPerfil } from "../../lib/seguimiento.js";
import BotonSeguir from "./BotonSeguir.jsx";

function FilaUsuario({ usuario }) {
  return (
    <li className="flex items-center gap-3 py-3">
      <a href={urlPerfil(usuario.id)} className="flex min-w-0 flex-1 items-center gap-3 transition hover:text-primario">
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-elevada text-xs font-bold"
        >
          {iniciales(usuario.nombre)}
        </span>
        <span className="truncate text-sm font-semibold">{usuario.nombre}</span>
      </a>
      {/* Si dejas de seguir a alguien, sigue en la lista hasta recargar por si fue sin querer. */}
      <BotonSeguir idUsuario={usuario.id} loSigo pequeno />
    </li>
  );
}

// Sección del perfil propio: cuánta gente te sigue y a quién sigues tú.
export default function ListaSeguidos({ idUsuario }) {
  const [seguidos, setSeguidos] = useState(null);
  const [numSeguidores, setNumSeguidores] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!idUsuario) return;
    let cancelado = false;

    Promise.allSettled([obtenerSeguidos(idUsuario), obtenerSeguidores(idUsuario)]).then(
      ([rSeguidos, rSeguidores]) => {
        if (cancelado) return;
        if (rSeguidos.status === "fulfilled") {
          setSeguidos(rSeguidos.value.map(normalizarUsuarioBasico));
        } else {
          setError("No se ha podido cargar la gente a la que sigues.");
        }
        if (rSeguidores.status === "fulfilled") setNumSeguidores(rSeguidores.value.length);
      }
    );

    return () => {
      cancelado = true;
    };
  }, [idUsuario]);

  return (
    <section className="mt-4 rounded-2xl border border-borde bg-superficie p-5" aria-labelledby="siguiendo">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="siguiendo" className="font-bold">
          Siguiendo{seguidos ? ` · ${seguidos.length}` : ""}
        </h2>
        <p className="text-xs text-suave">
          {numSeguidores === null ? "" : numSeguidores === 1 ? "1 seguidor" : `${numSeguidores} seguidores`}
        </p>
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      ) : seguidos === null ? (
        <div aria-busy="true" className="mt-3 h-16 animate-pulse rounded-xl bg-elevada" />
      ) : seguidos.length === 0 ? (
        <p className="mt-3 text-sm text-suave">
          Aún no sigues a nadie.{" "}
          <a href="/descubrir" className="font-semibold text-primario">
            Descubre gente para seguir
          </a>
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-borde">
          {seguidos.map((u) => (
            <FilaUsuario key={u.id} usuario={u} />
          ))}
        </ul>
      )}
    </section>
  );
}

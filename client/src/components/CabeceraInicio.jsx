import { useEffect, useState } from "react";
import { getUsuario, iniciales } from "../lib/auth.js";

export default function CabeceraInicio() {
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  const nombre = usuario?.nombre?.split(" ")[0];

  return (
    <header className="mb-8 flex items-start justify-between gap-4">
      <div>
        <p className="text-xs text-suave">Mi espacio / Resumen</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">
          {nombre ? `Vamos a por más, ${nombre}.` : "Vamos a por más."}
        </h1>
        <p className="mt-1 text-sm text-suave">Tu única competencia es quien eras ayer.</p>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        {usuario === undefined ? (
          // Reserva el hueco mientras se comprueba la sesión, para que no salte el diseño
          <div className="h-11 w-11 sm:w-44" aria-hidden="true" />
        ) : usuario ? (
          <a
            href="/perfil-usuario"
            aria-label="Ir a mi perfil"
            className="grid h-11 w-11 place-items-center rounded-full bg-acento/10 text-sm font-bold text-acento ring-1 ring-acento/30 transition hover:ring-acento focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
          >
            {iniciales(usuario.nombre)}
          </a>
        ) : (
          <>
            <a
              href="/registro"
              className="hidden h-11 items-center rounded-lg px-3 text-sm font-semibold text-suave transition hover:text-white sm:inline-flex"
            >
              Crear cuenta
            </a>
            <a
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primario px-5 text-sm font-bold text-fondo shadow-lg shadow-primario/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                <path d="m10 17 5-5-5-5" />
                <path d="M15 12H3" />
              </svg>
              Iniciar sesión
            </a>
          </>
        )}
      </div>
    </header>
  );
}
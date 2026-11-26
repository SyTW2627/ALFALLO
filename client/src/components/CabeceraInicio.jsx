import { useEffect, useState } from "react";
import { getUsuario, iniciales } from "../lib/auth.js";

const fechaHoy = () =>
  new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

const VENTAJAS = [
  {
    titulo: "Rutinas a tu medida",
    texto: "Organiza tus días con series, repeticiones y descansos según tu objetivo, o empieza con Push Pull Legs y compañía.",
    icono: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" />,
  },
  {
    titulo: "Entrena sin cobertura",
    texto: "Registra cada serie aunque el gimnasio no tenga red. Se sube sola cuando vuelvas a tener conexión.",
    icono: <path d="M12 20h.01M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 14 0M2 8.8a15 15 0 0 1 20 0" />,
  },
  {
    titulo: "Rangos, récords y retos",
    texto: "Sube de Hierro a Élite, bate tus marcas y completa los retos de cada semana.",
    icono: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" />,
  },
  {
    titulo: "Con tu gente",
    texto: "Comparte tus entrenamientos, da ánimos y mira quién lidera la clasificación de la semana.",
    icono: <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />,
  },
];

function Icono({ children, className = "" }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

/* ---------- Portada para quien aún no ha iniciado sesión ---------- */
function Portada() {
  return (
    <section aria-labelledby="titulo-portada" className="pb-6 pt-2 md:pt-6">
      <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-primario/30 bg-primario/10 px-3 py-1 text-xs font-semibold text-primario">
            <span className="h-1.5 w-1.5 rounded-full bg-primario" aria-hidden="true" />
            Tu cuaderno de entrenamiento
          </p>
          <h1 id="titulo-portada" className="mt-5 text-4xl font-extrabold sm:text-5xl lg:text-6xl">
            Entrena con cabeza.
            <br />
            <span className="text-primario">Llega al fallo.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-suave sm:text-lg">
            Planifica tus rutinas, registra cada serie y mira cómo subes de nivel. Sin hojas de cálculo, sin libretas, sin
            excusas.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <a
              href="/registro"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primario px-7 text-sm font-bold text-tinta shadow-lg shadow-primario/25 transition hover:-translate-y-0.5 hover:brightness-110"
            >
              Crear cuenta gratis
            </a>
            <a
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-borde bg-superficie px-7 text-sm font-semibold transition hover:border-primario/40"
            >
              Ya tengo cuenta
            </a>
          </div>
        </div>

        {/* El disco de 20 kg del logo, como ilustración */}
        <div className="relative mx-auto hidden aspect-square w-full max-w-sm sm:block" aria-hidden="true">
          <div className="absolute inset-6 rounded-full bg-primario/25 blur-3xl" />
          <img
            src="/images/disco.webp"
            alt=""
            width="384"
            height="384"
            className="relative h-full w-full object-contain drop-shadow-2xl [animation:spin_60s_linear_infinite]"
          />
        </div>
      </div>

      <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VENTAJAS.map((v) => (
          <li key={v.titulo} className="rounded-2xl border border-borde bg-superficie p-5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-primario/10 text-primario">
              <Icono>{v.icono}</Icono>
            </span>
            <h2 className="mt-4 text-base font-bold">{v.titulo}</h2>
            <p className="mt-1.5 text-sm text-suave">{v.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------- Saludo con la sesión iniciada ---------- */
function Saludo({ usuario }) {
  const nombre = usuario.nombre?.split(" ")[0];
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-suave first-letter:uppercase">{fechaHoy()}</p>
        <h1 className="mt-1 text-3xl font-extrabold sm:text-4xl">
          {nombre ? (
            <>
              Vamos a por más, <span className="text-primario">{nombre}</span>.
            </>
          ) : (
            "Vamos a por más."
          )}
        </h1>
        <p className="mt-1.5 text-sm text-suave sm:text-base">Tu única competencia es quien eras ayer.</p>
      </div>
      <a
        href="/perfil-usuario"
        aria-label="Ir a mi perfil"
        className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primario to-orange-700 text-sm font-bold text-tinta shadow-lg shadow-primario/20 ring-4 ring-primario/10 transition hover:ring-primario/30"
      >
        {iniciales(usuario.nombre)}
      </a>
    </header>
  );
}

export default function CabeceraInicio() {
  const [usuario, setUsuario] = useState(undefined);

  useEffect(() => {
    setUsuario(getUsuario());
  }, []);

  // Reserva el hueco mientras se comprueba la sesión, para que no salte el diseño
  if (usuario === undefined) return <div className="mb-8 h-24" aria-hidden="true" />;
  return usuario ? <Saludo usuario={usuario} /> : <Portada />;
}

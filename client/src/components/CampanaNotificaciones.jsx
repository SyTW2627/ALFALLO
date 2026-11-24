import { useCallback, useEffect, useRef, useState } from "react";
import { getUsuario } from "../lib/auth.js";
import { obtenerNotificaciones, marcarNotificacionesLeidas } from "../lib/api.js";

const CADA_MS = 60_000; // se vuelve a preguntar al servidor cada minuto

const relativo = new Intl.RelativeTimeFormat("es-ES", { numeric: "auto" });

function haceCuanto(fecha) {
  const seg = (new Date(fecha).getTime() - Date.now()) / 1000;
  const abs = Math.abs(seg);
  if (abs < 60) return "ahora mismo";
  if (abs < 3600) return relativo.format(Math.round(seg / 60), "minute");
  if (abs < 86400) return relativo.format(Math.round(seg / 3600), "hour");
  if (abs < 86400 * 30) return relativo.format(Math.round(seg / 86400), "day");
  return new Date(fecha).toLocaleDateString("es-ES", { day: "numeric", month: "short" });
}

const ICONOS = {
  hito: { color: "text-acento bg-acento/15", path: "M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" },
  reto: { color: "text-primario bg-primario/15", path: "M12 2 15 8.5l7 .9-5.1 4.8 1.3 7L12 17.8 5.8 21.2l1.3-7L2 9.4l7-.9L12 2Z" },
  aviso: { color: "text-texto bg-elevada", path: "M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1ZM16 8a5 5 0 0 1 0 8M19 5a9 9 0 0 1 0 14" },
  // Personales
  kudos: { color: "text-primario bg-primario/15", path: "M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C9.5 9 11 9 12 2ZM6 14a6 6 0 0 0 12 0" },
  comentario: { color: "text-texto bg-elevada", path: "M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z" },
  seguidor: { color: "text-acento bg-acento/15", path: "M15 19a6 6 0 0 0-12 0M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM19 8v6M22 11h-6" },
  progreso: { color: "text-primario bg-primario/15", path: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20ZM12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12ZM12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" },
};

function Notificacion({ n }) {
  const icono = ICONOS[n.tipo] ?? ICONOS.aviso;
  const externo = n.enlace?.startsWith("https://");
  const contenido = (
    <div className="flex gap-3">
      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${icono.color}`} aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d={icono.path} />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-start gap-2 text-sm font-bold">
          <span className="flex-1">{n.titulo}</span>
          {!n.leida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primario" aria-label="Nueva" />}
        </p>
        <p className="mt-0.5 whitespace-pre-line text-xs text-suave">{n.mensaje}</p>
        <p className="mt-1 text-[11px] text-suave/80">{haceCuanto(n.fecha ?? n.createdAt)}</p>
      </div>
    </div>
  );

  const clases = `block rounded-xl p-3 transition ${n.leida ? "" : "bg-primario/5"}`;
  if (!n.enlace) return <li className={clases}>{contenido}</li>;
  return (
    <li>
      <a
        href={n.enlace}
        {...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className={`${clases} hover:bg-elevada focus-visible:outline-2 focus-visible:outline-primario`}
      >
        {contenido}
      </a>
    </li>
  );
}

export default function CampanaNotificaciones() {
  const [logueado, setLogueado] = useState(false);
  const [datos, setDatos] = useState({ noLeidas: 0, notificaciones: [] });
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerNotificaciones());
    } catch {
      /* sin conexión o sesión caducada: la campanita simplemente no se actualiza */
    }
  }, []);

  useEffect(() => {
    if (!getUsuario()) return;
    setLogueado(true);
    cargar();
    const intervalo = setInterval(() => document.visibilityState === "visible" && cargar(), CADA_MS);
    const alVolver = () => document.visibilityState === "visible" && cargar();
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      clearInterval(intervalo);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [cargar]);

  // Cerrar al pulsar fuera o con Escape.
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e) => caja.current && !caja.current.contains(e.target) && cerrar();
    const tecla = (e) => e.key === "Escape" && cerrar();
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("pointerdown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  });

  function abrir() {
    setAbierto(true);
    if (datos.noLeidas > 0) {
      // El contador se pone a 0, pero las nuevas siguen resaltadas mientras el panel esté abierto.
      setDatos((d) => ({ ...d, noLeidas: 0 }));
      marcarNotificacionesLeidas().catch(() => {});
    }
  }

  function cerrar() {
    setAbierto(false);
    setDatos((d) => ({ ...d, notificaciones: d.notificaciones.map((n) => ({ ...n, leida: true })) }));
  }

  if (!logueado) return null;

  const { noLeidas, notificaciones } = datos;
  const etiqueta = noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones";

  return (
    <div ref={caja} className="relative">
      <button
        type="button"
        onClick={() => (abierto ? cerrar() : abrir())}
        aria-label={etiqueta}
        aria-expanded={abierto}
        aria-haspopup="dialog"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-borde bg-superficie text-suave transition hover:text-texto focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-primario px-1 text-[10px] font-bold text-tinta">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {abierto && (
        <div
          role="dialog"
          aria-label="Notificaciones"
          className="absolute right-0 top-12 z-40 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-borde bg-superficie shadow-2xl shadow-sombra/60"
        >
          <p className="border-b border-borde px-4 py-3 text-sm font-bold">Notificaciones</p>
          {notificaciones.length ? (
            <ul className="max-h-[60vh] space-y-1 overflow-y-auto p-2">
              {notificaciones.map((n) => (
                <Notificacion key={n._id} n={n} />
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-center text-sm text-suave">No tienes notificaciones.</p>
          )}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { getUsuario, actualizarUsuario, cerrarSesion, iniciales } from "../lib/auth.js";
import { obtenerPerfil, contarEntrenamientos, sesionRechazada } from "../lib/api.js";

function formatearFecha(iso) {
  if (!iso) return "—";
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return "—";
  return fecha.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function Dato({ etiqueta, valor, acento = false }) {
  return (
    <div className="rounded-2xl border border-borde bg-superficie p-5">
      <p className="text-xs text-suave">{etiqueta}</p>
      <p className={`mt-2 text-xl font-bold ${acento ? "text-acento" : ""}`}>{valor}</p>
    </div>
  );
}

export default function PerfilUsuario() {
  const [usuario, setUsuario] = useState(null);
  const [entrenamientos, setEntrenamientos] = useState(null);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const actual = getUsuario();
    if (!actual) {
      window.location.replace("/registro");
      return;
    }
    setUsuario(actual);

    let cancelado = false;
    (async () => {
      const [perfil, historial] = await Promise.allSettled([obtenerPerfil(), contarEntrenamientos()]);
      if (cancelado) return;

      if (perfil.status === "fulfilled") {
        actualizarUsuario(perfil.value);
        setUsuario(perfil.value);
      } else if (sesionRechazada(perfil.reason)) {
        cerrarSesion("/login?sesion=caducada");
        return;
      } else {
        setAviso("No se han podido actualizar tus datos. Mostrando la última información guardada.");
      }
      if (historial.status === "fulfilled" && historial.value !== null) {
        setEntrenamientos(historial.value);
      }
    })();

    return () => {
      cancelado = true;
    };
  }, []);

  if (!usuario) {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando perfil...
      </p>
    );
  }

  const pesoKg = usuario.pesoKg ? `${usuario.pesoKg} kg` : "—";
  const alturaCm = usuario.alturaCm ? `${usuario.alturaCm} cm` : "—";

  return (
    <div>
      <header className="mb-8">
        <p className="text-xs text-suave">Mi espacio / Perfil</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tu perfil</h1>
      </header>

      {aviso && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-primario/30 bg-primario/10 px-3 py-2 text-sm text-primario"
        >
          {aviso}
        </p>
      )}

      {/* Tarjeta principal */}
      <section className="flex items-center gap-4 rounded-2xl border border-borde bg-superficie p-5">
        <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-acento/10 text-lg font-bold text-acento ring-1 ring-acento/30">
          {iniciales(usuario.nombre)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{usuario.nombre}</p>
          <p className="truncate text-sm text-suave">{usuario.email}</p>
        </div>
      </section>

      {/* Biometría y actividad */}
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Dato etiqueta="Peso corporal" valor={pesoKg} />
        <Dato etiqueta="Altura" valor={alturaCm} />
        <Dato etiqueta="Entrenamientos" valor={entrenamientos ?? "—"} acento />
      </div>

      {/* Datos de la cuenta */}
      <section className="mt-4 rounded-2xl border border-borde bg-superficie p-5">
        <h2 className="font-bold">Datos de la cuenta</h2>
        <dl className="mt-3 divide-y divide-borde text-sm">
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-suave">Nombre</dt>
            <dd className="font-medium">{usuario.nombre}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-suave">Email</dt>
            <dd className="font-medium">{usuario.email}</dd>
          </div>
          <div className="flex justify-between gap-4 py-3">
            <dt className="text-suave">Miembro desde</dt>
            <dd className="font-medium">{formatearFecha(usuario.creadoEn)}</dd>
          </div>
        </dl>
      </section>

      <button
        type="button"
        onClick={() => cerrarSesion("/")}
        className="mt-6 h-12 w-full rounded-lg border border-red-500/40 text-sm font-bold text-red-400 transition hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400 sm:w-auto sm:px-6"
      >
        Cerrar sesión
      </button>
    </div>
  );
}
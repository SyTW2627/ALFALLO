import { useCallback, useEffect, useState } from "react";
import { getUsuario, guardarSesion, actualizarUsuario } from "../../lib/auth.js";
import { obtenerPerfil, accederComoAdmin, salirDeAdmin, obtenerOpcionesAdmin, ApiError } from "../../lib/api.js";
import Campo from "../Campo.jsx";
import { Mensaje, mensajeDeError } from "./controles.jsx";
import GestionHitos from "./GestionHitos.jsx";
import GestionRetos from "./GestionRetos.jsx";
import GestionNotificaciones from "./GestionNotificaciones.jsx";

const PESTANAS = [
  { valor: "hitos", etiqueta: "Hitos" },
  { valor: "retos", etiqueta: "Retos" },
  { valor: "notificaciones", etiqueta: "Notificaciones" },
];

function leerPestana() {
  const t = new URLSearchParams(window.location.search).get("tab");
  return PESTANAS.some((p) => p.valor === t) ? t : "hitos";
}

/* ---------- Acceso con la contraseña de administración ---------- */

function AccesoAdmin({ usuario, aviso, onConcedido }) {
  const [password, setPassword] = useState("");
  const [ver, setVer] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!password) return setError("Escribe la contraseña de administración.");
    setError("");
    setEnviando(true);
    try {
      const sesion = await accederComoAdmin(password);
      guardarSesion(sesion);
      onConcedido(sesion.usuario);
    } catch (err) {
      // Aquí un 401 es "contraseña incorrecta", no una sesión caducada.
      setError(err instanceof ApiError ? err.message : "No se ha podido comprobar la contraseña.");
      setPassword("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <header className="mb-6">
        <p className="text-xs text-suave">Mi espacio / Administración</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight">Zona de administración</h1>
        <p className="mt-1 text-sm text-suave">
          Desde aquí se crean hitos, retos y notificaciones para todos los usuarios.
        </p>
      </header>

      <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borde bg-superficie p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primario/15 text-primario" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="11" width="16" height="10" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" />
            </svg>
          </span>
          <p className="text-sm">
            Entrando como <strong>{usuario?.nombre || usuario?.email}</strong>
          </p>
        </div>
        <Mensaje tipo="ok">{aviso}</Mensaje>
        <Campo
          id="admin-password"
          label="Contraseña de administración"
          type={ver ? "text" : "password"}
          autoComplete="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error}
          autoFocus
          extra={
            <button
              type="button"
              onClick={() => setVer((v) => !v)}
              className="absolute inset-y-0 right-0 px-3 text-xs font-semibold text-suave hover:text-white"
            >
              {ver ? "Ocultar" : "Ver"}
            </button>
          }
        />
        <button
          type="submit"
          disabled={enviando}
          className="h-12 w-full rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 disabled:opacity-50"
        >
          {enviando ? "Comprobando..." : "Entrar como administrador"}
        </button>
      </form>
      <p className="mt-4 text-xs text-suave">
        La contraseña la configura quien gestiona el servidor. Si no la tienes, vuelve a{" "}
        <a href="/" className="font-semibold text-primario hover:underline">
          Inicio
        </a>
        .
      </p>
    </div>
  );
}

/* ---------- Panel ---------- */

function Panel({ usuario, onPerderAdmin, onSalir }) {
  const [pestana, setPestana] = useState("hitos");
  const [opciones, setOpciones] = useState(null);
  const [error, setError] = useState("");
  const [saliendo, setSaliendo] = useState(false);

  useEffect(() => {
    setPestana(leerPestana());
    obtenerOpcionesAdmin()
      .then(setOpciones)
      .catch((err) => setError(mensajeDeError(err, onPerderAdmin)));
  }, [onPerderAdmin]);

  const cambiarPestana = (valor) => {
    setPestana(valor);
    window.history.replaceState(null, "", valor === "hitos" ? "/admin" : `/admin?tab=${valor}`);
  };

  async function salir() {
    if (!window.confirm("¿Salir del modo administrador? Para volver necesitarás la contraseña.")) return;
    setSaliendo(true);
    try {
      const sesion = await salirDeAdmin();
      guardarSesion(sesion);
      onSalir(sesion.usuario);
    } catch (err) {
      setError(mensajeDeError(err, onPerderAdmin));
      setSaliendo(false);
    }
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-suave">Mi espacio / Administración</p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Panel de administración</h1>
          <p className="mt-1 text-sm text-suave">
            Hola, {usuario?.nombre?.split(" ")[0] || "admin"}. Todo lo que crees aquí lo verán todos los usuarios.
          </p>
        </div>
        <button
          type="button"
          onClick={salir}
          disabled={saliendo}
          className="h-10 rounded-lg border border-borde px-4 text-sm font-semibold text-suave transition hover:text-white disabled:opacity-50"
        >
          Salir del modo administrador
        </button>
      </header>

      <div role="tablist" aria-label="Secciones" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="tab"
            id={`tab-${p.valor}`}
            aria-selected={pestana === p.valor}
            aria-controls={`panel-${p.valor}`}
            onClick={() => cambiarPestana(p.valor)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
              pestana === p.valor ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-white"
            }`}
          >
            {p.etiqueta}
          </button>
        ))}
      </div>

      <Mensaje>{error}</Mensaje>

      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === "notificaciones" ? (
          <GestionNotificaciones alPerderAdmin={onPerderAdmin} />
        ) : !opciones ? (
          !error && <p className="text-sm text-suave">Cargando...</p>
        ) : pestana === "hitos" ? (
          <GestionHitos opciones={opciones} alPerderAdmin={onPerderAdmin} />
        ) : (
          <GestionRetos opciones={opciones} alPerderAdmin={onPerderAdmin} />
        )}
      </div>
    </div>
  );
}

/* ---------- Página ---------- */

export default function PaginaAdmin() {
  const [usuario, setUsuario] = useState(null);
  const [vista, setVista] = useState("cargando"); // cargando | acceso | panel
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    const local = getUsuario();
    if (!local) {
      window.location.replace("/login");
      return;
    }
    setUsuario(local);
    // El rol guardado puede estar desactualizado: se pregunta al servidor.
    obtenerPerfil()
      .then((perfil) => {
        actualizarUsuario(perfil);
        setUsuario(perfil);
        setVista(perfil.rol === "admin" ? "panel" : "acceso");
      })
      .catch(() => setVista(local.rol === "admin" ? "panel" : "acceso"));
  }, []);

  const perderAdmin = useCallback(() => {
    setAviso("");
    setVista("acceso");
  }, []);

  if (vista === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Comprobando permisos...
      </p>
    );
  }

  if (vista === "acceso") {
    return (
      <AccesoAdmin
        usuario={usuario}
        aviso={aviso}
        onConcedido={(u) => {
          setUsuario(u);
          setVista("panel");
        }}
      />
    );
  }

  return (
    <Panel
      usuario={usuario}
      onPerderAdmin={perderAdmin}
      onSalir={(u) => {
        setUsuario(u);
        setAviso("Has salido del modo administrador.");
        setVista("acceso");
      }}
    />
  );
}

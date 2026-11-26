import { useEffect, useState } from "react";
import { estaLogueado, guardarSesion } from "../lib/auth.js";
import { entrarConGoogle, iniciarSesion, registrarUsuario } from "../lib/api.js";
import BotonGoogle from "./BotonGoogle.jsx";

const MODOS = {
  login: {
    titulo: "Bienvenido de nuevo",
    subtitulo: "Tu única competencia es quien eras ayer.",
    boton: "Entrar",
    cargando: "Entrando...",
    alterno: { texto: "¿Aún no tienes cuenta?", enlace: "Regístrate", href: "/registro" },
  },
  registro: {
    titulo: "Crea tu cuenta",
    subtitulo: "Empieza a registrar tu progreso hoy.",
    boton: "Crear cuenta",
    cargando: "Creando cuenta...",
    alterno: { texto: "¿Ya tienes cuenta?", enlace: "Inicia sesión", href: "/login" },
  },
};

const EMAIL_RE = /^\S+@\S+\.\S+$/;

function validar(modo, d) {
  const e = {};
  if (modo === "registro" && d.nombre.trim().length < 2) e.nombre = "Introduce tu nombre.";
  if (!EMAIL_RE.test(d.email.trim())) e.email = "El email no es válido.";
  if (d.password.length < 8) e.password = "Mínimo 8 caracteres.";
  if (modo === "registro" && d.confirmar !== d.password) e.confirmar = "Las contraseñas no coinciden.";
  return e;
}

/* ---------- Campo de formulario accesible ---------- */
function Campo({ id, label, error, extra, ...props }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-12 w-full rounded-xl border bg-fondo px-4 text-sm text-texto outline-none transition placeholder:text-suave/60 focus:border-primario focus:ring-4 focus:ring-primario/15 ${error ? "border-red-500/60" : "border-borde"
            } ${extra ? "pr-16" : ""}`}
          {...props}
        />
        {extra}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-peligro">
          {error}
        </p>
      )}
    </div>
  );
}

/* ---------- Formulario ---------- */
export default function AuthForm({ modo = "login" }) {
  const cfg = MODOS[modo] ?? MODOS.login;
  const esRegistro = modo === "registro";

  const [datos, setDatos] = useState({ nombre: "", email: "", password: "", confirmar: "" });
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);
  const [aviso, setAviso] = useState("");

  useEffect(() => {
    // Si ya hay sesión válida no tiene sentido mostrar login/registro.
    if (estaLogueado()) {
      window.location.replace("/");
      return;
    }
    // Llegamos desde el perfil porque el token había caducado.
    if (new URLSearchParams(window.location.search).get("sesion") === "caducada") {
      setAviso("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    }
  }, []);

  const conGoogle = async (credential) => {
    setErrorGeneral("");
    setAviso("");
    setCargando(true);
    try {
      guardarSesion(await entrarConGoogle(credential));
      window.location.href = "/";
    } catch (err) {
      setErrorGeneral(err.message || "No se ha podido entrar con Google.");
      setCargando(false);
    }
  };

  const cambiar = (campo) => (e) => {
    setDatos((d) => ({ ...d, [campo]: e.target.value }));
    if (errores[campo]) setErrores((er) => ({ ...er, [campo]: undefined }));
  };

  const enviar = async (e) => {
    e.preventDefault();
    setErrorGeneral("");

    const errs = validar(modo, datos);
    setErrores(errs);
    if (Object.keys(errs).length > 0) return;

    setCargando(true);
    setAviso("");
    try {
      // El backend guarda el email en minúsculas, así que lo normalizamos igual.
      const email = datos.email.trim().toLowerCase();
      const sesion = esRegistro
        ? await registrarUsuario({ nombre: datos.nombre.trim(), email, password: datos.password })
        : await iniciarSesion({ email, password: datos.password });

      guardarSesion(sesion); // { token, usuario }
      window.location.href = "/";
      // No se desactiva "cargando": el botón queda bloqueado hasta que la página cambie.
    } catch (err) {
      setErrorGeneral(err.message || "No se ha podido conectar con el servidor.");
      setCargando(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      {/* Logo */}
      <a href="/" className="mb-8 flex justify-center" aria-label="AlFallo, ir al inicio">
        <img src="/images/logo-claro.webp" alt="AlFallo" width="168" height="56" className="solo-claro h-12 w-auto" />
        <img src="/images/logo-oscuro.webp" alt="AlFallo" width="168" height="56" className="solo-oscuro h-12 w-auto" />
      </a>

      <form
        onSubmit={enviar}
        noValidate
        className="rounded-3xl border border-borde bg-superficie p-6 shadow-2xl shadow-sombra/20 sm:p-9"
      >
        <h1 className="text-3xl font-extrabold">{cfg.titulo}</h1>
        <p className="mt-1.5 text-sm text-suave">{cfg.subtitulo}</p>

        <div className="mt-7 space-y-5">
          {esRegistro && (
            <Campo
              id="nombre"
              label="Nombre"
              type="text"
              autoComplete="name"
              placeholder="Tu nombre"
              value={datos.nombre}
              onChange={cambiar("nombre")}
              error={errores.nombre}
            />
          )}

          <Campo
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="tu@email.com"
            value={datos.email}
            onChange={cambiar("email")}
            error={errores.email}
          />

          <Campo
            id="password"
            label="Contraseña"
            type={verPassword ? "text" : "password"}
            autoComplete={esRegistro ? "new-password" : "current-password"}
            placeholder="Mínimo 8 caracteres"
            value={datos.password}
            onChange={cambiar("password")}
            error={errores.password}
            extra={
              <button
                type="button"
                onClick={() => setVerPassword((v) => !v)}
                aria-pressed={verPassword}
                className="absolute inset-y-0 right-0 px-4 text-xs font-semibold text-suave hover:text-texto"
              >
                {verPassword ? "Ocultar" : "Ver"}
              </button>
            }
          />

          {esRegistro && (
            <Campo
              id="confirmar"
              label="Repite la contraseña"
              type={verPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repite la contraseña"
              value={datos.confirmar}
              onChange={cambiar("confirmar")}
              error={errores.confirmar}
            />
          )}
        </div>

        {aviso && (
          <p
            role="status"
            className="mt-5 rounded-xl border border-primario/30 bg-primario/10 px-4 py-3 text-sm text-primario"
          >
            {aviso}
          </p>
        )}

        {errorGeneral && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-peligro"
          >
            {errorGeneral}
          </p>
        )}

        <button
          type="submit"
          disabled={cargando}
          className="mt-7 h-12 w-full rounded-xl bg-primario text-sm font-bold text-tinta shadow-lg shadow-primario/25 transition hover:brightness-110 disabled:cursor-wait disabled:opacity-60"
        >
          {cargando ? cfg.cargando : cfg.boton}
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-suave" aria-hidden="true">
          <span className="h-px flex-1 bg-borde" />o<span className="h-px flex-1 bg-borde" />
        </div>

        <BotonGoogle modo={modo} onCredential={conGoogle} />

        <p className="mt-6 text-center text-sm text-suave">
          {cfg.alterno.texto}{" "}
          <a href={cfg.alterno.href} className="font-semibold text-primario hover:underline">
            {cfg.alterno.enlace}
          </a>
        </p>
      </form>

      <p className="mt-6 text-center text-xs text-suave">Una repetición más. Un paso más fuerte.</p>
    </div>
  );
}
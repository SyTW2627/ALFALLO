// Piezas de formulario compartidas por el panel de administración.
import { ApiError } from "../../lib/api.js";
import { cerrarSesion } from "../../lib/auth.js";

const baseCampo =
  "w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-texto outline-none transition placeholder:text-suave/60 focus:border-primario";

export function Etiqueta({ htmlFor, children, ayuda }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-suave">
      {children}
      {ayuda && <span className="ml-1 font-normal text-suave/70">({ayuda})</span>}
    </label>
  );
}

export function Texto({ id, label, ayuda, ...props }) {
  return (
    <div>
      <Etiqueta htmlFor={id} ayuda={ayuda}>
        {label}
      </Etiqueta>
      <input id={id} className={`${baseCampo} mt-1 h-11`} {...props} />
    </div>
  );
}

export function AreaTexto({ id, label, ayuda, ...props }) {
  return (
    <div>
      <Etiqueta htmlFor={id} ayuda={ayuda}>
        {label}
      </Etiqueta>
      <textarea id={id} rows={3} className={`${baseCampo} mt-1 resize-y py-2`} {...props} />
    </div>
  );
}

export function Selector({ id, label, ayuda, children, ...props }) {
  return (
    <div>
      <Etiqueta htmlFor={id} ayuda={ayuda}>
        {label}
      </Etiqueta>
      <select id={id} className={`${baseCampo} mt-1 h-11`} {...props}>
        {children}
      </select>
    </div>
  );
}

export function Casilla({ id, label, ...props }) {
  return (
    <label htmlFor={id} className="inline-flex cursor-pointer items-center gap-2 text-sm">
      <input id={id} type="checkbox" className="h-4 w-4 accent-[var(--color-primario)]" {...props} />
      {label}
    </label>
  );
}

export function BotonPrimario({ children, ...props }) {
  return (
    <button
      className="h-11 rounded-lg bg-primario px-5 text-sm font-bold text-tinta transition hover:brightness-110 disabled:opacity-50"
      {...props}
    >
      {children}
    </button>
  );
}

export function BotonSecundario({ children, peligro = false, ...props }) {
  return (
    <button
      type="button"
      className={`h-9 rounded-lg border px-3 text-xs font-semibold transition disabled:opacity-50 ${
        peligro ? "border-red-500/40 text-peligro hover:bg-red-500/10" : "border-borde text-suave hover:text-texto"
      }`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Mensaje({ tipo = "error", children }) {
  if (!children) return null;
  const estilos =
    tipo === "error" ? "border-red-500/30 bg-red-500/10 text-peligro" : "border-acento/30 bg-acento/10 text-acento";
  return (
    <p role={tipo === "error" ? "alert" : "status"} className={`rounded-lg border px-3 py-2 text-sm ${estilos}`}>
      {children}
    </p>
  );
}

export function Etiquetita({ children, color = "suave" }) {
  const estilos = {
    suave: "border-borde text-suave",
    acento: "border-acento/40 text-acento",
    primario: "border-primario/40 text-primario",
    rojo: "border-red-500/40 text-peligro",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${estilos[color]}`}>
      {children}
    </span>
  );
}

// Traduce un error de la API. 403 = ha perdido el rol de administrador; 401 = sesión caducada.
export function mensajeDeError(err, alPerderAdmin) {
  if (err instanceof ApiError && err.status === 401) {
    cerrarSesion("/login?sesion=caducada");
    return "";
  }
  if (err instanceof ApiError && err.status === 403) {
    alPerderAdmin?.();
    return "";
  }
  return err?.message || "Ha ocurrido un error inesperado.";
}

/* ---------- Fechas (los <input type="date"> trabajan con "aaaa-mm-dd" en hora local) ---------- */

const dosCifras = (n) => String(n).padStart(2, "0");

export function aFechaInput(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
}

// Inicio del día indicado (hora local) en ISO.
export const inicioDelDia = (valor) => new Date(`${valor}T00:00:00`).toISOString();

// El fin de un reto es exclusivo: el día elegido cuenta entero, así que se envía el día siguiente a las 00:00.
export function finDelDia(valor) {
  const d = new Date(`${valor}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

// Para mostrar el fin (exclusivo) como último día incluido.
export const ultimoDia = (finExclusivo) => new Date(new Date(finExclusivo).getTime() - 1);

export const sumarDias = (fecha, dias) => {
  const d = new Date(fecha);
  d.setDate(d.getDate() + dias);
  return d;
};

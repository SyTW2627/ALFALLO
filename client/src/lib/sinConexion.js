// Entrenamientos guardados en el dispositivo y su envío a la API.
//
// Durante un entrenamiento, el móvil es la fuente de verdad: cada serie se guarda al instante
// en localStorage y se envía al servidor en segundo plano. Sin conexión no se pierde nada:
// se puede empezar, entrenar y terminar, y todo se sube cuando vuelve la red.
//
// En localStorage (una clave por usuario):
//   { actual: Entreno | null, pendientes: Entreno[] }
// Entreno:
//   { localId, idServidor, titulo, objetivo, inicio, fin, descartar,
//     ejercicios, notas, version, versionEnviada }
// `pendientes` son entrenamientos ya terminados (o descartados) que aún no se han subido.

import { getUsuario } from "./auth.js";
import {
  ApiError,
  esErrorDeRed,
  empezarEntrenamiento,
  guardarEntrenamiento,
  terminarEntrenamiento,
  descartarEntrenamiento,
  obtenerEntrenamientoActivo,
  obtenerHistorial,
} from "./api.js";
import { guardarPlan } from "./entrenamiento.js";

/* ---------- Almacenamiento ---------- */

const clave = () => `alfallo:entrenos:${getUsuario()?.id ?? "anonimo"}`;

function leer() {
  try {
    const raw = JSON.parse(localStorage.getItem(clave()) ?? "null");
    return { actual: raw?.actual ?? null, pendientes: raw?.pendientes ?? [] };
  } catch {
    return { actual: null, pendientes: [] };
  }
}

function escribir(estado) {
  try {
    if (!estado.actual && !estado.pendientes.length) localStorage.removeItem(clave());
    else localStorage.setItem(clave(), JSON.stringify(estado));
  } catch {
    /* almacenamiento lleno o no disponible */
  }
  avisar();
}

function modificar(fn) {
  const nuevo = fn(leer());
  escribir(nuevo);
  return nuevo;
}

// Actualiza campos de un entreno, esté en curso o pendiente.
function guardarCampos(localId, campos) {
  modificar((e) => ({
    actual: e.actual?.localId === localId ? { ...e.actual, ...campos } : e.actual,
    pendientes: e.pendientes.map((p) => (p.localId === localId ? { ...p, ...campos } : p)),
  }));
}

function buscar(localId) {
  const e = leer();
  return e.actual?.localId === localId ? e.actual : e.pendientes.find((p) => p.localId === localId) ?? null;
}

const nuevoId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

/* ---------- Estado de la sincronización (para la interfaz) ---------- */

let estadoSync = { estado: "ok" };
let enCurso = null;
const oyentes = new Set();

export function resumenSincronizacion() {
  const { actual, pendientes } = leer();
  const actualSinSubir = actual && (!actual.idServidor || actual.version > actual.versionEnviada);
  return { ...estadoSync, enviando: !!enCurso, sinEnviar: pendientes.length + (actualSinSubir ? 1 : 0) };
}

// Llama a `fn` cada vez que cambia algo. Devuelve la función para dejar de escuchar.
export function suscribir(fn) {
  oyentes.add(fn);
  fn(resumenSincronizacion());
  return () => oyentes.delete(fn);
}

function avisar() {
  const r = resumenSincronizacion();
  oyentes.forEach((fn) => fn(r));
}

function fijarEstado(r) {
  estadoSync = r;
  avisar();
  return r;
}

/* ---------- Operaciones locales (instantáneas, funcionan sin conexión) ---------- */

export const entrenoActual = () => leer().actual;
export const hayPendientes = () => leer().pendientes.length > 0;

export function empezarLocal({ titulo, objetivo, ejercicios = [] }) {
  const entreno = {
    localId: nuevoId(),
    idServidor: null,
    titulo,
    objetivo: objetivo || null,
    inicio: new Date().toISOString(),
    fin: null,
    ejercicios: ejercicios.map((e) => ({ ...e, series: e.series ?? [] })),
    notas: "",
    version: 1,
    versionEnviada: 0,
  };
  modificar((e) => ({ ...e, actual: entreno }));
  return entreno;
}

// Un entrenamiento en curso que ya existe en el servidor (p. ej. empezado en otro dispositivo).
export function adoptarDelServidor(w) {
  const entreno = {
    localId: `srv-${w.id}`,
    idServidor: w.id,
    titulo: w.titulo,
    objetivo: w.objetivo,
    inicio: w.inicio,
    fin: null,
    ejercicios: w.ejercicios,
    notas: w.notas ?? "",
    version: 0,
    versionEnviada: 0,
  };
  modificar((e) => ({ ...e, actual: entreno }));
  return entreno;
}

export function cambiarActual(cambios) {
  modificar((e) => (e.actual ? { ...e, actual: { ...e.actual, ...cambios, version: e.actual.version + 1 } } : e));
}

// Pasa el entrenamiento en curso a la cola de pendientes con su hora de fin.
export function terminarActual() {
  let terminado = null;
  modificar((e) => {
    if (!e.actual) return e;
    terminado = { ...e.actual, fin: new Date().toISOString() };
    return { actual: null, pendientes: [...e.pendientes, terminado] };
  });
  return terminado;
}

export function descartarActual() {
  modificar((e) => {
    if (!e.actual) return e;
    // Si nunca llegó al servidor, basta con olvidarlo.
    if (!e.actual.idServidor) return { ...e, actual: null };
    return { actual: null, pendientes: [...e.pendientes, { ...e.actual, descartar: true }] };
  });
}

/* ---------- Envío a la API ---------- */

function errorDeConflicto(mensaje) {
  const err = new ApiError(mensaje, { status: 409 });
  err.conflicto = true;
  return err;
}

async function crearEnServidor(e) {
  try {
    const w = await empezarEntrenamiento({ titulo: e.titulo, objetivo: e.objetivo, inicio: e.inicio });
    return w._id ?? w.id;
  } catch (err) {
    if (err instanceof ApiError && err.status === 409) {
      const activo = await obtenerEntrenamientoActivo();
      // Si coinciden título y hora de inicio, es este mismo entrenamiento: la petición anterior
      // llegó al servidor pero su respuesta se perdió por el camino. (Margen de 3 min porque el
      // servidor corrige la hora si el reloj del móvil va adelantado.)
      const mismaHora = activo && Math.abs(new Date(activo.startedAt) - new Date(e.inicio)) < 3 * 60 * 1000;
      if (mismaHora && activo.title === e.titulo) return activo._id;
      throw errorDeConflicto(
        "Tienes otro entrenamiento en curso guardado en el servidor (empezado en otro dispositivo). " +
          "Termínalo o descártalo allí y este se subirá solo."
      );
    }
    throw err;
  }
}

// El servidor ya no tiene el entrenamiento en curso (404).
async function yaNoEstaEnCurso(e, reintento) {
  // ¿Ya se terminó? (la respuesta de una petición anterior se perdió)
  const historial = await obtenerHistorial();
  const hecho = Array.isArray(historial) ? historial.find((w) => (w._id ?? w.id) === e.idServidor) : null;
  if (hecho) return { respuesta: hecho };
  if (reintento) throw new ApiError("No se ha podido subir el entrenamiento.", { status: 404 });
  // Se perdió (p. ej. se descartó en otro dispositivo): se vuelve a crear con sus datos.
  guardarCampos(e.localId, { idServidor: null, versionEnviada: 0 });
  return { otraVez: true };
}

// Sube un entreno. Devuelve la respuesta de /finish si se ha terminado, o null.
async function subir(localId, reintento = false) {
  let e = buscar(localId);
  if (!e) return null;

  if (e.descartar) {
    try {
      await descartarEntrenamiento();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
    }
    return null;
  }

  if (!e.idServidor) {
    const id = await crearEnServidor(e);
    guardarCampos(localId, { idServidor: id });
    guardarPlan(id, e.ejercicios);
    e = buscar(localId);
  }

  if (e.version > e.versionEnviada) {
    try {
      await guardarEntrenamiento({ ejercicios: e.ejercicios, notas: e.notas });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
      const r = await yaNoEstaEnCurso(e, reintento);
      return r.otraVez ? subir(localId, true) : r.respuesta;
    }
    // Mientras se enviaba pudo haber más cambios: solo se marca lo que se envió.
    const ahora = buscar(localId);
    if (ahora) guardarCampos(localId, { versionEnviada: Math.max(ahora.versionEnviada, e.version) });
  }

  if (e.fin) {
    try {
      return await terminarEntrenamiento({ fin: e.fin });
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) throw err;
      const r = await yaNoEstaEnCurso(e, reintento);
      return r.otraVez ? subir(localId, true) : r.respuesta;
    }
  }
  return null;
}

async function pasada() {
  if (!getUsuario()) return fijarEstado({ estado: "sin-sesion" });
  const terminados = {};
  try {
    // Primero los terminados, en orden (el servidor solo admite uno en curso a la vez).
    for (let p = leer().pendientes[0]; p; p = leer().pendientes[0]) {
      const respuesta = await subir(p.localId);
      if (respuesta) terminados[p.localId] = respuesta;
      modificar((e) => ({ ...e, pendientes: e.pendientes.filter((x) => x.localId !== p.localId) }));
    }
    const actual = leer().actual;
    if (actual) await subir(actual.localId);
    return fijarEstado({ estado: "ok", terminados });
  } catch (err) {
    if (esErrorDeRed(err)) return fijarEstado({ estado: "sin-conexion", terminados });
    if (err instanceof ApiError && [401, 403].includes(err.status)) return fijarEstado({ estado: "sin-sesion", terminados });
    return fijarEstado({ estado: err.conflicto ? "conflicto" : "error", mensaje: err.message, terminados });
  }
}

// Envía todo lo pendiente. Nunca hay dos envíos a la vez: si se pide otro mientras tanto,
// se repite al terminar. Devuelve { estado, mensaje?, terminados: { [localId]: respuestaDeFinish } }.
let repetir = false;
export function sincronizar() {
  if (enCurso) {
    repetir = true;
    return enCurso;
  }
  enCurso = (async () => {
    const terminados = {};
    let r;
    do {
      repetir = false;
      avisar();
      r = await pasada();
      Object.assign(terminados, r.terminados);
    } while (repetir && r.estado === "ok");
    return { ...r, terminados };
  })().finally(() => {
    enCurso = null;
    avisar();
  });
  return enCurso;
}

let temporizador = null;
export function sincronizarEnUnMomento(ms = 400) {
  clearTimeout(temporizador);
  temporizador = setTimeout(sincronizar, ms);
}

// Convierte un entreno local en la forma que usan las pantallas de resumen.
export function aEntrenamiento(e) {
  return {
    id: e.idServidor ?? e.localId,
    titulo: e.titulo,
    objetivo: e.objetivo,
    inicio: e.inicio,
    fin: e.fin,
    notas: e.notas,
    duracionMin: e.fin ? Math.round((new Date(e.fin) - new Date(e.inicio)) / 60000) : null,
    ejercicios: e.ejercicios,
  };
}

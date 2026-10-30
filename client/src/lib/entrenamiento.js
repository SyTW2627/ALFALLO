// Utilidades de la página de Entrenamiento: traducen los datos de la API
// (en inglés) a la forma que usan los componentes y calculan métricas.

import { ApiError } from "./api.js";
import { cerrarSesion } from "./auth.js";

export const OBJETIVOS = {
  force: { etiqueta: "Fuerza", descanso: 240 },
  hypertrophy: { etiqueta: "Hipertrofia", descanso: 150 },
  resistance: { etiqueta: "Resistencia", descanso: 45 },
};

export const ZONAS = {
  Back: "Espalda",
  Dorsal: "Dorsal",
  Lumbar: "Lumbar",
  Biceps: "Bíceps",
  Triceps: "Tríceps",
  Quadriceps: "Cuádriceps",
  Femoral: "Femoral",
  Gluteus: "Glúteo",
  Abdominal: "Abdominal",
  Chest: "Pecho",
  Abductors: "Abductores",
  Adductors: "Aductores",
  "Lateral Shoulder": "Hombro lateral",
  "Posterior Shoulder": "Hombro posterior",
  "Front Shoulder": "Hombro frontal",
};

const DESCANSO_POR_DEFECTO = 90;

export const etiquetaObjetivo = (o) => OBJETIVOS[o]?.etiqueta ?? "";
export const etiquetaZona = (z) => ZONAS[z] ?? z ?? "";

/* ---------- Normalización ---------- */

export function normalizarEjercicio(e) {
  // Si el ejercicio no está populado (o se borró del catálogo) llega como id o null.
  if (!e || typeof e !== "object") {
    return { id: e ?? null, nombre: "Ejercicio eliminado", descripcion: "", zona: "", dificultad: null };
  }
  return {
    id: e._id ?? e.id,
    nombre: e.name ?? "",
    descripcion: e.description ?? "",
    zona: e.bodyPart ?? "",
    dificultad: e.difficulty ?? null,
  };
}

export function normalizarEntrenamiento(w) {
  if (!w) return null;
  return {
    id: w._id ?? w.id,
    titulo: w.title ?? "Entrenamiento",
    objetivo: w.objective ?? null,
    estado: w.status,
    inicio: w.startedAt,
    fin: w.finishedAt ?? null,
    notas: w.notes ?? "",
    duracionMin: w.durationMinutes ?? null,
    ejercicios: (w.exercises ?? [])
      .filter((x) => x.exercise)
      .map((x) => ({
        ...normalizarEjercicio(x.exercise),
        series: (x.sets ?? []).map((s) => ({ reps: s.reps, kg: s.weightKg })),
      })),
  };
}

// Convierte las rutinas en una lista plana de "días" que se pueden empezar.
export function diasDeRutinas(rutinas = []) {
  return rutinas.flatMap((r) =>
    (r.days ?? []).map((d) => ({
      clave: `${r._id}-${d._id ?? d.name}`,
      rutina: r.name,
      nombre: d.name,
      objetivo: d.objective,
      ejercicios: (d.exercises ?? [])
        .filter((x) => x.exercise)
        .map((x) => ({
          ...normalizarEjercicio(x.exercise),
          plan: { series: x.sets, reps: x.reps, descanso: x.restInSeconds },
        })),
    }))
  );
}

/* ---------- Métricas ---------- */

export const totalSeries = (ejercicios) => ejercicios.reduce((a, e) => a + e.series.length, 0);

export const volumenTotal = (ejercicios) =>
  ejercicios.reduce((a, e) => a + e.series.reduce((b, s) => b + s.reps * s.kg, 0), 0);

// Para cada ejercicio: la mejor serie de la última sesión y el peso máximo histórico.
export function resumenHistorial(historial = []) {
  const ultima = {};
  const maximo = {};
  // El historial viene ordenado del más reciente al más antiguo.
  for (const w of historial) {
    for (const x of w.exercises ?? []) {
      const id = x.exercise?._id ?? x.exercise;
      if (!id || !x.sets?.length) continue;
      const mejor = x.sets.reduce((m, s) => (s.weightKg > m.weightKg ? s : m), x.sets[0]);
      if (!ultima[id]) ultima[id] = { kg: mejor.weightKg, reps: mejor.reps, fecha: w.finishedAt };
      maximo[id] = Math.max(maximo[id] ?? 0, mejor.weightKg);
    }
  }
  return { ultima, maximo };
}

// Ejercicios en los que se ha superado el peso máximo anterior.
export function nuevasMarcas(ejercicios, maximo) {
  return ejercicios
    .map((e) => {
      if (!e.series.length || maximo[e.id] === undefined) return null;
      const hoy = Math.max(...e.series.map((s) => s.kg));
      return hoy > maximo[e.id] ? { nombre: e.nombre, kg: hoy, mejora: hoy - maximo[e.id] } : null;
    })
    .filter(Boolean);
}

export function descansoPara(ejercicio, objetivo) {
  return ejercicio?.plan?.descanso ?? OBJETIVOS[objetivo]?.descanso ?? DESCANSO_POR_DEFECTO;
}

/* ---------- Plan del día (series/reps objetivo) ---------- */
// La API no guarda el plan dentro del entrenamiento, así que lo recordamos
// en el navegador para poder mostrarlo si se recarga la página.

const clavePlan = (id) => `alfallo:plan:${id}`;

export function guardarPlan(idEntrenamiento, ejercicios) {
  try {
    const plan = Object.fromEntries(ejercicios.filter((e) => e.plan).map((e) => [e.id, e.plan]));
    localStorage.setItem(clavePlan(idEntrenamiento), JSON.stringify(plan));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function leerPlan(idEntrenamiento) {
  try {
    return JSON.parse(localStorage.getItem(clavePlan(idEntrenamiento)) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

export function borrarPlan(idEntrenamiento) {
  try {
    localStorage.removeItem(clavePlan(idEntrenamiento));
  } catch {
    /* almacenamiento no disponible */
  }
}

// Une el entrenamiento de la API con el plan (series × reps) guardado en el navegador.
export function conPlan(entrenamiento) {
  if (!entrenamiento) return null;
  const plan = leerPlan(entrenamiento.id);
  return {
    ...entrenamiento,
    ejercicios: entrenamiento.ejercicios.map((e) => ({ ...e, plan: plan[e.id] ?? null })),
  };
}

/* ---------- Errores ---------- */

// Solo 401/403 significan sesión caducada (en /workouts un 404 es "no hay entrenamiento en curso",
// por eso aquí no se usa sesionRechazada()).
export function salirSiSesionCaducada(err) {
  if (err instanceof ApiError && [401, 403].includes(err.status)) {
    cerrarSesion("/login?sesion=caducada");
    return true;
  }
  return false;
}

/* ---------- Formato ---------- */

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
export const formatearKg = (kg) => `${numero.format(kg)} kg`;

export function formatearReloj(segundos) {
  const s = Math.max(0, Math.floor(segundos));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${r}` : `${m}:${r}`;
}

// Acepta "82,5" o "82.5".
export function leerNumero(texto) {
  const n = Number(String(texto).replace(",", ".").trim());
  return Number.isFinite(n) ? n : NaN;
}
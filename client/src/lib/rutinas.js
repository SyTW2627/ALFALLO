// Utilidades de la página de Rutinas: rangos por objetivo, conversión API <-> editor y validación.

import { normalizarEjercicio } from "./entrenamiento.js";

// Mismos rangos que OBJECTIVE_PROFILES en server/src/models/routines.ts.
// Si cambian en el servidor, hay que cambiarlos también aquí.
export const PERFILES = {
  force: {
    etiqueta: "Fuerza",
    lema: "Cargas altas, pocas reps",
    sets: { min: 3, max: 6, def: 4 },
    reps: { min: 4, max: 8, def: 6 },
    descanso: { min: 180, max: 300, def: 240 },
  },
  hypertrophy: {
    etiqueta: "Hipertrofia",
    lema: "Volumen para ganar músculo",
    sets: { min: 3, max: 4, def: 3 },
    reps: { min: 8, max: 12, def: 8 },
    descanso: { min: 90, max: 180, def: 150 },
  },
  resistance: {
    etiqueta: "Resistencia",
    lema: "Muchas reps, poco descanso",
    sets: { min: 2, max: 4, def: 3 },
    reps: { min: 15, max: 30, def: 20 },
    descanso: { min: 30, max: 60, def: 45 },
  },
};

export const MAX_DIAS = 7;
const CAMPOS = ["sets", "reps", "descanso"];

export const limitar = (valor, { min, max }) => Math.min(max, Math.max(min, valor));

let contador = 0;
const nuevaClave = () => `k${Date.now().toString(36)}${(contador++).toString(36)}`;

/* ---------- Editor ---------- */

export function nuevoDia(numero = 1, objetivo = "hypertrophy") {
  return { clave: nuevaClave(), nombre: `Día ${numero}`, objetivo, ejercicios: [] };
}

export function nuevaRutinaVacia() {
  return { id: null, nombre: "", dias: [nuevoDia(1)] };
}

export function lineaEjercicio(ejercicio, objetivo) {
  const p = PERFILES[objetivo];
  return { ...ejercicio, sets: p.sets.def, reps: p.reps.def, descanso: p.descanso.def };
}

// Al cambiar el objetivo de un día, los valores se ajustan al nuevo rango.
export function cambiarObjetivo(dia, objetivo) {
  const p = PERFILES[objetivo];
  return {
    ...dia,
    objetivo,
    ejercicios: dia.ejercicios.map((e) => ({
      ...e,
      sets: limitar(e.sets, p.sets),
      reps: limitar(e.reps, p.reps),
      descanso: limitar(e.descanso, p.descanso),
    })),
  };
}

/* ---------- API <-> editor ---------- */

export function normalizarRutina(r) {
  return {
    id: r._id ?? r.id,
    nombre: r.name ?? "",
    creada: r.createdAt ?? null,
    actualizada: r.updatedAt ?? null,
    dias: (r.days ?? []).map((d) => ({
      clave: d._id ?? nuevaClave(),
      nombre: d.name ?? "",
      objetivo: PERFILES[d.objective] ? d.objective : "hypertrophy",
      ejercicios: (d.exercises ?? [])
        .filter((x) => x.exercise)
        .map((x) => ({
          ...normalizarEjercicio(x.exercise),
          sets: x.sets,
          reps: x.reps,
          descanso: x.restInSeconds,
        })),
    })),
  };
}

export function aPayload(rutina) {
  return {
    name: rutina.nombre.trim(),
    days: rutina.dias.map((d) => ({
      name: d.nombre.trim(),
      objective: d.objetivo,
      exercises: d.ejercicios.map((e) => ({
        exercise: e.id,
        sets: e.sets,
        reps: e.reps,
        restInSeconds: e.descanso,
      })),
    })),
  };
}

/* ---------- Validación (la misma que hace el servidor, para avisar antes de enviar) ---------- */

export function validarRutina(rutina) {
  const errores = { dias: {} };
  if (!rutina.nombre.trim()) errores.nombre = "Ponle un nombre a la rutina.";
  if (rutina.dias.length < 1 || rutina.dias.length > MAX_DIAS) errores.general = `Una rutina debe tener entre 1 y ${MAX_DIAS} días.`;

  rutina.dias.forEach((d) => {
    const p = PERFILES[d.objetivo];
    let error = null;
    if (!d.nombre.trim()) error = "Ponle nombre a este día.";
    else if (d.ejercicios.length === 0) error = "Añade al menos un ejercicio.";
    else if (d.ejercicios.some((e) => CAMPOS.some((c) => e[c] < p[c].min || e[c] > p[c].max))) {
      error = `Hay valores fuera del rango de ${p.etiqueta.toLowerCase()}.`;
    }
    if (error) errores.dias[d.clave] = error;
  });

  const valida = !errores.nombre && !errores.general && Object.keys(errores.dias).length === 0;
  return { valida, errores };
}

/* ---------- Resumen y formato ---------- */

export function resumenRutina(rutina) {
  const ejercicios = rutina.dias.reduce((a, d) => a + d.ejercicios.length, 0);
  const series = rutina.dias.reduce((a, d) => a + d.ejercicios.reduce((b, e) => b + e.sets, 0), 0);
  return { dias: rutina.dias.length, ejercicios, series };
}

// Estimación de la duración de un día: ~40 s por serie + descansos entre series.
export function duracionDia(dia) {
  const segundos = dia.ejercicios.reduce((a, e) => a + e.sets * 40 + Math.max(e.sets - 1, 0) * e.descanso, 0);
  return Math.round(segundos / 60);
}

export function formatearDescanso(segundos) {
  if (segundos < 60) return `${segundos} s`;
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return s ? `${m}:${String(s).padStart(2, "0")} min` : `${m} min`;
}

// Versión corta para el contador: "45 s", "2:30", "4:00".
export function descansoCorto(segundos) {
  if (segundos < 60) return `${segundos} s`;
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2, "0")}`;
}

export const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
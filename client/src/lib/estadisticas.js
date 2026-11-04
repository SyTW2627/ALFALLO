// Cálculos de la página de Estadísticas a partir del historial (GET /workouts/history).
// Todo se calcula en el navegador: la API solo devuelve los entrenamientos terminados.

import { normalizarEntrenamiento, totalSeries, volumenTotal } from "./entrenamiento.js";

const DIA = 24 * 60 * 60 * 1000;

export const RANGOS = [
  { valor: "4s", etiqueta: "4 semanas", dias: 28 },
  { valor: "3m", etiqueta: "3 meses", dias: 91 },
  { valor: "1a", etiqueta: "1 año", dias: 364 },
  { valor: "todo", etiqueta: "Todo", dias: null },
];

// Historial de la API → entrenamientos normalizados, del más antiguo al más reciente.
export function prepararHistorial(historial = []) {
  return historial
    .map(normalizarEntrenamiento)
    .filter((w) => w && w.fin)
    .map((w) => ({
      ...w,
      fecha: new Date(w.fin),
      series: totalSeries(w.ejercicios),
      volumen: volumenTotal(w.ejercicios),
    }))
    .sort((a, b) => a.fecha - b.fecha);
}

export function filtrarPorRango(entrenamientos, valorRango, ahora = new Date()) {
  const rango = RANGOS.find((r) => r.valor === valorRango);
  if (!rango?.dias) return entrenamientos;
  const desde = ahora.getTime() - rango.dias * DIA;
  return entrenamientos.filter((w) => w.fecha.getTime() >= desde);
}

/* ---------- Semanas ---------- */

// Lunes 00:00 de la semana de `fecha`.
export function inicioSemana(fecha) {
  const d = new Date(fecha);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d;
}

// Volumen y nº de entrenamientos por semana, incluidas las semanas sin entrenar.
export function porSemana(entrenamientos, valorRango, ahora = new Date()) {
  const rango = RANGOS.find((r) => r.valor === valorRango);
  const actual = inicioSemana(ahora);
  let numSemanas;
  if (rango?.dias) numSemanas = Math.round(rango.dias / 7);
  else if (entrenamientos.length) {
    numSemanas = Math.round((actual - inicioSemana(entrenamientos[0].fecha)) / (7 * DIA)) + 1;
  } else numSemanas = 4;
  numSemanas = Math.min(Math.max(numSemanas, 1), 52);

  const semanas = Array.from({ length: numSemanas }, (_, i) => {
    const inicio = new Date(actual);
    inicio.setDate(actual.getDate() - (numSemanas - 1 - i) * 7);
    return { inicio, volumen: 0, entrenamientos: 0 };
  });
  const primera = semanas[0].inicio.getTime();
  for (const w of entrenamientos) {
    const i = Math.round((inicioSemana(w.fecha).getTime() - primera) / (7 * DIA));
    if (semanas[i]) {
      semanas[i].volumen += w.volumen;
      semanas[i].entrenamientos += 1;
    }
  }
  return semanas;
}

// Semanas seguidas (hasta la actual o la anterior) con al menos un entrenamiento.
export function rachaSemanas(entrenamientos, ahora = new Date()) {
  const conEntreno = new Set(entrenamientos.map((w) => inicioSemana(w.fecha).getTime()));
  const semana = inicioSemana(ahora);
  // Si esta semana aún no has entrenado, la racha sigue viva desde la anterior.
  if (!conEntreno.has(semana.getTime())) semana.setDate(semana.getDate() - 7);
  let racha = 0;
  while (conEntreno.has(semana.getTime())) {
    racha += 1;
    semana.setDate(semana.getDate() - 7);
  }
  return racha;
}

/* ---------- Resumen ---------- */

export function resumen(entrenamientos) {
  const duraciones = entrenamientos.map((w) => w.duracionMin).filter((d) => typeof d === "number");
  return {
    entrenamientos: entrenamientos.length,
    volumen: entrenamientos.reduce((a, w) => a + w.volumen, 0),
    series: entrenamientos.reduce((a, w) => a + w.series, 0),
    duracionMedia: duraciones.length ? Math.round(duraciones.reduce((a, d) => a + d, 0) / duraciones.length) : null,
  };
}

/* ---------- Ejercicios ---------- */

// Ejercicios que aparecen en el historial, ordenados por nº de sesiones.
export function ejerciciosEntrenados(entrenamientos) {
  const mapa = new Map();
  for (const w of entrenamientos) {
    for (const e of w.ejercicios) {
      if (!e.series.length) continue;
      const x = mapa.get(e.id) ?? { id: e.id, nombre: e.nombre, zona: e.zona, sesiones: 0 };
      x.sesiones += 1;
      mapa.set(e.id, x);
    }
  }
  return [...mapa.values()].sort((a, b) => b.sesiones - a.sesiones || a.nombre.localeCompare(b.nombre));
}

// Mejor serie (más peso) de cada sesión de un ejercicio.
export function progresion(entrenamientos, idEjercicio) {
  const puntos = [];
  for (const w of entrenamientos) {
    const e = w.ejercicios.find((x) => x.id === idEjercicio);
    if (!e?.series.length) continue;
    const mejor = e.series.reduce((m, s) => (s.kg > m.kg || (s.kg === m.kg && s.reps > m.reps) ? s : m));
    puntos.push({ fecha: w.fecha, kg: mejor.kg, reps: mejor.reps, titulo: w.titulo });
  }
  return puntos;
}

// Peso máximo de cada ejercicio y cuándo se hizo.
export function records(entrenamientos) {
  const mapa = new Map();
  for (const w of entrenamientos) {
    for (const e of w.ejercicios) {
      for (const s of e.series) {
        const r = mapa.get(e.id);
        if (!r || s.kg > r.kg || (s.kg === r.kg && s.reps > r.reps)) {
          mapa.set(e.id, { id: e.id, nombre: e.nombre, kg: s.kg, reps: s.reps, fecha: w.fecha });
        }
      }
    }
  }
  return [...mapa.values()].filter((r) => r.kg > 0).sort((a, b) => b.fecha - a.fecha);
}

// Series por zona muscular (de más a menos).
export function seriesPorZona(entrenamientos) {
  const mapa = new Map();
  for (const w of entrenamientos) {
    for (const e of w.ejercicios) {
      if (!e.zona || !e.series.length) continue;
      mapa.set(e.zona, (mapa.get(e.zona) ?? 0) + e.series.length);
    }
  }
  return [...mapa.entries()].map(([zona, series]) => ({ zona, series })).sort((a, b) => b.series - a.series);
}

/* ---------- Formato ---------- */

const corta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const larga = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });
const compacto = new Intl.NumberFormat("es-ES", { notation: "compact", maximumFractionDigits: 1 });

export const fechaCorta = (d) => corta.format(d).replace(".", "");
export const fechaLarga = (d) => larga.format(d);
export const numeroCompacto = (n) => compacto.format(n);

// Marcas "redondas" para el eje Y: 0, 2.500, 5.000...
export function marcasEje(maximo, cuantas = 4) {
  if (!maximo || maximo <= 0) return [0, 1];
  const bruto = maximo / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const tope = Math.ceil(maximo / paso) * paso;
  return Array.from({ length: Math.round(tope / paso) + 1 }, (_, i) => i * paso);
}
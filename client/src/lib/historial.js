// Utilidades de la página de Historial: agrupar, buscar y editar entrenamientos terminados.

import { normalizarEntrenamiento, totalSeries, volumenTotal, leerNumero } from "./entrenamiento.js";

const MIN = 60 * 1000;
export const MAX_DURACION_MIN = 24 * 60;

// Historial de la API → entrenamientos normalizados, del más reciente al más antiguo.
export function prepararLista(historial = []) {
  return historial
    .map(normalizarEntrenamiento)
    .filter((w) => w && w.fin)
    .map(conMetricas)
    .sort((a, b) => b.fecha - a.fecha);
}

export function conMetricas(w) {
  return { ...w, fecha: new Date(w.fin), numSeries: totalSeries(w.ejercicios), volumen: volumenTotal(w.ejercicios) };
}

const sinAcentos = (t = "") =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Busca en el nombre del entrenamiento y en los ejercicios.
export function filtrar(lista, texto) {
  const q = sinAcentos(texto.trim());
  if (!q) return lista;
  return lista.filter(
    (w) => sinAcentos(w.titulo).includes(q) || w.ejercicios.some((e) => sinAcentos(e.nombre).includes(q))
  );
}

/* ---------- Agrupar por mes ---------- */

const nombreMes = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" });
const capitalizar = (t) => t.charAt(0).toUpperCase() + t.slice(1);

export function agruparPorMes(lista) {
  const grupos = [];
  for (const w of lista) {
    const clave = `${w.fecha.getFullYear()}-${w.fecha.getMonth()}`;
    let g = grupos.at(-1);
    if (!g || g.clave !== clave) {
      g = { clave, titulo: capitalizar(nombreMes.format(w.fecha)), entrenamientos: [] };
      grupos.push(g);
    }
    g.entrenamientos.push(w);
  }
  return grupos;
}

/* ---------- Formato ---------- */

const diaSemana = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const hora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const fechaLarga = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

export const diaCorto = (fecha) => capitalizar(diaSemana.format(fecha).replace(".", ""));
export const formatearHora = (fecha) => hora.format(fecha);
export const formatearFechaLarga = (fecha) => capitalizar(fechaLarga.format(fecha));

// "4 × 8" si todas las series tienen las mismas reps; si no, "8 · 8 · 6".
export function describirSeries(series) {
  const reps = series.map((s) => s.reps);
  return reps.every((r) => r === reps[0]) ? `${reps.length} × ${reps[0]}` : reps.join(" · ");
}

/* ---------- Editor ----------
 * En el editor los números se guardan como texto (lo que escribe el usuario)
 * y se convierten al validar.
 */

const dosCifras = (n) => String(n).padStart(2, "0");
const aFechaInput = (d) => `${d.getFullYear()}-${dosCifras(d.getMonth() + 1)}-${dosCifras(d.getDate())}`;
const aHoraInput = (d) => `${dosCifras(d.getHours())}:${dosCifras(d.getMinutes())}`;

let contador = 0;
const nuevaClave = () => `l${Date.now().toString(36)}${(contador++).toString(36)}`;

export const nuevaSerie = (anterior) => ({ clave: nuevaClave(), kg: anterior?.kg ?? "", reps: anterior?.reps ?? "" });

export function lineaNueva(ejercicio) {
  return { ...ejercicio, clave: nuevaClave(), series: [nuevaSerie()] };
}

export function aBorrador(w) {
  const inicio = new Date(w.inicio);
  const fin = new Date(w.fin);
  return {
    id: w.id,
    titulo: w.titulo,
    objetivo: w.objetivo ?? "",
    notas: w.notas ?? "",
    fecha: aFechaInput(inicio),
    hora: aHoraInput(inicio),
    duracion: String(Math.max(0, Math.round((fin - inicio) / MIN))),
    ejercicios: w.ejercicios.map((e) => ({
      ...e,
      clave: nuevaClave(),
      series: e.series.map((s) => ({ clave: nuevaClave(), kg: String(s.kg), reps: String(s.reps) })),
    })),
  };
}

// Devuelve { valido, errores, datos } donde `datos` está listo para editarEntrenamiento().
export function validarBorrador(b, ahora = new Date()) {
  const errores = {};

  const titulo = b.titulo.trim();
  if (!titulo) errores.titulo = "Ponle un nombre al entrenamiento.";

  const inicio = new Date(`${b.fecha}T${b.hora || "00:00"}`);
  if (!b.fecha || Number.isNaN(inicio.getTime())) errores.fecha = "Indica una fecha y hora válidas.";

  const duracion = leerNumero(b.duracion);
  if (!Number.isInteger(duracion) || duracion < 0 || duracion > MAX_DURACION_MIN) {
    errores.duracion = "La duración debe ser un número de minutos entre 0 y 1440.";
  }

  const fin = new Date(inicio.getTime() + (Number.isFinite(duracion) ? duracion : 0) * MIN);
  if (!errores.fecha && !errores.duracion && fin.getTime() > ahora.getTime() + 2 * MIN) {
    errores.fecha = "El entrenamiento no puede terminar en el futuro.";
  }

  const series = {}; // clave de la serie → mensaje
  const ejercicios = b.ejercicios.map((e) => ({
    id: e.id,
    series: e.series.map((s) => {
      const kg = leerNumero(s.kg);
      const reps = leerNumero(s.reps);
      if (!Number.isInteger(reps) || reps < 1) series[s.clave] = "Reps: entero mayor que 0.";
      else if (Number.isNaN(kg) || kg < 0 || kg > 1000 || String(s.kg).trim() === "") series[s.clave] = "Peso entre 0 y 1000 kg.";
      return { kg, reps };
    }),
  }));
  if (Object.keys(series).length) errores.series = series;

  const conSeries = ejercicios.filter((e) => e.series.length > 0);
  if (conSeries.length === 0) errores.ejercicios = "El entrenamiento debe tener al menos una serie.";

  return {
    valido: Object.keys(errores).length === 0,
    errores,
    datos: {
      titulo,
      objetivo: b.objetivo || null,
      notas: b.notas.trim(),
      inicio: Number.isNaN(inicio.getTime()) ? null : inicio.toISOString(),
      fin: Number.isNaN(fin.getTime()) ? null : fin.toISOString(),
      // Los ejercicios sin series no se guardan.
      ejercicios: conSeries,
    },
  };
}

// Para detectar cambios sin guardar.
export const huella = (b) =>
  JSON.stringify({
    ...b,
    ejercicios: b.ejercicios.map((e) => ({ id: e.id, series: e.series.map((s) => [String(s.kg), String(s.reps)]) })),
  });

// Utilidades de Versus (beta): formato de marcas, tiempo restante y frases para picar al rival.

import { formatearNumero, formatearRatio } from "./progreso.js";

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

export const MODALIDADES = [
  {
    valor: "kg",
    etiqueta: "Más kilos",
    corta: "Por kilos",
    detalle: "Gana el 1RM estimado más alto. Fuerza bruta.",
  },
  {
    valor: "relativa",
    etiqueta: "Más proporción",
    corta: "Por proporción",
    detalle: "1RM entre tu peso corporal. Aquí el ligero también puede ganar.",
  },
];

export const modalidadDe = (valor) => MODALIDADES.find((m) => m.valor === valor) ?? MODALIDADES[0];

export const valorMarca = (m, modalidad) => (m == null ? null : modalidad === "kg" ? m.e1rm : m.ratio);

export function formatearMarca(m, modalidad) {
  const v = valorMarca(m, modalidad);
  if (v == null) return "—";
  return modalidad === "kg" ? `${formatearNumero(v)} kg` : formatearRatio(v);
}

export function formatearDiferencia(diferencia, modalidad) {
  return modalidad === "kg" ? `${formatearNumero(Math.round(diferencia * 10) / 10)} kg` : formatearRatio(diferencia);
}

// "100 kg × 3" (la serie que da esa marca)
export const detalleMarca = (m) => (m ? `${formatearNumero(m.kg)} kg × ${m.reps}` : "Sin marca aún");

// "3 d 4 h", "5 h 20 min", "12 min"
export function tiempoRestante(fin) {
  const ms = new Date(fin).getTime() - Date.now();
  if (ms <= 0) return "Terminando…";
  const d = Math.floor(ms / DIA);
  const h = Math.floor((ms % DIA) / HORA);
  const min = Math.max(1, Math.floor((ms % HORA) / 60000));
  if (d >= 1) return `${d} d ${h} h`;
  if (h >= 1) return `${h} h ${min} min`;
  return `${min} min`;
}

// Porcentaje de tiempo transcurrido del duelo (para la barra de progreso).
export function avanceDuelo(inicio, fin) {
  const total = new Date(fin).getTime() - new Date(inicio).getTime();
  if (total <= 0) return 100;
  return Math.max(0, Math.min(100, ((Date.now() - new Date(inicio).getTime()) / total) * 100));
}

// Mi lado y el del rival en un duelo.
export function lados(duelo) {
  const yo = duelo.soyRetador ? "retador" : "rival";
  const otro = duelo.soyRetador ? "rival" : "retador";
  return { yo, otro, rival: duelo[otro] };
}

export const PIQUES = [
  "¿Seguro que no te da miedo?",
  "Tu récord tiene los días contados.",
  "El que pierda paga los batidos.",
  "Te espero debajo de la barra.",
  "Hoy no valen excusas.",
  "Calienta bien, que te va a hacer falta.",
  "Esto no es personal… bueno, un poco sí.",
  "Que gane el que menos se salte la pierna.",
];

export const piqueAleatorio = (actual = "") => {
  const opciones = PIQUES.filter((p) => p !== actual);
  return opciones[Math.floor(Math.random() * opciones.length)];
};

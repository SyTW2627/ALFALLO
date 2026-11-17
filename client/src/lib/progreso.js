// Utilidades de la página de Logros (rangos, hitos y retos).

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1 });
const ratio = new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fechaCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const fechaLarga = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "long", year: "numeric" });

export const formatearNumero = (n) => numero.format(n);
export const formatearRatio = (n) => `${ratio.format(n)}×`;
export const formatearFechaCorta = (f) => fechaCorta.format(new Date(f)).replace(".", "");
export const formatearFechaLarga = (f) => fechaLarga.format(new Date(f));

// Color de cada rango (metales). El nombre del rango siempre se escribe al lado:
// el color decora, no es la única pista.
export const COLORES_RANGO = {
  hierro: "#8b9099",
  bronce: "#cd8a52",
  plata: "#c9ced8",
  oro: "#f2c94c",
  platino: "#79d9cb",
  diamante: "#72a9ff",
  elite: "#c18cff",
};
export const colorRango = (rango) => (rango ? COLORES_RANGO[rango.key] : "var(--color-borde)");

export const NOMBRES_RANGO = ["Hierro", "Bronce", "Plata", "Oro", "Platino", "Diamante", "Élite"];

export const SEXOS = [
  { valor: "male", etiqueta: "Masculina" },
  { valor: "female", etiqueta: "Femenina" },
  { valor: "unspecified", etiqueta: "Sin especificar" },
];

// Peso que tendrías que mover con las mismas reps para llegar a un 1RM (Epley inversa).
export function pesoParaReps(e1rm, reps) {
  const kg = reps === 1 ? e1rm : e1rm / (1 + reps / 30);
  return Math.ceil(kg * 2) / 2;
}

// "4/10", "2,5 t / 10 t", "0,86× / 1×", "Plata / Oro"...
export function formatearValorHito(unidad, valor) {
  switch (unidad) {
    case "kg":
      return valor >= 1000 ? `${numero.format(valor / 1000)} t` : `${numero.format(valor)} kg`;
    case "x":
      return formatearRatio(valor);
    case "semanas":
      return `${numero.format(valor)} ${valor === 1 ? "semana" : "semanas"}`;
    case "rango":
      return valor > 0 ? NOMBRES_RANGO[valor - 1] : "Sin rango";
    case "min":
      return `${numero.format(valor)} min`;
    case "series":
      return `${numero.format(valor)} series`;
    default:
      return numero.format(valor);
  }
}

export const porcentaje = (actual, objetivo) => Math.max(0, Math.min(100, objetivo ? (actual / objetivo) * 100 : 0));

export function diasRestantes(fecha) {
  const dias = Math.ceil((new Date(fecha).getTime() - Date.now()) / 864e5);
  if (dias <= 0) return "Termina hoy";
  return dias === 1 ? "Termina mañana" : `Quedan ${dias} días`;
}
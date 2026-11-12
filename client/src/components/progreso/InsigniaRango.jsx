import { colorRango } from "../../lib/progreso.js";

// Escudo con el color del rango y su nivel (1–7). Sin rango, se dibuja vacío.
export default function InsigniaRango({ rango, tamano = 48 }) {
  const color = colorRango(rango);
  return (
    <svg
      width={tamano}
      height={tamano}
      viewBox="0 0 48 48"
      role="img"
      aria-label={rango ? `Rango ${rango.label}` : "Sin rango"}
      className="shrink-0"
    >
      <path
        d="M24 3 42 9v13c0 11.5-7.6 19.6-18 23C13.6 41.6 6 33.5 6 22V9Z"
        fill={rango ? color : "none"}
        fillOpacity={rango ? 0.18 : 0}
        stroke={color}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {rango ? (
        <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="800" fill={color}>
          {rango.nivel}
        </text>
      ) : (
        <text x="24" y="29" textAnchor="middle" fontSize="15" fontWeight="800" fill="var(--color-suave)">
          –
        </text>
      )}
    </svg>
  );
}
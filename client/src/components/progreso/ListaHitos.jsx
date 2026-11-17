import { formatearValorHito, formatearFechaLarga, porcentaje } from "../../lib/progreso.js";

const CATEGORIAS = [
  { key: "constancia", titulo: "Constancia", icono: <path d="M12 2c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-1.5.5-2.5 1.5-3.5C9.5 9 11 9 12 2ZM6 14a6 6 0 0 0 12 0" /> },
  { key: "volumen", titulo: "Volumen", icono: <path d="M6 7h12l2 13H4L6 7Zm3 0a3 3 0 0 1 6 0" /> },
  { key: "fuerza", titulo: "Fuerza", icono: <path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11" /> },
  { key: "rango", titulo: "Rangos", icono: <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4ZM7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4" /> },
];

function Hito({ hito, icono }) {
  const hecho = hito.conseguido;
  return (
    <li
      className={`flex gap-4 rounded-2xl border p-4 ${
        hecho ? "border-acento/30 bg-acento/5" : "border-borde bg-superficie"
      }`}
    >
      <div
        className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${
          hecho ? "bg-acento/15 text-acento" : "bg-elevada text-suave"
        }`}
        aria-hidden="true"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icono}
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={`font-bold ${hecho ? "" : "text-white/80"}`}>{hito.titulo}</p>
          {hecho && (
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-acento">Conseguido</span>
          )}
        </div>
        <p className="text-sm text-suave">{hito.descripcion}</p>
        {hecho ? (
          hito.conseguidoEn && <p className="mt-1 text-xs text-suave">{formatearFechaLarga(hito.conseguidoEn)}</p>
        ) : (
          <>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevada">
              <div
                className="h-full rounded-full bg-primario"
                style={{ width: `${Math.max(porcentaje(hito.actual, hito.objetivo), 2)}%` }}
              />
            </div>
            <p className="mt-1 text-xs tabular-nums text-suave">
              {formatearValorHito(hito.unidad, hito.actual)} / {formatearValorHito(hito.unidad, hito.objetivo)}
            </p>
          </>
        )}
      </div>
    </li>
  );
}

export default function ListaHitos({ hitos }) {
  return (
    <div className="space-y-6">
      {CATEGORIAS.map((c) => {
        const lista = hitos.filter((h) => h.categoria === c.key);
        if (!lista.length) return null;
        // Conseguidos primero.
        const ordenada = [...lista.filter((h) => h.conseguido), ...lista.filter((h) => !h.conseguido)];
        return (
          <section key={c.key} aria-labelledby={`hitos-${c.key}`}>
            <h3 id={`hitos-${c.key}`} className="mb-3 text-sm font-bold text-suave">
              {c.titulo} · {lista.filter((h) => h.conseguido).length}/{lista.length}
            </h3>
            <ul className="grid gap-3 sm:grid-cols-2">
              {ordenada.map((h) => (
                <Hito key={h.key} hito={h} icono={c.icono} />
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
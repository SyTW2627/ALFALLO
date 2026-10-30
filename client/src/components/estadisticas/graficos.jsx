import { useEffect, useRef, useState } from "react";
import { marcasEje } from "../../lib/estadisticas.js";

// Colores del tema (definidos en global.css con @theme).
const C = {
  marca: "var(--color-primario)",
  rejilla: "var(--color-borde)",
  texto: "var(--color-suave)",
  fondo: "var(--color-superficie)",
};
const MARGEN = { arriba: 12, derecha: 12, abajo: 26, izquierda: 44 };

// Mide el ancho real del contenedor para dibujar el SVG a escala 1:1 (texto siempre legible).
function useAncho() {
  const ref = useRef(null);
  const [ancho, setAncho] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setAncho(Math.floor(e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, ancho];
}

function Tooltip({ x, y, ancho, children }) {
  // Se da la vuelta cerca del borde derecho para no salirse del gráfico.
  const izquierda = x > ancho - 160;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-10 whitespace-nowrap rounded-lg border border-borde bg-elevada px-3 py-2 text-xs shadow-xl shadow-black/40"
      style={{ left: x, top: y, transform: `translate(${izquierda ? "calc(-100% - 10px)" : "10px"}, -50%)` }}
    >
      {children}
    </div>
  );
}

function EjeY({ marcas, escala, ancho, formato }) {
  return marcas.map((m) => (
    <g key={m}>
      <line
        x1={MARGEN.izquierda}
        x2={ancho - MARGEN.derecha}
        y1={escala(m)}
        y2={escala(m)}
        stroke={C.rejilla}
        strokeWidth="1"
        strokeDasharray={m === marcas[0] ? undefined : "2 4"}
      />
      <text x={MARGEN.izquierda - 8} y={escala(m)} dy="0.32em" textAnchor="end" fontSize="11" fill={C.texto}>
        {formato(m)}
      </text>
    </g>
  ));
}

/* ---------- Barras verticales ----------
 * datos: [{ clave, etiqueta, valor, detalle }]
 */
export function GraficoBarras({ datos, formatoEje, renderTooltip, alto = 220, etiqueta }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);

  const maximo = Math.max(...datos.map((d) => d.valor), 0);
  const marcas = marcasEje(maximo);
  const tope = marcas.at(-1);
  const zonaAncho = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha, 0);
  const zonaAlto = alto - MARGEN.arriba - MARGEN.abajo;
  const columna = datos.length ? zonaAncho / datos.length : 0;
  const barra = Math.max(Math.min(columna - 4, 28), 2); // 2px de hueco mínimo entre barras
  const y = (v) => MARGEN.arriba + zonaAlto - (v / tope) * zonaAlto;
  // Etiquetas del eje X sin solaparse: como mucho una cada ~56px.
  const cadaCuantas = Math.max(1, Math.ceil(56 / Math.max(columna, 1)));

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActivo(null)}>
      {ancho > 0 && (
        <svg width={ancho} height={alto} role="img" aria-label={etiqueta} className="block">
          <EjeY marcas={marcas} escala={y} ancho={ancho} formato={formatoEje} />
          {datos.map((d, i) => {
            const cx = MARGEN.izquierda + columna * i + columna / 2;
            const h = d.valor > 0 ? Math.max(y(0) - y(d.valor), 2) : 0;
            const x0 = cx - barra / 2;
            const r = Math.min(4, barra / 2, h);
            return (
              <g key={d.clave}>
                {h > 0 && (
                  <path
                    d={`M${x0},${y(0)} V${y(0) - h + r} Q${x0},${y(0) - h} ${x0 + r},${y(0) - h} H${x0 + barra - r} Q${x0 + barra},${y(0) - h} ${x0 + barra},${y(0) - h + r} V${y(0)} Z`}
                    fill={C.marca}
                    opacity={activo === null || activo === i ? 1 : 0.45}
                  />
                )}
                {i % cadaCuantas === (datos.length - 1) % cadaCuantas && (
                  <text x={cx} y={alto - 8} textAnchor="middle" fontSize="11" fill={C.texto}>
                    {d.etiqueta}
                  </text>
                )}
                {/* Zona de hover/tap más grande que la barra */}
                <rect
                  x={MARGEN.izquierda + columna * i}
                  y={MARGEN.arriba}
                  width={columna}
                  height={zonaAlto}
                  fill="transparent"
                  onMouseEnter={() => setActivo(i)}
                  onClick={() => setActivo(i)}
                />
              </g>
            );
          })}
        </svg>
      )}
      {activo !== null && datos[activo] && (
        <Tooltip
          x={MARGEN.izquierda + columna * activo + columna / 2}
          y={Math.min(y(datos[activo].valor), y(0) - 20)}
          ancho={ancho}
        >
          {renderTooltip(datos[activo])}
        </Tooltip>
      )}
    </div>
  );
}

/* ---------- Línea ----------
 * puntos: [{ clave, etiqueta, valor, ... }] en orden cronológico
 */
function marcasRango(min, max, cuantas = 4) {
  if (min === max) return marcasEje(max || 1, cuantas);
  const bruto = (max - min) / cuantas;
  const potencia = 10 ** Math.floor(Math.log10(bruto));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= bruto);
  const desde = Math.max(0, Math.floor(min / paso) * paso);
  const hasta = Math.ceil(max / paso) * paso;
  return Array.from({ length: Math.round((hasta - desde) / paso) + 1 }, (_, i) => desde + i * paso);
}

export function GraficoLinea({ puntos, formatoEje, formatoValor, renderTooltip, alto = 240, etiqueta }) {
  const [ref, ancho] = useAncho();
  const [activo, setActivo] = useState(null);

  const valores = puntos.map((p) => p.valor);
  const marcas = marcasRango(Math.min(...valores), Math.max(...valores));
  const [bajo, tope] = [marcas[0], marcas.at(-1)];
  const zonaAncho = Math.max(ancho - MARGEN.izquierda - MARGEN.derecha - 24, 0); // hueco para la etiqueta final
  const arriba = MARGEN.arriba + 16; // hueco para la etiqueta del último punto
  const zonaAlto = alto - arriba - MARGEN.abajo;
  const x = (i) => MARGEN.izquierda + 8 + (puntos.length > 1 ? (i / (puntos.length - 1)) * zonaAncho : zonaAncho / 2);
  const y = (v) => arriba + zonaAlto - ((v - bajo) / (tope - bajo || 1)) * zonaAlto;
  const camino = puntos.map((p, i) => `${i ? "L" : "M"}${x(i)},${y(p.valor)}`).join(" ");
  const cadaCuantas = Math.max(1, Math.ceil(64 / Math.max(zonaAncho / Math.max(puntos.length - 1, 1), 1)));

  const alMover = (e) => {
    const caja = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - caja.left;
    let cercano = 0;
    puntos.forEach((_, i) => {
      if (Math.abs(x(i) - px) < Math.abs(x(cercano) - px)) cercano = i;
    });
    setActivo(cercano);
  };

  const ultimo = puntos.length - 1;

  return (
    <div ref={ref} className="relative" onMouseLeave={() => setActivo(null)}>
      {ancho > 0 && (
        <svg
          width={ancho}
          height={alto}
          role="img"
          aria-label={etiqueta}
          className="block"
          onMouseMove={alMover}
          onClick={alMover}
        >
          <EjeY marcas={marcas} escala={y} ancho={ancho} formato={formatoEje} />
          {puntos.map(
            (p, i) =>
              (ultimo - i) % cadaCuantas === 0 && (
                <text key={p.clave} x={x(i)} y={alto - 8} textAnchor="middle" fontSize="11" fill={C.texto}>
                  {p.etiqueta}
                </text>
              )
          )}
          {activo !== null && (
            <line x1={x(activo)} x2={x(activo)} y1={arriba} y2={y(bajo)} stroke={C.texto} strokeWidth="1" strokeDasharray="3 3" />
          )}
          <path d={camino} fill="none" stroke={C.marca} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {puntos.map((p, i) => (
            <circle
              key={p.clave}
              cx={x(i)}
              cy={y(p.valor)}
              r={activo === i ? 5 : 4}
              fill={C.marca}
              stroke={C.fondo}
              strokeWidth="2"
            />
          ))}
          {/* Etiqueta directa solo en el último punto */}
          <text x={x(ultimo)} y={y(puntos[ultimo].valor) - 12} textAnchor="middle" fontSize="12" fontWeight="700" fill="currentColor">
            {formatoValor(puntos[ultimo].valor)}
          </text>
        </svg>
      )}
      {activo !== null && puntos[activo] && (
        <Tooltip x={x(activo)} y={y(puntos[activo].valor)} ancho={ancho}>
          {renderTooltip(puntos[activo])}
        </Tooltip>
      )}
    </div>
  );
}
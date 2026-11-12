import InsigniaRango from "./InsigniaRango.jsx";
import { colorRango } from "../../lib/progreso.js";

// Lo conseguido con el entrenamiento recién terminado (viene en la respuesta de POST /workouts/finish).
export default function Novedades({ novedades }) {
  if (!novedades) return null;
  const { rangos = [], hitos = [], retos = [] } = novedades;
  if (!rangos.length && !hitos.length && !retos.length) return null;

  return (
    <section aria-label="Logros conseguidos" className="mt-4 space-y-2">
      {rangos.map((r) => (
        <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-borde bg-superficie p-4">
          <InsigniaRango rango={r.a} tamano={44} />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest text-suave">Nuevo rango</p>
            <p className="font-bold">
              <span style={{ color: colorRango(r.a) }}>{r.a.label}</span> en {r.label.toLowerCase()}
            </p>
            {r.de && <p className="text-xs text-suave">Antes: {r.de.label}</p>}
          </div>
        </div>
      ))}
      {hitos.map((h) => (
        <div key={h.key} className="rounded-2xl border border-acento/30 bg-acento/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-acento">Hito conseguido</p>
          <p className="font-bold">{h.titulo}</p>
          <p className="text-xs text-suave">{h.descripcion}</p>
        </div>
      ))}
      {retos.map((r) => (
        <div key={r.key} className="rounded-2xl border border-primario/30 bg-primario/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primario">Reto semanal completado</p>
          <p className="font-bold">{r.titulo}</p>
        </div>
      ))}
      <a href="/progreso" className="inline-block pt-1 text-xs font-semibold text-primario hover:underline">
        Ver todos tus logros
      </a>
    </section>
  );
}
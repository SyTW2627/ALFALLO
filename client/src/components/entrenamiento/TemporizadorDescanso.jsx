import { useEffect, useState } from "react";
import { formatearReloj } from "../../lib/entrenamiento.js";

// Cuenta atrás flotante que aparece al registrar una serie.
// Se basa en la hora de fin (no en restar segundos) para no desfasarse si la pestaña se duerme.
export default function TemporizadorDescanso({ fin: finInicial, total: totalInicial, ejercicio, onCerrar }) {
  const [fin, setFin] = useState(finInicial);
  const [total, setTotal] = useState(totalInicial);
  const [ahora, setAhora] = useState(() => Date.now());

  const restante = Math.max(0, Math.ceil((fin - ahora) / 1000));
  const terminado = restante === 0;

  useEffect(() => {
    if (terminado) {
      try {
        navigator.vibrate?.([200, 100, 200]);
      } catch {
        /* sin vibración */
      }
      return;
    }
    const id = setInterval(() => setAhora(Date.now()), 250);
    return () => clearInterval(id);
  }, [terminado]);

  const ajustar = (segundos) => {
    setFin((f) => Math.max(Date.now(), f + segundos * 1000));
    setTotal((t) => Math.max(1, t + segundos));
    setAhora(Date.now());
  };

  const progreso = Math.min(100, ((total - restante) / total) * 100);

  return (
    <div
      role="timer"
      aria-live="polite"
      className="fixed inset-x-4 bottom-20 z-40 mx-auto max-w-md overflow-hidden rounded-2xl border border-borde bg-elevada shadow-2xl shadow-black/60 md:bottom-6 md:left-56"
    >
      <div className="h-1 bg-borde">
        <div
          className={`h-full transition-[width] duration-300 ${terminado ? "bg-acento" : "bg-primario"}`}
          style={{ width: `${progreso}%` }}
        />
      </div>
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-widest text-suave">
            {terminado ? "¡A por la siguiente!" : `Descanso · ${ejercicio}`}
          </p>
          <p className={`text-2xl font-extrabold tabular-nums ${terminado ? "text-acento" : ""}`}>
            {formatearReloj(restante)}
          </p>
        </div>
        {!terminado && (
          <>
            <button
              type="button"
              onClick={() => ajustar(-15)}
              aria-label="Restar 15 segundos"
              className="h-10 rounded-lg border border-borde px-3 text-xs font-bold text-suave transition hover:text-white"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => ajustar(15)}
              aria-label="Sumar 15 segundos"
              className="h-10 rounded-lg border border-borde px-3 text-xs font-bold text-suave transition hover:text-white"
            >
              +15
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onCerrar}
          className="h-10 rounded-lg bg-primario px-4 text-xs font-bold text-fondo transition hover:brightness-110"
        >
          {terminado ? "Cerrar" : "Saltar"}
        </button>
      </div>
    </div>
  );
}
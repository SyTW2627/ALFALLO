// Selector numérico con botones − / + que nunca se sale del rango permitido por el objetivo.
export default function Contador({ etiqueta, valor, rango, paso = 1, formato = (v) => v, onCambiar }) {
  const cambiar = (delta) => onCambiar(Math.min(rango.max, Math.max(rango.min, valor + delta)));
  const fuera = valor < rango.min || valor > rango.max;

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-suave">{etiqueta}</p>
      <div
        className={`mt-1 flex h-11 items-center rounded-lg border bg-fondo ${fuera ? "border-red-500/60" : "border-borde"}`}
      >
        <button
          type="button"
          onClick={() => cambiar(-paso)}
          disabled={valor <= rango.min}
          aria-label={`Bajar ${etiqueta.toLowerCase()}`}
          className="grid h-full w-8 shrink-0 place-items-center rounded-l-lg text-lg font-bold text-suave transition hover:bg-elevada hover:text-white disabled:opacity-30 disabled:hover:bg-transparent sm:w-10"
        >
          −
        </button>
        <output aria-label={etiqueta} className="min-w-0 flex-1 text-center text-sm font-semibold tabular-nums">
          {formato(valor)}
        </output>
        <button
          type="button"
          onClick={() => cambiar(paso)}
          disabled={valor >= rango.max}
          aria-label={`Subir ${etiqueta.toLowerCase()}`}
          className="grid h-full w-8 shrink-0 place-items-center rounded-r-lg text-lg font-bold text-suave transition hover:bg-elevada hover:text-white disabled:opacity-30 disabled:hover:bg-transparent sm:w-10"
        >
          +
        </button>
      </div>
    </div>
  );
}
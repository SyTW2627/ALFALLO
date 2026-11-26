import { useState } from "react";
import { normalizarRutina, PERFILES, resumenRutina, plural } from "../../lib/rutinas.js";

const COLOR_NIVEL = {
  Principiante: "border-acento/40 text-acento",
  Intermedio: "border-primario/40 text-primario",
  Avanzado: "border-red-400/40 text-peligro",
};

function TarjetaPlantilla({ plantilla, yaLaTienes, onUsar }) {
  const [abierta, setAbierta] = useState(false);
  const [usando, setUsando] = useState(false);
  const rutina = normalizarRutina(plantilla);
  const r = resumenRutina(rutina);

  const usar = async () => {
    setUsando(true);
    try {
      await onUsar(plantilla.clave);
    } finally {
      setUsando(false);
    }
  };

  return (
    <li className="flex flex-col rounded-2xl border border-borde bg-superficie p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-lg font-extrabold">{rutina.nombre}</h3>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${COLOR_NIVEL[plantilla.nivel] ?? ""}`}>
          {plantilla.nivel}
        </span>
      </div>
      <p className="mt-1 text-xs text-suave">
        {plantilla.frecuencia} · {plural(r.ejercicios, "ejercicio", "ejercicios")} · {plural(r.series, "serie", "series")}
      </p>
      <p className="mt-3 flex-1 text-sm text-suave">{plantilla.descripcion}</p>

      <button
        type="button"
        onClick={() => setAbierta((a) => !a)}
        aria-expanded={abierta}
        className="mt-3 self-start text-xs font-semibold text-primario hover:underline"
      >
        {abierta ? "Ocultar los días" : `Ver los ${rutina.dias.length} días`}
      </button>
      {abierta && (
        <ol className="mt-3 divide-y divide-borde rounded-xl border border-borde bg-fondo">
          {rutina.dias.map((d, i) => (
            <li key={d.clave} className="px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold">
                  <span className="mr-2 text-primario">{i + 1}</span>
                  {d.nombre}
                </p>
                <span className="text-[10px] font-bold uppercase tracking-wider text-primario">{PERFILES[d.objetivo]?.etiqueta}</span>
              </div>
              <ul className="mt-1 space-y-0.5 text-xs text-suave">
                {d.ejercicios.map((e) => (
                  <li key={e.id}>
                    {e.nombre} · {e.sets} × {e.reps}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      {plantilla.faltan?.length > 0 && (
        <p className="mt-2 text-xs text-suave">No están en el catálogo y se omiten: {plantilla.faltan.join(", ")}.</p>
      )}

      <button
        type="button"
        onClick={usar}
        disabled={usando || !plantilla.disponible}
        className="mt-4 h-11 rounded-lg border border-primario/50 text-sm font-bold text-primario transition hover:bg-primario/10 disabled:opacity-50"
      >
        {usando ? "Añadiendo..." : yaLaTienes ? "Añadir otra copia" : "Añadir a mis rutinas"}
      </button>
    </li>
  );
}

// Rutinas listas para usar. Al añadir una se copia a las tuyas y puedes editarla como cualquier otra.
export default function RutinasPorDefecto({ plantillas, rutinas, onUsar, error }) {
  if (!plantillas.length && !error) return null;
  const nombres = new Set(rutinas.map((r) => r.nombre));
  return (
    <section aria-labelledby="rutinas-por-defecto" className="mt-10">
      <h2 id="rutinas-por-defecto" className="text-lg font-bold">
        Rutinas por defecto
      </h2>
      <p className="mb-4 mt-1 text-sm text-suave">
        Programas clásicos listos para usar. Al añadir uno se copia a tus rutinas y puedes cambiar lo que quieras.
      </p>
      {error && (
        <p role="alert" className="mb-3 text-sm text-peligro">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {plantillas.map((p) => (
          <TarjetaPlantilla key={p.clave} plantilla={p} yaLaTienes={nombres.has(p.name)} onUsar={onUsar} />
        ))}
      </ul>
    </section>
  );
}

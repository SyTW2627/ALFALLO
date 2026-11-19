import { useMemo, useState } from "react";
import { formatearKg } from "../../lib/entrenamiento.js";
import { filtrar, agruparPorMes } from "../../lib/historial.js";
import { plural } from "../../lib/rutinas.js";
import TarjetaHistorial from "./TarjetaHistorial.jsx";

export default function ListaHistorial({ entrenamientos, aviso, sinConexion, pendientes, onEditar, onEliminado }) {
  const [texto, setTexto] = useState("");
  const [abierto, setAbierto] = useState(null); // id de la tarjeta desplegada

  const filtrados = useMemo(() => filtrar(entrenamientos, texto), [entrenamientos, texto]);
  const grupos = useMemo(() => agruparPorMes(filtrados), [filtrados]);
  const volumen = entrenamientos.reduce((a, w) => a + w.volumen, 0);
  const minutos = entrenamientos.reduce((a, w) => a + (w.duracionMin ?? 0), 0);

  return (
    <div>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-suave">
            <a href="/entrenamiento" className="hover:text-white">
              Entrenar
            </a>{" "}
            / Historial
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tu historial</h1>
          <p className="mt-1 text-sm text-suave">Repasa lo que has entrenado, corrige un error o elimina una sesión.</p>
        </div>
        <a
          href="/entrenamiento"
          className="inline-flex h-11 items-center rounded-lg bg-primario px-5 text-sm font-bold text-fondo shadow-lg shadow-primario/20 transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario"
        >
          Entrenar ahora
        </a>
      </header>

      {aviso && (
        <p role="status" className="mb-4 rounded-lg border border-acento/30 bg-acento/10 px-3 py-2 text-sm text-acento">
          {aviso}
        </p>
      )}

      {(sinConexion || pendientes) && (
        <p role="status" className="mb-4 rounded-lg border border-primario/30 bg-primario/10 px-3 py-2 text-sm text-primario">
          {sinConexion
            ? "Estás sin conexión: ves la última copia guardada y no podrás editar ni eliminar hasta que vuelva la red."
            : "Tienes entrenamientos guardados en este móvil que aún no se han subido. Aparecerán aquí cuando se sincronicen."}
        </p>
      )}

      {entrenamientos.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-borde bg-superficie p-8 text-center">
          <div aria-hidden="true" className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primario/10 text-primario">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
              <path d="M3 3v5h5M12 7v5l3 2" />
            </svg>
          </div>
          <p className="mt-4 text-lg font-bold">Aún no has terminado ningún entrenamiento.</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-suave">Cuando termines uno, aparecerá aquí con todas sus series.</p>
          <a
            href="/entrenamiento"
            className="mt-5 inline-flex h-12 items-center rounded-lg bg-primario px-6 text-sm font-bold text-fondo transition hover:brightness-110"
          >
            Empezar a entrenar
          </a>
        </div>
      ) : (
        <>
          <dl className="mb-6 grid grid-cols-3 gap-3">
            {[
              ["Entrenamientos", entrenamientos.length],
              ["Volumen total", formatearKg(volumen)],
              ["Tiempo", `${Math.round(minutos / 60)} h`],
            ].map(([etiqueta, valor]) => (
              <div key={etiqueta} className="rounded-2xl border border-borde bg-superficie p-4">
                <dt className="text-[10px] uppercase tracking-wider text-suave">{etiqueta}</dt>
                <dd className="mt-1 truncate text-lg font-bold tabular-nums md:text-2xl">{valor}</dd>
              </div>
            ))}
          </dl>

          <label htmlFor="buscar-historial" className="sr-only">
            Buscar en el historial
          </label>
          <input
            id="buscar-historial"
            type="search"
            placeholder="Buscar por nombre o ejercicio..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            className="mb-6 h-12 w-full rounded-lg border border-borde bg-superficie px-3 text-sm text-white outline-none transition placeholder:text-suave/60 focus:border-primario"
          />

          {grupos.length === 0 && (
            <p className="rounded-2xl border border-dashed border-borde bg-superficie p-6 text-center text-sm text-suave">
              Ningún entrenamiento coincide con «{texto.trim()}».
            </p>
          )}

          <div className="space-y-8">
            {grupos.map((g) => (
              <section key={g.clave} aria-labelledby={`mes-${g.clave}`}>
                <h2 id={`mes-${g.clave}`} className="mb-3 flex items-baseline justify-between gap-3">
                  <span className="text-lg font-bold">{g.titulo}</span>
                  <span className="text-xs text-suave">{plural(g.entrenamientos.length, "entrenamiento", "entrenamientos")}</span>
                </h2>
                <ul className="space-y-3">
                  {g.entrenamientos.map((w) => (
                    <TarjetaHistorial
                      key={w.id}
                      entrenamiento={w}
                      abierto={abierto === w.id}
                      sinConexion={sinConexion}
                      onAlternar={() => setAbierto((a) => (a === w.id ? null : w.id))}
                      onEditar={() => onEditar(w.id)}
                      onEliminado={() => onEliminado(w.id)}
                    />
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

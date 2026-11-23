import { useCallback, useEffect, useState } from "react";
import { obtenerClasificacion } from "../../lib/api.js";
import { iniciales } from "../../lib/auth.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { urlPerfil } from "../../lib/seguimiento.js";
import { formatearValorHito, formatearFechaCorta, diasRestantes, porcentaje } from "../../lib/progreso.js";

const fechaHora = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
const numero = new Intl.NumberFormat("es-ES");

const CRITERIOS = [
  { valor: "porVolumen", etiqueta: "Volumen", formato: (f) => formatearValorHito("kg", f.volumen), detalle: (f) => `${f.entrenamientos} entrenos` },
  {
    valor: "porEntrenamientos",
    etiqueta: "Entrenamientos",
    formato: (f) => `${f.entrenamientos} ${f.entrenamientos === 1 ? "entreno" : "entrenos"}`,
    detalle: (f) => `${numero.format(f.series)} series`,
  },
];

const MEDALLAS = { 1: "bg-[#f2c94c] text-fondo", 2: "bg-[#c9ced8] text-fondo", 3: "bg-[#cd8a52] text-fondo" };

function Posicion({ n }) {
  return (
    <span
      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-extrabold tabular-nums ${MEDALLAS[n] ?? "bg-elevada text-suave"}`}
      aria-label={`Posición ${n}`}
    >
      {n}
    </span>
  );
}

function Fila({ f, valor, detalle, barra }) {
  const nombre = f.esYo ? "Tú" : f.usuario.nombre;
  return (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${f.esYo ? "rounded-xl bg-primario/10" : ""}`}>
      <Posicion n={f.posicion} />
      <span aria-hidden="true" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevada text-[11px] font-bold">
        {iniciales(f.usuario.nombre)}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-sm font-semibold ${f.esYo ? "text-primario" : ""}`}>
          {f.esYo ? nombre : <a href={urlPerfil(f.usuario.id)} className="hover:text-primario">{nombre}</a>}
        </p>
        {barra !== undefined && (
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
            <div className={`h-full rounded-full ${f.completado ? "bg-acento" : "bg-primario"}`} style={{ width: `${barra}%` }} />
          </div>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-bold tabular-nums">{valor}</p>
        {detalle && <p className="text-[11px] text-suave">{detalle}</p>}
      </div>
    </li>
  );
}

function Seccion({ titulo, subtitulo, children }) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-4 sm:p-5">
      <h3 className="font-bold">{titulo}</h3>
      {subtitulo && <p className="mt-0.5 text-xs text-suave">{subtitulo}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function Clasificacion() {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [criterio, setCriterio] = useState("porVolumen");

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerClasificacion());
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido cargar la clasificación.");
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!datos) {
    return error ? (
      <p role="alert" className="text-sm text-red-300">
        {error}
      </p>
    ) : (
      <p role="status" className="text-sm text-suave">
        Cargando la clasificación...
      </p>
    );
  }

  const c = CRITERIOS.find((x) => x.valor === criterio);
  const semana = datos.semana[criterio];

  return (
    <div className="space-y-6">
      {datos.siguiendo === 0 && (
        <div className="rounded-2xl border border-primario/30 bg-primario/10 p-4 text-sm">
          <p className="font-semibold">Aún no sigues a nadie.</p>
          <p className="mt-1 text-suave">
            La clasificación compara tu semana con la de la gente que sigues.{" "}
            <a href="/descubrir" className="font-semibold text-primario hover:underline">
              Descubre a gente que entrena
            </a>
            .
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Seccion
          titulo="Esta semana"
          subtitulo={`Del ${formatearFechaCorta(datos.semana.desde)} a hoy · ${diasRestantes(datos.semana.hasta).toLowerCase()}`}
        >
          <div className="mb-3 flex gap-1 rounded-full border border-borde p-1" role="group" aria-label="Ordenar por">
            {CRITERIOS.map((x) => (
              <button
                key={x.valor}
                type="button"
                aria-pressed={criterio === x.valor}
                onClick={() => setCriterio(x.valor)}
                className={`h-8 flex-1 rounded-full text-xs font-semibold transition ${
                  criterio === x.valor ? "bg-primario/15 text-primario" : "text-suave hover:text-white"
                }`}
              >
                {x.etiqueta}
              </button>
            ))}
          </div>
          <ol className="space-y-1">
            {semana.map((f) => (
              <Fila key={f.usuario.id} f={f} valor={c.formato(f)} detalle={c.detalle(f)} />
            ))}
          </ol>
        </Seccion>

        <div className="space-y-6">
          {datos.retos.length ? (
            datos.retos.map((r) => (
              <Seccion
                key={r.id}
                titulo={r.titulo}
                subtitulo={`Reto especial · ${r.terminado ? "terminado" : diasRestantes(r.terminaEn).toLowerCase()} · objetivo ${formatearValorHito(r.unidad, r.objetivo)}`}
              >
                <ol className="space-y-1">
                  {r.ranking.map((f) => (
                    <Fila
                      key={f.usuario.id}
                      f={f}
                      valor={f.completado ? "Completado" : formatearValorHito(r.unidad, f.actual)}
                      detalle={f.completado ? fechaHora.format(new Date(f.completadoEn)) : `${Math.floor(porcentaje(f.actual, r.objetivo))} %`}
                      barra={porcentaje(f.actual, r.objetivo)}
                    />
                  ))}
                </ol>
              </Seccion>
            ))
          ) : (
            <Seccion titulo="Retos especiales">
              <p className="text-sm text-suave">
                Ahora mismo no hay ningún reto especial. Cuando lo haya, aquí verás quién de tu gente lo completa antes.
              </p>
            </Seccion>
          )}
        </div>
      </div>
    </div>
  );
}

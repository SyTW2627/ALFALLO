import { useMemo, useState } from "react";
import { etiquetaZona, formatearKg } from "../../lib/entrenamiento.js";
import { formatearFechaCorta, formatearNumero } from "../../lib/progreso.js";

const ORDENES = [
  { valor: "recientes", etiqueta: "Entrenados hace poco" },
  { valor: "peso", etiqueta: "Más peso" },
  { valor: "nombre", etiqueta: "Nombre" },
];

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Marca({ etiqueta, valor, detalle }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-suave">{etiqueta}</dt>
      <dd className="mt-1 font-bold tabular-nums">{valor}</dd>
      {detalle && <dd className="text-[11px] text-suave">{detalle}</dd>}
    </div>
  );
}

function TarjetaRecord({ r }) {
  return (
    <li className="rounded-2xl border border-borde bg-superficie p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold">{r.nombre}</p>
          <p className="text-xs text-suave">
            {etiquetaZona(r.zona)} · {r.sesiones} {r.sesiones === 1 ? "sesión" : "sesiones"} · última el {formatearFechaCorta(r.ultimaVez)}
          </p>
        </div>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        {r.pesoMaximo ? (
          <Marca
            etiqueta="Peso máximo"
            valor={formatearKg(r.pesoMaximo.kg)}
            detalle={`× ${r.pesoMaximo.reps} · ${formatearFechaCorta(r.pesoMaximo.fecha)}`}
          />
        ) : (
          <Marca etiqueta="Peso máximo" valor="Peso corporal" />
        )}
        {r.mejor1RM ? (
          <Marca
            etiqueta="1RM estimado"
            valor={formatearKg(r.mejor1RM.e1rm)}
            detalle={`${formatearKg(r.mejor1RM.kg)} × ${r.mejor1RM.reps} · ${formatearFechaCorta(r.mejor1RM.fecha)}`}
          />
        ) : (
          <Marca etiqueta="1RM estimado" valor="—" />
        )}
        {r.masReps && (
          <Marca
            etiqueta="Más repeticiones"
            valor={`${r.masReps.reps} reps`}
            detalle={`${r.masReps.kg > 0 ? `con ${formatearKg(r.masReps.kg)}` : "sin peso"} · ${formatearFechaCorta(r.masReps.fecha)}`}
          />
        )}
        {r.mejorSesion && (
          <Marca
            etiqueta="Mejor sesión"
            valor={formatearKg(r.mejorSesion.volumen)}
            detalle={`de volumen · ${formatearFechaCorta(r.mejorSesion.fecha)}`}
          />
        )}
      </dl>
    </li>
  );
}

export default function ListaRecords({ records }) {
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState("");
  const [orden, setOrden] = useState("recientes");

  const zonas = useMemo(() => [...new Set(records.map((r) => r.zona))].sort((a, b) => etiquetaZona(a).localeCompare(etiquetaZona(b))), [records]);

  const lista = useMemo(() => {
    const q = sinAcentos(busqueda.trim());
    const filtrada = records.filter((r) => (!zona || r.zona === zona) && (!q || sinAcentos(r.nombre).includes(q)));
    if (orden === "peso") return [...filtrada].sort((a, b) => (b.pesoMaximo?.kg ?? 0) - (a.pesoMaximo?.kg ?? 0));
    if (orden === "nombre") return [...filtrada].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
    return filtrada; // ya vienen de más reciente a más antiguo
  }, [records, busqueda, zona, orden]);

  if (!records.length) {
    return (
      <div className="rounded-2xl border border-dashed border-borde p-8 text-center">
        <p className="font-bold">Aún no tienes récords.</p>
        <p className="mt-1 text-sm text-suave">Termina tu primer entrenamiento y aquí verás tus mejores marcas de cada ejercicio.</p>
        <a href="/entrenamiento" className="mt-4 inline-flex h-11 items-center rounded-lg bg-primario px-5 text-sm font-bold text-fondo">
          Empezar a entrenar
        </a>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-suave">
        Tus mejores marcas en {formatearNumero(records.length)} ejercicios. Mientras entrenas, te avisamos al momento si
        superas alguna.
      </p>
      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_180px_200px]">
        <label htmlFor="rec-buscar" className="sr-only">
          Buscar ejercicio
        </label>
        <input
          id="rec-buscar"
          type="search"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar ejercicio…"
          className="h-10 rounded-lg border border-borde bg-fondo px-3 text-sm outline-none placeholder:text-suave/60 focus:border-primario"
        />
        <label htmlFor="rec-zona" className="sr-only">
          Zona muscular
        </label>
        <select
          id="rec-zona"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
          className="h-10 rounded-lg border border-borde bg-fondo px-3 text-sm outline-none focus:border-primario"
        >
          <option value="">Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z} value={z}>
              {etiquetaZona(z)}
            </option>
          ))}
        </select>
        <label htmlFor="rec-orden" className="sr-only">
          Ordenar
        </label>
        <select
          id="rec-orden"
          value={orden}
          onChange={(e) => setOrden(e.target.value)}
          className="h-10 rounded-lg border border-borde bg-fondo px-3 text-sm outline-none focus:border-primario"
        >
          {ORDENES.map((o) => (
            <option key={o.valor} value={o.valor}>
              {o.etiqueta}
            </option>
          ))}
        </select>
      </div>
      {lista.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {lista.map((r) => (
            <TarjetaRecord key={r.id} r={r} />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-suave">Ningún ejercicio coincide con la búsqueda.</p>
      )}
    </div>
  );
}

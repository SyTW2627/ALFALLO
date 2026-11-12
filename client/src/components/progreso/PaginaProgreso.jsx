import { useCallback, useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerProgreso } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import TarjetaRango from "./TarjetaRango.jsx";
import ListaHitos from "./ListaHitos.jsx";
import ListaRetos from "./ListaRetos.jsx";
import DatosCorporales from "./DatosCorporales.jsx";

const PESTANAS = [
  { valor: "rangos", etiqueta: "Rangos" },
  { valor: "hitos", etiqueta: "Hitos" },
  { valor: "retos", etiqueta: "Retos" },
];

// La pestaña se guarda en la URL (/progreso?tab=hitos) para poder enlazarla y recargar.
function leerPestana() {
  const t = new URLSearchParams(window.location.search).get("tab");
  return PESTANAS.some((p) => p.valor === t) ? t : "rangos";
}

export default function PaginaProgreso() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [datos, setDatos] = useState(null);
  const [pestana, setPestana] = useState("rangos");

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerProgreso());
      setEstado("listo");
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido cargar tu progreso.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }
    setPestana(leerPestana());
    cargar();
  }, [cargar]);

  const cambiarPestana = (valor) => {
    setPestana(valor);
    window.history.replaceState(null, "", valor === "rangos" ? "/progreso" : `/progreso?tab=${valor}`);
  };

  if (estado === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando tu progreso...
      </p>
    );
  }

  if (estado === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setEstado("cargando");
            cargar();
          }}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const { perfil, rangos, hitos, retos } = datos;
  const sinPeso = perfil.pesoCorporalKg == null;
  const conRango = rangos.filter((r) => r.actual?.rango).length;
  const contador = {
    rangos: `${conRango}/${rangos.length}`,
    hitos: `${hitos.filter((h) => h.conseguido).length}/${hitos.length}`,
    retos: `${retos.filter((r) => r.completado).length}/${retos.length}`,
  };

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs text-suave">Mi espacio / Logros</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight md:text-4xl">Tus logros</h1>
        <p className="mt-1 text-sm text-suave">Rangos de fuerza, hitos y retos de la semana.</p>
      </header>

      <div role="tablist" aria-label="Secciones" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="tab"
            id={`tab-${p.valor}`}
            aria-selected={pestana === p.valor}
            aria-controls={`panel-${p.valor}`}
            onClick={() => cambiarPestana(p.valor)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
              pestana === p.valor ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-white"
            }`}
          >
            {p.etiqueta} <span className="ml-1 text-xs opacity-70">{contador[p.valor]}</span>
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === "rangos" && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-w-0">
              <div className="grid gap-4 xl:grid-cols-2">
                {rangos.map((r) => (
                  <TarjetaRango key={r.key} rango={r} />
                ))}
              </div>
              <p className="mt-4 text-xs text-suave">
                El 1RM se estima con la fórmula de Epley a partir de tu mejor serie de 1–10 repeticiones de los últimos
                90 días. Las tablas son orientativas.
              </p>
            </div>
            {/* Sin peso, en móvil el formulario va arriba del todo. */}
            <aside className={`space-y-4 lg:sticky lg:top-6 lg:self-start ${sinPeso ? "order-first lg:order-none" : ""}`}>
              <DatosCorporales perfil={perfil} destacado={sinPeso} onGuardado={cargar} />
            </aside>
          </div>
        )}

        {pestana === "hitos" && <ListaHitos hitos={hitos} />}
        {pestana === "retos" && <ListaRetos retos={retos} />}
      </div>
    </div>
  );
}
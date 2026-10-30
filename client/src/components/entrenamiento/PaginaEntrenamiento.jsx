import { useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import {
  obtenerEntrenamientoActivo,
  obtenerRutinas,
  obtenerHistorial,
  obtenerEjercicios,
} from "../../lib/api.js";
import {
  normalizarEntrenamiento,
  normalizarEjercicio,
  diasDeRutinas,
  resumenHistorial,
  conPlan,
  salirSiSesionCaducada,
} from "../../lib/entrenamiento.js";
import ElegirEntrenamiento from "./ElegirEntrenamiento.jsx";
import SesionActiva from "./SesionActiva.jsx";
import ResumenEntrenamiento from "./ResumenEntrenamiento.jsx";

/*
 * Pantallas:
 *  - cargando
 *  - elegir   → no hay entrenamiento en curso: rutinas o entrenamiento libre
 *  - activo   → registrando series
 *  - resumen  → entrenamiento recién terminado
 */
export default function PaginaEntrenamiento() {
  const [pantalla, setPantalla] = useState("cargando");
  const [error, setError] = useState("");
  const [entrenamiento, setEntrenamiento] = useState(null);
  const [terminado, setTerminado] = useState(null);
  const [dias, setDias] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [historial, setHistorial] = useState({ ultima: {}, maximo: {} });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }

    let cancelado = false;
    setPantalla("cargando");
    setError("");

    (async () => {
      const [activo, rutinas, hist, ejercicios] = await Promise.allSettled([
        obtenerEntrenamientoActivo(),
        obtenerRutinas(),
        obtenerHistorial(),
        obtenerEjercicios(),
      ]);
      if (cancelado) return;

      const fallo = [activo, rutinas, hist, ejercicios].find((r) => r.status === "rejected");
      if (fallo && salirSiSesionCaducada(fallo.reason)) return;

      // Sin saber si hay un entrenamiento en curso no podemos mostrar nada fiable.
      if (activo.status === "rejected") {
        setError(activo.reason?.message || "No se ha podido cargar tu entrenamiento.");
        setPantalla("error");
        return;
      }

      if (rutinas.status === "fulfilled") setDias(diasDeRutinas(rutinas.value));
      if (hist.status === "fulfilled") setHistorial(resumenHistorial(hist.value));
      if (ejercicios.status === "fulfilled") setCatalogo(ejercicios.value.map(normalizarEjercicio));

      const actual = conPlan(normalizarEntrenamiento(activo.value));
      setEntrenamiento(actual);
      setPantalla(actual ? "activo" : "elegir");
    })();

    return () => {
      cancelado = true;
    };
  }, [intento]);

  if (pantalla === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando entrenamiento...
      </p>
    );
  }

  if (pantalla === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-red-300">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (pantalla === "activo" && entrenamiento) {
    return (
      <SesionActiva
        inicial={entrenamiento}
        catalogo={catalogo}
        historial={historial}
        onTerminado={(w) => {
          setTerminado(w);
          setEntrenamiento(null);
          setPantalla("resumen");
        }}
        onDescartado={() => {
          setEntrenamiento(null);
          setPantalla("elegir");
        }}
      />
    );
  }

  if (pantalla === "resumen" && terminado) {
    return (
      <ResumenEntrenamiento
        entrenamiento={terminado}
        maximo={historial.maximo}
        onOtro={() => setIntento((n) => n + 1)}
      />
    );
  }

  return (
    <ElegirEntrenamiento
      dias={dias}
      onEmpezado={(w) => {
        setEntrenamiento(w);
        setPantalla("activo");
      }}
    />
  );
}
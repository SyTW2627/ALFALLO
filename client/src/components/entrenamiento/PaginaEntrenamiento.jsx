import { useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import {
  esErrorDeRed,
  obtenerEntrenamientoActivo,
  obtenerRutinas,
  obtenerHistorial,
  obtenerEjercicios,
} from "../../lib/api.js";
import { entrenoActual, hayPendientes, adoptarDelServidor, sincronizar } from "../../lib/sinConexion.js";
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
import Esqueleto from "../Esqueleto.jsx";
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
  const [historial, setHistorial] = useState({ ultima: {}, maximo: {}, mejor1rm: {} });
  const [intento, setIntento] = useState(0);
  const [sinConexion, setSinConexion] = useState(false);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }

    let cancelado = false;
    setPantalla("cargando");
    setError("");

    // 1. Si hay un entrenamiento guardado en el móvil, se muestra al instante (aunque no haya red).
    const local = entrenoActual();
    if (local) {
      setEntrenamiento(local);
      setPantalla("activo");
    }

    (async () => {
      // Rutinas, historial y catálogo: si no hay conexión, se usa la última copia guardada.
      const [rutinas, hist, ejercicios] = await Promise.allSettled([
        obtenerRutinas(),
        obtenerHistorial(),
        obtenerEjercicios(),
      ]);
      if (cancelado) return;

      const fallo = [rutinas, hist, ejercicios].find((r) => r.status === "rejected");
      if (fallo && salirSiSesionCaducada(fallo.reason)) return;

      if (rutinas.status === "fulfilled") setDias(diasDeRutinas(rutinas.value));
      if (hist.status === "fulfilled") setHistorial(resumenHistorial(hist.value));
      if (ejercicios.status === "fulfilled") setCatalogo(ejercicios.value.map(normalizarEjercicio));
      if (local) return;

      // 2. Antes de preguntar al servidor, se suben los entrenamientos terminados sin conexión
      //    (si no, el servidor seguiría teniendo el último "en curso").
      if (hayPendientes()) await sincronizar();
      if (cancelado) return;
      if (hayPendientes()) {
        setSinConexion(true);
        setPantalla("elegir");
        return;
      }

      // 3. ¿Hay uno en curso en el servidor (p. ej. empezado en otro dispositivo)?
      try {
        const activo = conPlan(normalizarEntrenamiento(await obtenerEntrenamientoActivo()));
        if (cancelado) return;
        if (activo) {
          setEntrenamiento(adoptarDelServidor(activo));
          setPantalla("activo");
        } else {
          setPantalla("elegir");
        }
      } catch (err) {
        if (cancelado || salirSiSesionCaducada(err)) return;
        if (esErrorDeRed(err)) {
          // Sin conexión se puede empezar igualmente: se subirá al volver la red.
          setSinConexion(true);
          setPantalla("elegir");
          return;
        }
        setError(err.message || "No se ha podido cargar tu entrenamiento.");
        setPantalla("error");
      }
    })();

    return () => {
      cancelado = true;
    };
  }, [intento]);

  if (pantalla === "cargando") {
    return <Esqueleto variante="entrenamiento" />;
  }

  if (pantalla === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
        <button
          type="button"
          onClick={() => setIntento((n) => n + 1)}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-tinta transition hover:brightness-110"
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
      sinConexion={sinConexion}
      onEmpezado={(w) => {
        setEntrenamiento(w);
        setPantalla("activo");
      }}
    />
  );
}
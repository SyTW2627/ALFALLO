import { useCallback, useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerHistorial, obtenerEjercicios, esErrorDeRed } from "../../lib/api.js";
import { normalizarEjercicio, salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { prepararLista } from "../../lib/historial.js";
import { hayPendientes } from "../../lib/sinConexion.js";
import ListaHistorial from "./ListaHistorial.jsx";
import EditorEntrenamiento from "./EditorEntrenamiento.jsx";
import Esqueleto from "../Esqueleto.jsx";

/*
 * La vista se refleja en la URL para que recargar o usar "atrás" funcione:
 *   /historial              → lista
 *   /historial?editar=<id>  → editor de un entrenamiento
 */
function leerVista() {
  const p = new URLSearchParams(window.location.search);
  return p.has("editar") ? { modo: "editar", id: p.get("editar") } : { modo: "lista" };
}

function irA(vista, { reemplazar = false } = {}) {
  const url = vista.modo === "editar" ? `/historial?editar=${encodeURIComponent(vista.id)}` : "/historial";
  window.history[reemplazar ? "replaceState" : "pushState"](null, "", url);
}

export default function PaginaHistorial() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [lista, setLista] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [vista, setVista] = useState({ modo: "lista" });
  const [aviso, setAviso] = useState("");
  const [sinConexion, setSinConexion] = useState(false);
  const [intento, setIntento] = useState(0);

  const abrir = useCallback((v, entrenos) => {
    if (v.modo === "editar" && !entrenos.some((w) => w.id === v.id)) {
      irA({ modo: "lista" }, { reemplazar: true });
      setVista({ modo: "lista" });
      setAviso("No se ha encontrado ese entrenamiento.");
      return;
    }
    setVista(v);
    window.scrollTo({ top: 0 });
  }, []);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }
    let cancelado = false;
    setEstado("cargando");
    (async () => {
      const [hist, ej] = await Promise.allSettled([obtenerHistorial(), obtenerEjercicios()]);
      if (cancelado) return;
      const fallo = [hist, ej].find((x) => x.status === "rejected");
      if (fallo && salirSiSesionCaducada(fallo.reason)) return;
      if (hist.status === "rejected") {
        setError(
          esErrorDeRed(hist.reason)
            ? "Estás sin conexión y aún no hay una copia de tu historial en este dispositivo."
            : hist.reason?.message || "No se ha podido cargar tu historial."
        );
        setEstado("error");
        return;
      }
      const entrenos = prepararLista(hist.value);
      setLista(entrenos);
      if (ej.status === "fulfilled") setCatalogo(ej.value.map(normalizarEjercicio));
      setSinConexion(!navigator.onLine);
      abrir(leerVista(), entrenos);
      setEstado("listo");
    })();
    return () => {
      cancelado = true;
    };
  }, [intento, abrir]);

  // Botones atrás/adelante del navegador.
  useEffect(() => {
    const alVolver = () => abrir(leerVista(), lista);
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [abrir, lista]);

  const navegar = (v) => {
    setAviso("");
    irA(v);
    abrir(v, lista);
  };

  if (estado === "cargando") return <Esqueleto variante="pagina" />;

  if (estado === "error") {
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

  const editando = vista.modo === "editar" ? lista.find((w) => w.id === vista.id) : null;
  if (editando) {
    return (
      <EditorEntrenamiento
        key={editando.id}
        entrenamiento={editando}
        catalogo={catalogo}
        onSalir={() => navegar({ modo: "lista" })}
        onGuardado={(guardado) => {
          const nueva = lista.map((w) => (w.id === guardado.id ? guardado : w)).sort((a, b) => b.fecha - a.fecha);
          setLista(nueva);
          irA({ modo: "lista" });
          abrir({ modo: "lista" }, nueva);
          setAviso(`Cambios en «${guardado.titulo}» guardados.`);
        }}
      />
    );
  }

  return (
    <ListaHistorial
      entrenamientos={lista}
      aviso={aviso}
      sinConexion={sinConexion}
      pendientes={hayPendientes()}
      onEditar={(id) => navegar({ modo: "editar", id })}
      onEliminado={(id) => {
        const w = lista.find((x) => x.id === id);
        setLista((l) => l.filter((x) => x.id !== id));
        setAviso(w ? `Entrenamiento «${w.titulo}» eliminado.` : "");
      }}
    />
  );
}

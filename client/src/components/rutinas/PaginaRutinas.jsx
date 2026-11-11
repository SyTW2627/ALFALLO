import { useCallback, useEffect, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerRutinas, obtenerRutina, obtenerEjercicios } from "../../lib/api.js";
import { normalizarEjercicio, salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { normalizarRutina, nuevaRutinaVacia } from "../../lib/rutinas.js";
import ListaRutinas from "./ListaRutinas.jsx";
import EditorRutina from "./EditorRutina.jsx";

/*
 * La vista se refleja en la URL para que recargar o usar "atrás" funcione:
 *   /rutinas              → lista
 *   /rutinas?nueva        → editor de una rutina nueva
 *   /rutinas?editar=<id>  → editor de una rutina existente
 */
function leerVista() {
  const p = new URLSearchParams(window.location.search);
  if (p.has("editar")) return { modo: "editar", id: p.get("editar") };
  if (p.has("nueva")) return { modo: "nueva" };
  return { modo: "lista" };
}

function irA(vista, { reemplazar = false } = {}) {
  const url =
    vista.modo === "editar"
      ? `/rutinas?editar=${encodeURIComponent(vista.id)}`
      : vista.modo === "nueva"
        ? "/rutinas?nueva"
        : "/rutinas";
  window.history[reemplazar ? "replaceState" : "pushState"](null, "", url);
}

export default function PaginaRutinas() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [rutinas, setRutinas] = useState([]);
  const [catalogo, setCatalogo] = useState([]);
  const [vista, setVista] = useState({ modo: "lista" });
  const [editando, setEditando] = useState(null); // rutina abierta en el editor
  const [aviso, setAviso] = useState("");
  const [intento, setIntento] = useState(0);

  // Abre la vista pedida; si es una rutina que no está en la lista, la pide a la API.
  const abrir = useCallback(async (v, lista) => {
    setAviso("");
    if (v.modo === "nueva") {
      setEditando(nuevaRutinaVacia());
    } else if (v.modo === "editar") {
      let rutina = lista.find((r) => r.id === v.id);
      if (!rutina) {
        try {
          rutina = normalizarRutina(await obtenerRutina(v.id));
        } catch (err) {
          if (salirSiSesionCaducada(err)) return;
          irA({ modo: "lista" }, { reemplazar: true });
          setEditando(null);
          setVista({ modo: "lista" });
          setAviso("No se ha encontrado esa rutina.");
          return;
        }
      }
      setEditando(structuredClone(rutina));
    } else {
      setEditando(null);
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
      const [rs, ej] = await Promise.allSettled([obtenerRutinas(), obtenerEjercicios()]);
      if (cancelado) return;
      const fallo = [rs, ej].find((x) => x.status === "rejected");
      if (fallo && salirSiSesionCaducada(fallo.reason)) return;
      if (rs.status === "rejected") {
        setError(rs.reason?.message || "No se han podido cargar tus rutinas.");
        setEstado("error");
        return;
      }
      const lista = rs.value.map(normalizarRutina);
      setRutinas(lista);
      if (ej.status === "fulfilled") setCatalogo(ej.value.map(normalizarEjercicio));
      await abrir(leerVista(), lista);
      setEstado("listo");
    })();
    return () => {
      cancelado = true;
    };
  }, [intento, abrir]);

  // Botones atrás/adelante del navegador.
  useEffect(() => {
    const alVolver = () => abrir(leerVista(), rutinas);
    window.addEventListener("popstate", alVolver);
    return () => window.removeEventListener("popstate", alVolver);
  }, [abrir, rutinas]);

  const navegar = (v) => {
    irA(v);
    abrir(v, rutinas);
  };

  if (estado === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando rutinas...
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
          onClick={() => setIntento((n) => n + 1)}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-fondo transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (vista.modo !== "lista" && editando) {
    return (
      <EditorRutina
        key={editando.id ?? "nueva"}
        inicial={editando}
        catalogo={catalogo}
        onSalir={() => navegar({ modo: "lista" })}
        onGuardada={(guardada, esNueva) => {
          const lista = esNueva ? [guardada, ...rutinas] : rutinas.map((r) => (r.id === guardada.id ? guardada : r));
          setRutinas(lista);
          irA({ modo: "lista" });
          abrir({ modo: "lista" }, lista).then(() =>
            setAviso(esNueva ? `Rutina «${guardada.nombre}» creada.` : `Cambios en «${guardada.nombre}» guardados.`)
          );
        }}
      />
    );
  }

  return (
    <ListaRutinas
      rutinas={rutinas}
      aviso={aviso}
      onNueva={() => navegar({ modo: "nueva" })}
      onEditar={(id) => navegar({ modo: "editar", id })}
      onEliminada={(id) => {
        const r = rutinas.find((x) => x.id === id);
        setRutinas((lista) => lista.filter((x) => x.id !== id));
        setAviso(r ? `Rutina «${r.nombre}» eliminada.` : "");
      }}
    />
  );
}
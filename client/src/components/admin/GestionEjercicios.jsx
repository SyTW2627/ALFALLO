import { useCallback, useEffect, useMemo, useState } from "react";
import { listarAdmin, crearEjercicio, editarEjercicio, eliminarEjercicio, ApiError } from "../../lib/api.js";
import {
  Texto,
  AreaTexto,
  Selector,
  BotonPrimario,
  BotonSecundario,
  Mensaje,
  Etiquetita,
  mensajeDeError,
} from "./controles.jsx";

const DIFICULTADES = [
  { valor: 1, label: "1 · Muy fácil" },
  { valor: 2, label: "2 · Fácil" },
  { valor: 3, label: "3 · Media" },
  { valor: 4, label: "4 · Difícil" },
  { valor: 5, label: "5 · Muy difícil" },
];

const vacio = (opciones) => ({
  name: "",
  description: "",
  bodyPart: opciones.zonas[0]?.valor ?? "",
  difficulty: 2,
  rankingKey: "",
});

function FormularioEjercicio({ opciones, inicial, onGuardado, onCancelar, alPerderAdmin }) {
  const editando = Boolean(inicial?._id);
  const [form, setForm] = useState(() =>
    inicial ? { ...vacio(opciones), ...inicial, rankingKey: inicial.rankingKey ?? "" } : vacio(opciones)
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const cambiar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  async function enviar(e) {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.description.trim()) return setError("El nombre y la descripción son obligatorios.");

    const datos = {
      name: form.name.trim(),
      description: form.description.trim(),
      bodyPart: form.bodyPart,
      difficulty: Number(form.difficulty),
      rankingKey: form.rankingKey || null,
    };
    setGuardando(true);
    try {
      if (editando) await editarEjercicio(inicial._id, datos);
      else await crearEjercicio(datos);
      onGuardado(editando ? "Ejercicio actualizado." : "Ejercicio añadido al catálogo.");
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borde bg-superficie p-5">
      <h3 className="font-bold">{editando ? "Editar ejercicio" : "Nuevo ejercicio"}</h3>
      <Texto id="ej-nombre" label="Nombre" value={form.name} onChange={cambiar("name")} placeholder="Press de banca" required />
      <AreaTexto
        id="ej-descripcion"
        label="Descripción"
        value={form.description}
        onChange={cambiar("description")}
        placeholder="Cómo se hace, en una o dos frases"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector id="ej-zona" label="Zona muscular" value={form.bodyPart} onChange={cambiar("bodyPart")}>
          {opciones.zonas.map((z) => (
            <option key={z.valor} value={z.valor}>
              {z.label}
            </option>
          ))}
        </Selector>
        <Selector id="ej-dificultad" label="Dificultad" value={form.difficulty} onChange={cambiar("difficulty")}>
          {DIFICULTADES.map((d) => (
            <option key={d.valor} value={d.valor}>
              {d.label}
            </option>
          ))}
        </Selector>
      </div>
      <Selector
        id="ej-ranking"
        label="Cuenta para el rango de"
        ayuda="opcional"
        value={form.rankingKey}
        onChange={cambiar("rankingKey")}
      >
        <option value="">Ninguno</option>
        {opciones.levantamientos.map((l) => (
          <option key={l.key} value={l.key}>
            {l.label}
          </option>
        ))}
      </Selector>
      <p className="text-xs text-suave">
        Si eliges un levantamiento, las series de este ejercicio cuentan para calcular el rango de fuerza de ese levantamiento.
      </p>
      <Mensaje>{error}</Mensaje>
      <div className="flex gap-2">
        <BotonPrimario type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Añadir ejercicio"}
        </BotonPrimario>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="h-11 rounded-lg px-4 text-sm font-semibold text-suave hover:text-white">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

const sinAcentos = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export default function GestionEjercicios({ opciones, alPerderAdmin }) {
  const [ejercicios, setEjercicios] = useState(null);
  const [editando, setEditando] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [busqueda, setBusqueda] = useState("");
  const [zona, setZona] = useState("");
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setEjercicios(await listarAdmin("exercises"));
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }, [alPerderAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const alGuardar = (texto) => {
    setAviso(texto);
    setEditando(null);
    setFormKey((k) => k + 1);
    cargar();
  };

  async function eliminar(e) {
    if (!window.confirm(`¿Eliminar "${e.name}" del catálogo?`)) return;
    setError("");
    try {
      await eliminarEjercicio(e._id);
      setAviso("Ejercicio eliminado.");
      cargar();
    } catch (err) {
      // 409: se usa en entrenamientos o rutinas (el mensaje de la API lo explica).
      setError(err instanceof ApiError && err.status === 409 ? err.message : mensajeDeError(err, alPerderAdmin));
    }
  }

  const nombreZona = (v) => opciones.zonas.find((z) => z.valor === v)?.label ?? v;
  const nombreLevantamiento = (k) => opciones.levantamientos.find((l) => l.key === k)?.label ?? k;

  const filtrados = useMemo(() => {
    if (!ejercicios) return null;
    const q = sinAcentos(busqueda.trim());
    return ejercicios.filter((e) => (!zona || e.bodyPart === zona) && (!q || sinAcentos(e.name).includes(q)));
  }, [ejercicios, busqueda, zona]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {editando ? (
          <FormularioEjercicio
            key={editando._id}
            opciones={opciones}
            inicial={editando}
            onGuardado={alGuardar}
            onCancelar={() => setEditando(null)}
            alPerderAdmin={alPerderAdmin}
          />
        ) : (
          <FormularioEjercicio key={formKey} opciones={opciones} onGuardado={alGuardar} alPerderAdmin={alPerderAdmin} />
        )}
        <Mensaje tipo="ok">{aviso}</Mensaje>
      </div>

      <section aria-labelledby="lista-ejercicios">
        <h3 id="lista-ejercicios" className="mb-3 text-sm font-bold text-suave">
          Catálogo {ejercicios ? `· ${filtrados.length} de ${ejercicios.length}` : ""}
        </h3>
        <div className="mb-3 grid gap-2 sm:grid-cols-[1fr_180px]">
          <label htmlFor="ej-buscar" className="sr-only">
            Buscar ejercicio
          </label>
          <input
            id="ej-buscar"
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre…"
            className="h-10 rounded-lg border border-borde bg-fondo px-3 text-sm outline-none placeholder:text-suave/60 focus:border-primario"
          />
          <label htmlFor="ej-filtro-zona" className="sr-only">
            Filtrar por zona
          </label>
          <select
            id="ej-filtro-zona"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
            className="h-10 rounded-lg border border-borde bg-fondo px-3 text-sm outline-none focus:border-primario"
          >
            <option value="">Todas las zonas</option>
            {opciones.zonas.map((z) => (
              <option key={z.valor} value={z.valor}>
                {z.label}
              </option>
            ))}
          </select>
        </div>
        <Mensaje>{error}</Mensaje>
        {!filtrados ? (
          <p className="text-sm text-suave">Cargando...</p>
        ) : !filtrados.length ? (
          <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
            {ejercicios.length ? "Ningún ejercicio coincide con la búsqueda." : "El catálogo está vacío."}
          </p>
        ) : (
          <ul className="space-y-2">
            {filtrados.map((e) => {
              const usado = e.uso.entrenamientos + e.uso.rutinas > 0;
              return (
                <li key={e._id} className="rounded-2xl border border-borde bg-superficie p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{e.name}</p>
                    <Etiquetita>{nombreZona(e.bodyPart)}</Etiquetita>
                    {e.rankingKey && <Etiquetita color="primario">Rango: {nombreLevantamiento(e.rankingKey)}</Etiquetita>}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-suave">{e.description}</p>
                  <p className="mt-2 text-xs text-suave">
                    Dificultad {e.difficulty}/5 · Usado en {e.uso.entrenamientos}{" "}
                    {e.uso.entrenamientos === 1 ? "entrenamiento" : "entrenamientos"} y {e.uso.rutinas}{" "}
                    {e.uso.rutinas === 1 ? "rutina" : "rutinas"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <BotonSecundario onClick={() => { setAviso(""); setEditando(e); }}>Editar</BotonSecundario>
                    <BotonSecundario
                      peligro
                      onClick={() => eliminar(e)}
                      disabled={usado}
                      title={usado ? "No se puede borrar porque ya se usa" : undefined}
                    >
                      Eliminar
                    </BotonSecundario>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

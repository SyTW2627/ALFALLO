import { useCallback, useEffect, useState } from "react";
import { listarAdmin, crearAdmin, editarAdmin, eliminarAdmin } from "../../lib/api.js";
import { formatearValorHito, formatearFechaLarga } from "../../lib/progreso.js";
import {
  Texto,
  AreaTexto,
  Selector,
  Casilla,
  BotonPrimario,
  BotonSecundario,
  Mensaje,
  Etiquetita,
  mensajeDeError,
  aFechaInput,
  inicioDelDia,
  finDelDia,
  ultimoDia,
  sumarDias,
} from "./controles.jsx";

const ESTADOS = {
  "en-curso": { texto: "En curso", color: "acento" },
  programado: { texto: "Programado", color: "primario" },
  terminado: { texto: "Terminado", color: "suave" },
  desactivado: { texto: "Oculto", color: "rojo" },
};

const AYUDA_OBJETIVO = { "": "entrenamientos", series: "series", kg: "kg", min: "minutos" };

const nuevoVacio = () => ({
  titulo: "",
  descripcion: "",
  metrica: "entrenos",
  zonas: [],
  objetivo: "",
  inicio: aFechaInput(new Date()),
  fin: aFechaInput(sumarDias(new Date(), 6)),
  activo: true,
  notificar: true,
});

function FormularioReto({ opciones, inicial, onGuardado, onCancelar, alPerderAdmin }) {
  const editando = Boolean(inicial?._id);
  const [form, setForm] = useState(() =>
    inicial
      ? {
          ...nuevoVacio(),
          ...inicial,
          inicio: aFechaInput(inicial.inicio),
          fin: aFechaInput(ultimoDia(inicial.fin)),
          notificar: false,
        }
      : nuevoVacio()
  );
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const unidad = opciones.metricasReto.find((m) => m.key === form.metrica)?.unidad ?? "";
  const cambiar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const alternarZona = (zona) =>
    setForm((f) => ({ ...f, zonas: f.zonas.includes(zona) ? f.zonas.filter((z) => z !== zona) : [...f.zonas, zona] }));

  async function enviar(e) {
    e.preventDefault();
    setError("");
    const objetivo = Number(String(form.objetivo).replace(",", "."));
    if (!form.titulo.trim()) return setError("El título es obligatorio.");
    if (!(objetivo >= 1)) return setError("El objetivo debe ser al menos 1.");
    if (form.metrica === "series" && !form.zonas.length) return setError("Elige al menos una zona muscular.");
    if (!form.inicio || !form.fin || form.fin < form.inicio) return setError("La fecha de fin no puede ser anterior a la de inicio.");

    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      metrica: form.metrica,
      zonas: form.metrica === "series" ? form.zonas : [],
      objetivo,
      inicio: inicioDelDia(form.inicio),
      fin: finDelDia(form.fin),
      activo: form.activo,
      ...(editando ? {} : { notificar: form.notificar }),
    };
    setGuardando(true);
    try {
      if (editando) await editarAdmin("challenges", inicial._id, datos);
      else await crearAdmin("challenges", datos);
      onGuardado(editando ? "Reto actualizado." : "Reto creado.");
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setGuardando(false);
    }
  }

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borde bg-superficie p-5">
      <h3 className="font-bold">{editando ? "Editar reto" : "Nuevo reto especial"}</h3>
      <Texto id="reto-titulo" label="Título" value={form.titulo} onChange={cambiar("titulo")} maxLength={80} placeholder="Diciembre de pierna" required />
      <AreaTexto
        id="reto-descripcion"
        label="Descripción"
        ayuda="opcional"
        value={form.descripcion}
        onChange={cambiar("descripcion")}
        maxLength={200}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector id="reto-metrica" label="Qué se cuenta" value={form.metrica} onChange={cambiar("metrica")}>
          {opciones.metricasReto.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </Selector>
        <Texto
          id="reto-objetivo"
          label="Objetivo"
          ayuda={AYUDA_OBJETIVO[unidad]}
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={form.objetivo}
          onChange={cambiar("objetivo")}
          required
        />
      </div>

      {form.metrica === "series" && (
        <fieldset>
          <legend className="text-xs font-medium text-suave">Zonas musculares que cuentan</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {opciones.zonas.map((z) => {
              const marcada = form.zonas.includes(z.valor);
              return (
                <button
                  key={z.valor}
                  type="button"
                  aria-pressed={marcada}
                  onClick={() => alternarZona(z.valor)}
                  className={`h-9 rounded-full border px-3 text-xs font-semibold transition ${
                    marcada ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-white"
                  }`}
                >
                  {z.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Texto id="reto-inicio" label="Empieza el" type="date" value={form.inicio} onChange={cambiar("inicio")} required />
        <Texto id="reto-fin" label="Termina el" ayuda="incluido" type="date" min={form.inicio} value={form.fin} onChange={cambiar("fin")} required />
      </div>
      <p className="text-xs text-suave">Solo cuentan los entrenamientos terminados entre esas fechas. Los usuarios verán el reto mientras esté en curso.</p>

      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Casilla id="reto-activo" label="Visible para los usuarios" checked={form.activo} onChange={cambiar("activo")} />
        {!editando && (
          <Casilla
            id="reto-notificar"
            label={
              form.inicio > aFechaInput(new Date())
                ? "Avisar a todos con una notificación el día que empiece"
                : "Avisar a todos con una notificación"
            }
            checked={form.notificar}
            onChange={cambiar("notificar")}
          />
        )}
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="flex gap-2">
        <BotonPrimario type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear reto"}
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

export default function GestionRetos({ opciones, alPerderAdmin }) {
  const [retos, setRetos] = useState(null);
  const [editando, setEditando] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setRetos(await listarAdmin("challenges"));
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

  async function alternarActivo(r) {
    setError("");
    try {
      await editarAdmin("challenges", r._id, { activo: !r.activo });
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }

  async function eliminar(r) {
    if (!window.confirm(`¿Eliminar el reto "${r.titulo}"?`)) return;
    setError("");
    try {
      await eliminarAdmin("challenges", r._id);
      setAviso("Reto eliminado.");
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }

  const metrica = (key) => opciones.metricasReto.find((m) => m.key === key);
  const zona = (valor) => opciones.zonas.find((z) => z.valor === valor)?.label ?? valor;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {editando ? (
          <FormularioReto
            key={editando._id}
            opciones={opciones}
            inicial={editando}
            onGuardado={alGuardar}
            onCancelar={() => setEditando(null)}
            alPerderAdmin={alPerderAdmin}
          />
        ) : (
          <FormularioReto key={formKey} opciones={opciones} onGuardado={alGuardar} alPerderAdmin={alPerderAdmin} />
        )}
        <Mensaje tipo="ok">{aviso}</Mensaje>
      </div>

      <section aria-labelledby="lista-retos">
        <h3 id="lista-retos" className="mb-3 text-sm font-bold text-suave">
          Retos especiales {retos ? `· ${retos.length}` : ""}
        </h3>
        <Mensaje>{error}</Mensaje>
        {!retos ? (
          <p className="text-sm text-suave">Cargando...</p>
        ) : !retos.length ? (
          <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
            Aún no hay retos especiales. Los retos en curso aparecen en Logros → Retos, encima de los semanales.
          </p>
        ) : (
          <ul className="space-y-3">
            {retos.map((r) => {
              const m = metrica(r.metrica);
              const estado = ESTADOS[r.estado] ?? ESTADOS.terminado;
              return (
                <li key={r._id} className="rounded-2xl border border-borde bg-superficie p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{r.titulo}</p>
                    <Etiquetita color={estado.color}>{estado.texto}</Etiquetita>
                  </div>
                  {r.descripcion && <p className="mt-1 text-sm text-suave">{r.descripcion}</p>}
                  <p className="mt-2 text-xs text-suave">
                    {m?.label ?? r.metrica}: <strong className="text-white">{formatearValorHito(m?.unidad ?? "", r.objetivo)}</strong>
                    {r.metrica === "series" && r.zonas?.length ? ` (${r.zonas.map(zona).join(", ")})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-suave">
                    Del {formatearFechaLarga(r.inicio)} al {formatearFechaLarga(ultimoDia(r.fin))}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <BotonSecundario onClick={() => { setAviso(""); setEditando(r); }}>Editar</BotonSecundario>
                    <BotonSecundario onClick={() => alternarActivo(r)}>{r.activo ? "Ocultar" : "Mostrar"}</BotonSecundario>
                    <BotonSecundario peligro onClick={() => eliminar(r)}>Eliminar</BotonSecundario>
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

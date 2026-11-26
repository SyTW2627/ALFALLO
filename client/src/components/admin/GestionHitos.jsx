import { useCallback, useEffect, useState } from "react";
import { listarAdmin, crearAdmin, editarAdmin, eliminarAdmin } from "../../lib/api.js";
import { formatearValorHito } from "../../lib/progreso.js";
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
} from "./controles.jsx";

const VACIO = {
  titulo: "",
  descripcion: "",
  categoria: "especial",
  metrica: "entrenos",
  objetivo: "",
  activo: true,
  notificar: true,
};

// Cómo se pide el objetivo según la unidad de la métrica.
const OBJETIVO = {
  "": { ayuda: "número", step: 1, min: 1 },
  semanas: { ayuda: "semanas", step: 1, min: 1 },
  kg: { ayuda: "kg", step: 0.5, min: 0.5 },
  x: { ayuda: "veces tu peso corporal, p. ej. 1,5", step: 0.05, min: 0.05 },
};

function FormularioHito({ opciones, inicial, onGuardado, onCancelar, alPerderAdmin }) {
  const editando = Boolean(inicial?._id);
  const [form, setForm] = useState(() => (inicial ? { ...VACIO, ...inicial, notificar: false } : VACIO));
  const [error, setError] = useState("");
  const [guardando, setGuardando] = useState(false);

  const metrica = opciones.metricasHito.find((m) => m.key === form.metrica);
  const unidad = metrica?.unidad ?? "";
  const cambiar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  // Al cambiar a una métrica de rango, el objetivo pasa a ser un rango (por defecto Oro).
  const cambiarMetrica = (e) => {
    const nueva = opciones.metricasHito.find((m) => m.key === e.target.value);
    setForm((f) => ({ ...f, metrica: e.target.value, objetivo: nueva?.unidad === "rango" ? "4" : "" }));
  };

  async function enviar(e) {
    e.preventDefault();
    setError("");
    const objetivo = Number(String(form.objetivo).replace(",", "."));
    if (!form.titulo.trim() || !form.descripcion.trim()) return setError("El título y la descripción son obligatorios.");
    if (!(objetivo > 0)) return setError("El objetivo debe ser un número mayor que 0.");

    const datos = {
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim(),
      categoria: form.categoria,
      metrica: form.metrica,
      objetivo,
      activo: form.activo,
      ...(editando ? {} : { notificar: form.notificar }),
    };
    setGuardando(true);
    try {
      if (editando) await editarAdmin("achievements", inicial._id, datos);
      else await crearAdmin("achievements", datos);
      onGuardado(editando ? "Hito actualizado." : "Hito creado. Ya lo ven todos los usuarios.");
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setGuardando(false);
    }
  }

  const generales = opciones.metricasHito.filter((m) => !/^(kg|ratio|rango)-/.test(m.key));
  const porLevantamiento = opciones.metricasHito.filter((m) => /^(kg|ratio|rango)-/.test(m.key));

  return (
    <form onSubmit={enviar} className="space-y-4 rounded-2xl border border-borde bg-superficie p-5">
      <h3 className="font-bold">{editando ? "Editar hito" : "Nuevo hito"}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Texto id="hito-titulo" label="Título" value={form.titulo} onChange={cambiar("titulo")} maxLength={60} required />
        <Selector id="hito-categoria" label="Categoría" value={form.categoria} onChange={cambiar("categoria")}>
          {opciones.categorias.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </Selector>
      </div>
      <AreaTexto
        id="hito-descripcion"
        label="Descripción"
        value={form.descripcion}
        onChange={cambiar("descripcion")}
        maxLength={200}
        placeholder="Qué tiene que hacer el usuario para conseguirlo"
        required
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Selector id="hito-metrica" label="Qué se mide" value={form.metrica} onChange={cambiarMetrica}>
          <optgroup label="General">
            {generales.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </optgroup>
          <optgroup label="Por levantamiento">
            {porLevantamiento.map((m) => (
              <option key={m.key} value={m.key}>
                {m.label}
              </option>
            ))}
          </optgroup>
        </Selector>
        {unidad === "rango" ? (
          <Selector id="hito-objetivo" label="Rango que hay que alcanzar" value={form.objetivo} onChange={cambiar("objetivo")}>
            {opciones.rangos.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.label}
              </option>
            ))}
          </Selector>
        ) : (
          <Texto
            id="hito-objetivo"
            label="Objetivo"
            ayuda={OBJETIVO[unidad]?.ayuda}
            type="number"
            inputMode="decimal"
            step={OBJETIVO[unidad]?.step ?? "any"}
            min={OBJETIVO[unidad]?.min ?? 0}
            value={form.objetivo}
            onChange={cambiar("objetivo")}
            required
          />
        )}
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Casilla id="hito-activo" label="Visible para los usuarios" checked={form.activo} onChange={cambiar("activo")} />
        {!editando && (
          <Casilla id="hito-notificar" label="Avisar a todos con una notificación" checked={form.notificar} onChange={cambiar("notificar")} />
        )}
      </div>
      <Mensaje>{error}</Mensaje>
      <div className="flex gap-2">
        <BotonPrimario type="submit" disabled={guardando}>
          {guardando ? "Guardando..." : editando ? "Guardar cambios" : "Crear hito"}
        </BotonPrimario>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="h-11 rounded-lg px-4 text-sm font-semibold text-suave hover:text-texto">
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

export default function GestionHitos({ opciones, alPerderAdmin }) {
  const [hitos, setHitos] = useState(null);
  const [editando, setEditando] = useState(null); // hito en edición o null
  const [formKey, setFormKey] = useState(0); // para vaciar el formulario de creación
  const [aviso, setAviso] = useState("");
  const [error, setError] = useState("");

  const cargar = useCallback(async () => {
    try {
      setHitos(await listarAdmin("achievements"));
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

  async function alternarActivo(h) {
    setError("");
    try {
      await editarAdmin("achievements", h._id, { activo: !h.activo });
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }

  async function eliminar(h) {
    if (!window.confirm(`¿Eliminar el hito "${h.titulo}"? Desaparecerá también para quien ya lo había conseguido.`)) return;
    setError("");
    try {
      await eliminarAdmin("achievements", h._id);
      setAviso("Hito eliminado.");
      cargar();
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    }
  }

  const metrica = (key) => opciones.metricasHito.find((m) => m.key === key);
  const categoria = (key) => opciones.categorias.find((c) => c.key === key)?.label ?? key;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        {editando ? (
          <FormularioHito
            key={editando._id}
            opciones={opciones}
            inicial={editando}
            onGuardado={alGuardar}
            onCancelar={() => setEditando(null)}
            alPerderAdmin={alPerderAdmin}
          />
        ) : (
          <FormularioHito key={formKey} opciones={opciones} onGuardado={alGuardar} alPerderAdmin={alPerderAdmin} />
        )}
        <Mensaje tipo="ok">{aviso}</Mensaje>
      </div>

      <section aria-labelledby="lista-hitos">
        <h3 id="lista-hitos" className="mb-3 text-sm font-bold text-suave">
          Hitos creados {hitos ? `· ${hitos.length}` : ""}
        </h3>
        <Mensaje>{error}</Mensaje>
        {!hitos ? (
          <p className="text-sm text-suave">Cargando...</p>
        ) : !hitos.length ? (
          <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
            Aún no has creado ningún hito. Los hitos que crees aparecerán en la pestaña Logros de todos los usuarios.
          </p>
        ) : (
          <ul className="space-y-3">
            {hitos.map((h) => {
              const m = metrica(h.metrica);
              return (
                <li key={h._id} className={`rounded-2xl border border-borde bg-superficie p-4 ${h.activo ? "" : "opacity-60"}`}>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{h.titulo}</p>
                    <Etiquetita>{categoria(h.categoria)}</Etiquetita>
                    {!h.activo && <Etiquetita color="rojo">Oculto</Etiquetita>}
                  </div>
                  <p className="mt-1 text-sm text-suave">{h.descripcion}</p>
                  <p className="mt-2 text-xs text-suave">
                    {m?.label ?? h.metrica}: <strong className="text-texto">{formatearValorHito(m?.unidad ?? "", h.objetivo)}</strong>
                    {" · "}
                    Conseguido por {h.conseguidoPor} {h.conseguidoPor === 1 ? "usuario" : "usuarios"}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <BotonSecundario onClick={() => { setAviso(""); setEditando(h); }}>Editar</BotonSecundario>
                    <BotonSecundario onClick={() => alternarActivo(h)}>{h.activo ? "Ocultar" : "Mostrar"}</BotonSecundario>
                    <BotonSecundario peligro onClick={() => eliminar(h)}>Eliminar</BotonSecundario>
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

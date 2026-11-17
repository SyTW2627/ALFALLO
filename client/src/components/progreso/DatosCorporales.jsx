import { useState } from "react";
import { actualizarPerfil } from "../../lib/api.js";
import { actualizarUsuario } from "../../lib/auth.js";
import { leerNumero, salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { SEXOS, formatearNumero, formatearFechaCorta } from "../../lib/progreso.js";

// Peso corporal y tabla de referencia: sin peso no se pueden calcular los rangos.
export default function DatosCorporales({ perfil, destacado, onGuardado }) {
  const [peso, setPeso] = useState(perfil.pesoCorporalKg != null ? String(perfil.pesoCorporalKg) : "");
  const [sexo, setSexo] = useState(perfil.sexo ?? "unspecified");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const ultimo = perfil.historialPeso?.at(-1);

  const guardar = async (e) => {
    e.preventDefault();
    const kg = leerNumero(peso);
    if (Number.isNaN(kg) || kg < 25 || kg > 350) {
      setError("Introduce un peso entre 25 y 350 kg.");
      return;
    }
    setError("");
    setGuardando(true);
    try {
      const usuario = await actualizarPerfil({ pesoKg: kg, sexo });
      actualizarUsuario(usuario);
      await onGuardado();
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido guardar.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <form
      onSubmit={guardar}
      noValidate
      className={`rounded-2xl border p-5 ${
        destacado ? "border-primario/40 bg-gradient-to-br from-primario/15 to-superficie" : "border-borde bg-superficie"
      }`}
    >
      <h2 className="font-bold">{destacado ? "Añade tu peso para ver tus rangos" : "Tus datos"}</h2>
      <p className="mt-1 text-xs text-suave">
        Los rangos comparan tu fuerza con tu peso corporal.
        {ultimo && ` Último registro: ${formatearNumero(ultimo.kg)} kg (${formatearFechaCorta(ultimo.date)}).`}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-1">
        <div>
          <label htmlFor="peso-corporal" className="block text-xs font-medium text-suave">
            Peso corporal (kg)
          </label>
          <input
            id="peso-corporal"
            inputMode="decimal"
            placeholder="75"
            value={peso}
            onChange={(e) => setPeso(e.target.value)}
            aria-invalid={error ? "true" : undefined}
            className={`mt-1 h-11 w-full rounded-lg border bg-fondo px-3 text-sm font-semibold text-white outline-none transition placeholder:text-suave/50 focus:border-primario ${
              error ? "border-red-500/60" : "border-borde"
            }`}
          />
        </div>
        <div>
          <label htmlFor="tabla-sexo" className="block text-xs font-medium text-suave">
            Tabla de referencia
          </label>
          <select
            id="tabla-sexo"
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="mt-1 h-11 w-full rounded-lg border border-borde bg-fondo px-3 text-sm text-white outline-none focus:border-primario"
          >
            {SEXOS.map((s) => (
              <option key={s.valor} value={s.valor}>
                {s.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={guardando}
        className="mt-4 h-11 w-full rounded-lg bg-primario text-sm font-bold text-fondo transition hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primario disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}
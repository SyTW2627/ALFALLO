import { useEffect, useState } from "react";
import { seguirUsuario, dejarDeSeguir } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";

// Botón "Seguir" / "Siguiendo" para otro usuario.
// Actualización optimista: cambia al momento y se corrige si la API falla.
// `onCambio({ loSigo, seguidores })` avisa al padre (p. ej. para actualizar contadores).
export default function BotonSeguir({ idUsuario, loSigo: inicial = false, onCambio, pequeno = false }) {
  const [loSigo, setLoSigo] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");

  // Si el padre cambia el estado (p. ej. seguiste al mismo autor en otro post), se sincroniza.
  useEffect(() => setLoSigo(inicial), [inicial]);

  async function alternar() {
    if (ocupado) return;
    const anterior = loSigo;
    setLoSigo(!anterior);
    setOcupado(true);
    setError("");
    try {
      const r = await (anterior ? dejarDeSeguir(idUsuario) : seguirUsuario(idUsuario));
      setLoSigo(r.following);
      onCambio?.({ loSigo: r.following, seguidores: r.followersCount });
    } catch (err) {
      setLoSigo(anterior);
      if (!salirSiSesionCaducada(err)) setError(err?.message || "No se ha podido completar la acción.");
    } finally {
      setOcupado(false);
    }
  }

  const tamano = pequeno ? "h-8 px-3 text-xs" : "h-11 px-5 text-sm";
  const estilo = loSigo
    ? "border border-borde bg-elevada text-white hover:border-red-500/40 hover:text-red-300"
    : "bg-primario text-fondo hover:brightness-110";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={alternar}
        disabled={ocupado}
        aria-pressed={loSigo}
        className={`group rounded-lg font-bold transition disabled:opacity-60 ${tamano} ${estilo}`}
      >
        {loSigo ? (
          <>
            <span className="group-hover:hidden">Siguiendo</span>
            <span className="hidden group-hover:inline">Dejar de seguir</span>
          </>
        ) : (
          "Seguir"
        )}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}

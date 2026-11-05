import { useEffect, useState } from "react";

function Bloque({ className = "" }) {
  return <div className={`animate-pulse rounded-2xl border border-borde bg-superficie ${className}`} />;
}

// Solo aparece si la carga tarda más de `retraso` ms: en cargas rápidas no se ve nada.
export default function Esqueleto({ variante = "pagina", retraso = 250 }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), retraso);
    return () => clearTimeout(t);
  }, [retraso]);

  if (!visible) return <div aria-busy="true" />;

  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">Cargando…</span>

      {/* Cabecera: migas, título y subtítulo */}
      <div className="mb-8 space-y-3">
        <Bloque className="h-3 w-28 rounded-md border-0" />
        <Bloque className="h-9 w-64 max-w-full rounded-lg border-0" />
        <Bloque className="h-3 w-80 max-w-full rounded-md border-0" />
      </div>

      {variante === "entrenamiento" && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Bloque className="h-36" />
          <Bloque className="h-64" />
        </div>
      )}

      {variante === "estadisticas" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Bloque className="h-24" />
            <Bloque className="h-24" />
            <Bloque className="h-24" />
            <Bloque className="h-24" />
          </div>
          <Bloque className="h-72" />
        </div>
      )}

      {variante === "perfil" && (
        <div className="space-y-4">
          <Bloque className="h-24" />
          <div className="grid gap-4 sm:grid-cols-3">
            <Bloque className="h-20" />
            <Bloque className="h-20" />
            <Bloque className="h-20" />
          </div>
          <Bloque className="h-44" />
        </div>
      )}
    </div>
  );
}
import { useCallback, useEffect, useState } from "react";
import { obtenerEstadisticasAdmin } from "../../lib/api.js";
import { GraficoBarras } from "../estadisticas/graficos.jsx";
import { Mensaje, Etiquetita, BotonSecundario, mensajeDeError } from "./controles.jsx";

const numero = new Intl.NumberFormat("es-ES");
const fechaCorta = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });
const hora = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" });
const corta = (d) => fechaCorta.format(new Date(d)).replace(".", "");
const pct = (parte, total) => (total ? Math.round((parte / total) * 100) : 0);

function Tarjeta({ titulo, valor, detalle, tono, onClick }) {
  const contenido = (
    <>
      <p className="text-xs text-suave">{titulo}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${tono === "alerta" ? "text-peligro" : ""}`}>{valor}</p>
      {detalle && <p className="mt-1 text-xs text-suave">{detalle}</p>}
    </>
  );
  const clases = "rounded-2xl border bg-superficie p-5 text-left";
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${clases} ${tono === "alerta" ? "border-red-500/40" : "border-borde"} transition hover:border-primario/60`}
      >
        {contenido}
      </button>
    );
  }
  return <div className={`${clases} border-borde`}>{contenido}</div>;
}

// Variación respecto a la semana anterior: "+25 % vs. semana anterior".
function variacion(actual, anterior) {
  if (!anterior) return actual ? "Sin datos de la semana anterior" : "Igual que la semana anterior";
  const v = Math.round(((actual - anterior) / anterior) * 100);
  if (v === 0) return "Igual que la semana anterior";
  return `${v > 0 ? "+" : "−"}${Math.abs(v)} % vs. semana anterior (${numero.format(anterior)})`;
}

// Fila con una barra de progreso (completados / participantes, usuarios con un hito...).
function FilaBarra({ titulo, extra, parte, total, textoValor }) {
  const p = pct(parte, total);
  return (
    <li className="py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-sm">
          <span className="font-semibold">{titulo}</span> {extra}
        </p>
        <p className="shrink-0 text-xs tabular-nums text-suave">{textoValor}</p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
        <div className="h-full rounded-full bg-primario" style={{ width: `${p}%` }} />
      </div>
    </li>
  );
}

function Seccion({ titulo, descripcion, children }) {
  return (
    <section className="rounded-2xl border border-borde bg-superficie p-5">
      <h3 className="font-bold">{titulo}</h3>
      {descripcion && <p className="mt-0.5 text-xs text-suave">{descripcion}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export default function PanelResumen({ alPerderAdmin, irA }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const [verTodosHitos, setVerTodosHitos] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      setDatos(await obtenerEstadisticasAdmin());
    } catch (err) {
      setError(mensajeDeError(err, alPerderAdmin));
    } finally {
      setCargando(false);
    }
  }, [alPerderAdmin]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  if (!datos) return error ? <Mensaje>{error}</Mensaje> : <p className="text-sm text-suave">Calculando estadísticas...</p>;

  const { usuarios, entrenamientos, publicaciones, reportesPendientes, semanas, retosEspeciales, retosSemanales, hitos } = datos;
  const hitosVisibles = verTodosHitos ? hitos : hitos.slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-suave">Datos de las {hora.format(new Date(datos.generadoEn))}. "Esta semana" son los últimos 7 días.</p>
        <BotonSecundario onClick={cargar} disabled={cargando}>
          {cargando ? "Actualizando…" : "Actualizar"}
        </BotonSecundario>
      </div>
      <Mensaje>{error}</Mensaje>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta
          titulo="Usuarios registrados"
          valor={numero.format(usuarios.total)}
          detalle={`+${numero.format(usuarios.nuevosSemana)} esta semana`}
        />
        <Tarjeta
          titulo="Usuarios activos esta semana"
          valor={numero.format(usuarios.activosSemana)}
          detalle={`${pct(usuarios.activosSemana, usuarios.total)} % de los registrados han entrenado`}
        />
        <Tarjeta
          titulo="Entrenamientos esta semana"
          valor={numero.format(entrenamientos.semana)}
          detalle={variacion(entrenamientos.semana, entrenamientos.semanaAnterior)}
        />
        <Tarjeta
          titulo="Reportes pendientes"
          valor={numero.format(reportesPendientes)}
          detalle={reportesPendientes ? "Revisar en Moderación →" : "Nada que revisar"}
          tono={reportesPendientes ? "alerta" : undefined}
          onClick={() => irA("moderacion")}
        />
      </div>
      <p className="-mt-3 text-xs text-suave">
        En total: {numero.format(entrenamientos.total)} entrenamientos y {numero.format(publicaciones.total)} publicaciones (
        {numero.format(publicaciones.semana)} esta semana).
      </p>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion titulo="Entrenamientos por semana" descripcion="Últimas 8 semanas, de lunes a domingo.">
          <GraficoBarras
            etiqueta="Entrenamientos terminados por semana"
            datos={semanas.map((s) => ({ clave: s.inicio, etiqueta: corta(s.inicio), valor: s.entrenamientos, semana: s }))}
            formatoEje={(v) => numero.format(v)}
            alto={200}
            renderTooltip={(d) => (
              <>
                <p className="font-semibold">Semana del {corta(d.semana.inicio)}</p>
                <p className="text-suave">
                  {numero.format(d.valor)} entrenamientos · {numero.format(d.semana.activos)} usuarios
                </p>
              </>
            )}
          />
        </Seccion>
        <Seccion titulo="Usuarios nuevos por semana" descripcion="Registros en las últimas 8 semanas.">
          <GraficoBarras
            etiqueta="Usuarios nuevos por semana"
            datos={semanas.map((s) => ({ clave: s.inicio, etiqueta: corta(s.inicio), valor: s.usuariosNuevos, semana: s }))}
            formatoEje={(v) => numero.format(v)}
            alto={200}
            renderTooltip={(d) => (
              <>
                <p className="font-semibold">Semana del {corta(d.semana.inicio)}</p>
                <p className="text-suave">{numero.format(d.valor)} usuarios nuevos</p>
              </>
            )}
          />
        </Seccion>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Seccion
          titulo="Retos especiales"
          descripcion="En curso o terminados en los últimos 60 días. Completados sobre quienes han entrenado durante el reto."
        >
          {retosEspeciales.length ? (
            <ul className="divide-y divide-borde">
              {retosEspeciales.map((r) => (
                <FilaBarra
                  key={r._id}
                  titulo={r.titulo}
                  extra={
                    <span className="ml-1 inline-flex gap-1 align-middle">
                      <Etiquetita color={r.enCurso ? "acento" : "suave"}>{r.enCurso ? "En curso" : "Terminado"}</Etiquetita>
                      {!r.activo && <Etiquetita color="rojo">Oculto</Etiquetita>}
                    </span>
                  }
                  parte={r.completados}
                  total={r.participantes}
                  textoValor={`${r.completados} de ${r.participantes} (${pct(r.completados, r.participantes)} %)`}
                />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-suave">
              No hay retos especiales recientes.{" "}
              <button type="button" onClick={() => irA("retos")} className="font-semibold text-primario hover:underline">
                Crear uno
              </button>
            </p>
          )}
        </Seccion>

        <Seccion titulo="Retos de esta semana" descripcion="Sobre los usuarios que han entrenado desde el lunes.">
          {retosSemanales.length ? (
            <ul className="divide-y divide-borde">
              {retosSemanales.map((r) => (
                <FilaBarra
                  key={r.tipo}
                  titulo={r.titulo}
                  parte={r.completados}
                  total={r.participantes}
                  textoValor={`${r.completados} de ${r.participantes} (${pct(r.completados, r.participantes)} %)`}
                />
              ))}
            </ul>
          ) : (
            <p className="py-4 text-sm text-suave">Nadie ha entrenado todavía esta semana.</p>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Hitos más conseguidos" descripcion={`Porcentaje sobre los ${numero.format(usuarios.total)} usuarios registrados.`}>
        <ul className="divide-y divide-borde">
          {hitosVisibles.map((h) => (
            <FilaBarra
              key={h.key}
              titulo={h.titulo}
              extra={
                h.personalizado && (
                  <span className="ml-1 inline-flex gap-1 align-middle">
                    <Etiquetita color="primario">Creado por admin</Etiquetita>
                    {!h.activo && <Etiquetita color="rojo">Oculto</Etiquetita>}
                  </span>
                )
              }
              parte={h.conseguidoPor}
              total={usuarios.total}
              textoValor={`${numero.format(h.conseguidoPor)} (${pct(h.conseguidoPor, usuarios.total)} %)`}
            />
          ))}
        </ul>
        {hitos.length > 8 && (
          <button
            type="button"
            onClick={() => setVerTodosHitos((v) => !v)}
            className="mt-2 text-xs font-semibold text-primario hover:underline"
          >
            {verTodosHitos ? "Ver menos" : `Ver los ${hitos.length} hitos`}
          </button>
        )}
      </Seccion>
    </div>
  );
}

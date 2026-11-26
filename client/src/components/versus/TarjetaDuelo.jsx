import { useState } from "react";
import { aceptarVersus, rechazarVersus, retirarVersus } from "../../lib/api.js";
import { getUsuario, iniciales } from "../../lib/auth.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import { urlPerfil } from "../../lib/seguimiento.js";
import { formatearFechaCorta } from "../../lib/progreso.js";
import {
  avanceDuelo,
  detalleMarca,
  formatearDiferencia,
  formatearMarca,
  lados,
  modalidadDe,
  tiempoRestante,
  valorMarca,
} from "../../lib/versus.js";

const ESTADOS = {
  pendiente: { texto: "Pendiente", clase: "bg-elevada text-suave" },
  activo: { texto: "En curso", clase: "bg-primario/15 text-primario" },
  terminado: { texto: "Terminado", clase: "bg-acento/15 text-acento" },
  rechazado: { texto: "Rechazado", clase: "bg-elevada text-suave" },
  cancelado: { texto: "Retirado", clase: "bg-elevada text-suave" },
};

function Chip({ children, clase = "bg-elevada text-suave" }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${clase}`}>{children}</span>;
}

function Avatar({ nombre, destacado }) {
  return (
    <span
      aria-hidden="true"
      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-bold ${
        destacado ? "bg-primario/15 text-primario ring-2 ring-primario/40" : "bg-elevada"
      }`}
    >
      {iniciales(nombre)}
    </span>
  );
}

// Un lado del marcador: avatar, nombre, marca y la serie que la da.
function Lado({ nombre, avatar = nombre, marca, modalidad, gana, alineacion, enlace }) {
  const derecha = alineacion === "derecha";
  return (
    <div className={`flex min-w-0 flex-1 flex-col gap-2 ${derecha ? "items-end text-right" : "items-start"}`}>
      <div className={`flex min-w-0 items-center gap-2 ${derecha ? "flex-row-reverse" : ""}`}>
        <Avatar nombre={avatar} destacado={gana} />
        <p className="truncate text-sm font-semibold">
          {enlace ? (
            <a href={enlace} className="hover:text-primario">
              {nombre}
            </a>
          ) : (
            nombre
          )}
        </p>
      </div>
      <p className={`text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl ${gana ? "text-primario" : ""}`}>
        {formatearMarca(marca, modalidad)}
      </p>
      <p className="text-[11px] text-suave">{detalleMarca(marca)}</p>
    </div>
  );
}

// Barra de "tira y afloja": cuánto del total aporta cada uno.
function BarraPulso({ mio, suyo }) {
  const total = (mio ?? 0) + (suyo ?? 0);
  const parte = total > 0 ? ((mio ?? 0) / total) * 100 : 50;
  return (
    <div className="relative mt-4 flex h-2.5 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
      <div className="h-full bg-primario transition-[width] duration-700" style={{ width: `${parte}%` }} />
      <div className="h-full flex-1 bg-acento/70" />
      <span className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-fondo" />
    </div>
  );
}

function frase(duelo, ganadorYo, ganadorOtro) {
  const { yo, otro, rival } = lados(duelo);
  const m = duelo.marcador;
  const mio = valorMarca(m?.[yo], duelo.modalidad);
  const suyo = valorMarca(m?.[otro], duelo.modalidad);
  const terminado = duelo.estado === "terminado";

  if (mio == null && suyo == null) {
    return terminado ? "Nadie registró marca. Empate técnico… y un poco triste." : "Nadie ha marcado todavía. Abre el entreno y estrénate.";
  }
  if (ganadorYo) {
    const dif = suyo == null ? null : formatearDiferencia(mio - suyo, duelo.modalidad);
    if (terminado) return dif ? `¡Has ganado por ${dif}!` : "¡Has ganado! Tu rival ni apareció.";
    return dif ? `Vas ganando por ${dif}. No te relajes.` : `${rival.nombre} aún no ha marcado. Ventaja tuya.`;
  }
  if (ganadorOtro) {
    const dif = mio == null ? null : formatearDiferencia(suyo - mio, duelo.modalidad);
    if (terminado) return dif ? `${rival.nombre} ganó por ${dif}. Toca revancha.` : `${rival.nombre} ganó: no registraste marca.`;
    return dif ? `${rival.nombre} te saca ${dif}. ¡A por ello!` : "Aún no has marcado. Tu rival ya sí.";
  }
  return terminado ? "Empate exacto. Esto pide desempate." : "Empate exacto. Cualquier serie lo decide.";
}

export default function TarjetaDuelo({ duelo, onCambio, onRevancha }) {
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const { yo, otro, rival } = lados(duelo);
  const modo = modalidadDe(duelo.modalidad);
  const estado = ESTADOS[duelo.estado] ?? ESTADOS.pendiente;
  const conMarcador = duelo.estado === "activo" || duelo.estado === "terminado";
  const ganador = duelo.marcador?.ganador;
  const ganoYo = ganador === yo;
  const ganoOtro = ganador === otro;

  async function accion(fn) {
    setOcupado(true);
    setError("");
    try {
      onCambio(await fn(duelo.id));
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se ha podido completar la acción.");
    } finally {
      setOcupado(false);
    }
  }

  const resultado =
    duelo.estado === "terminado" && (ganoYo ? "Victoria" : ganoOtro ? "Derrota" : "Empate");

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-superficie ${
        duelo.estado === "activo" ? "border-primario/40" : "border-borde"
      } ${["rechazado", "cancelado"].includes(duelo.estado) ? "opacity-70" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-borde px-4 py-3 sm:px-5">
        <h3 className="mr-auto font-sans font-bold tracking-normal">{duelo.ejercicio.label}</h3>
        <Chip>{duelo.dias} días</Chip>
        <Chip>{modo.corta}</Chip>
        <Chip clase={estado.clase}>{resultado || estado.texto}</Chip>
      </div>

      <div className="px-4 py-4 sm:px-5">
        {conMarcador ? (
          <>
            <div className="flex items-start gap-3">
              <Lado nombre="Tú" avatar={getUsuario()?.nombre ?? "Tú"} marca={duelo.marcador?.[yo]} modalidad={duelo.modalidad} gana={ganoYo} />
              <span
                aria-hidden="true"
                className="mt-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevada text-[11px] font-black italic tracking-tight text-primario ring-1 ring-borde"
              >
                VS
              </span>
              <Lado
                nombre={rival.nombre}
                marca={duelo.marcador?.[otro]}
                modalidad={duelo.modalidad}
                gana={ganoOtro}
                alineacion="derecha"
                enlace={urlPerfil(rival.id)}
              />
            </div>
            <BarraPulso mio={valorMarca(duelo.marcador?.[yo], duelo.modalidad)} suyo={valorMarca(duelo.marcador?.[otro], duelo.modalidad)} />
            <p className="mt-3 text-sm font-semibold" aria-live="polite">
              {frase(duelo, ganoYo, ganoOtro)}
            </p>
            {duelo.estado === "activo" ? (
              <div className="mt-3">
                <div className="flex justify-between text-[11px] text-suave">
                  <span>Empezó el {formatearFechaCorta(duelo.inicio)}</span>
                  <span className="font-semibold text-texto">Quedan {tiempoRestante(duelo.fin)}</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-elevada" aria-hidden="true">
                  <div className="h-full rounded-full bg-suave/60" style={{ width: `${avanceDuelo(duelo.inicio, duelo.fin)}%` }} />
                </div>
                <a
                  href="/entrenamiento"
                  className="mt-4 inline-flex h-10 items-center rounded-lg bg-primario px-4 text-sm font-bold text-tinta transition hover:brightness-110"
                >
                  Entrenar ahora
                </a>
              </div>
            ) : (
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <p className="text-[11px] text-suave">
                  Del {formatearFechaCorta(duelo.inicio)} al {formatearFechaCorta(duelo.fin)}
                </p>
                {onRevancha && (
                  <button
                    type="button"
                    onClick={() => onRevancha(duelo)}
                    className="ml-auto h-9 rounded-lg border border-primario/50 px-3 text-xs font-bold text-primario transition hover:bg-primario/10"
                  >
                    {ganoOtro ? "Pedir revancha" : "Otra ronda"}
                  </button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex items-start gap-3">
            <Avatar nombre={rival.nombre} />
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                {duelo.estado === "pendiente" &&
                  (duelo.soyRetador ? (
                    <>
                      Esperando a que <a href={urlPerfil(rival.id)} className="font-semibold hover:text-primario">{rival.nombre}</a> acepte.
                    </>
                  ) : (
                    <>
                      <a href={urlPerfil(rival.id)} className="font-semibold hover:text-primario">{rival.nombre}</a> te reta. El reloj
                      empieza cuando aceptes.
                    </>
                  ))}
                {duelo.estado === "rechazado" &&
                  (duelo.soyRetador ? `${rival.nombre} ha rechazado el versus.` : `Rechazaste el versus de ${rival.nombre}.`)}
                {duelo.estado === "cancelado" &&
                  (duelo.soyRetador ? `Retiraste el versus a ${rival.nombre}.` : `${rival.nombre} retiró el versus.`)}
              </p>
              {duelo.mensaje && (
                <blockquote className="mt-2 rounded-xl bg-elevada px-3 py-2 text-sm italic">«{duelo.mensaje}»</blockquote>
              )}

              {duelo.estado === "pendiente" && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {duelo.soyRetador ? (
                    <button
                      type="button"
                      disabled={ocupado}
                      onClick={() => accion(retirarVersus)}
                      className="h-9 rounded-lg border border-borde px-3 text-xs font-semibold text-suave transition hover:text-texto disabled:opacity-50"
                    >
                      Retirar
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => accion(aceptarVersus)}
                        className="h-10 rounded-lg bg-primario px-4 text-sm font-bold text-tinta transition hover:brightness-110 disabled:opacity-50"
                      >
                        Aceptar el reto
                      </button>
                      <button
                        type="button"
                        disabled={ocupado}
                        onClick={() => accion(rechazarVersus)}
                        className="h-10 rounded-lg border border-borde px-4 text-sm font-semibold text-suave transition hover:text-texto disabled:opacity-50"
                      >
                        Ahora no
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {duelo.mensaje && conMarcador && <p className="mt-3 text-xs italic text-suave">«{duelo.mensaje}»</p>}
        {error && (
          <p role="alert" className="mt-3 text-sm text-peligro">
            {error}
          </p>
        )}
      </div>
    </article>
  );
}

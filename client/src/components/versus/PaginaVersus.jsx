import { useCallback, useEffect, useRef, useState } from "react";
import { getUsuario } from "../../lib/auth.js";
import { obtenerVersus } from "../../lib/api.js";
import { salirSiSesionCaducada } from "../../lib/entrenamiento.js";
import TarjetaDuelo from "./TarjetaDuelo.jsx";
import NuevoVersus from "./NuevoVersus.jsx";
import CaraACara from "./CaraACara.jsx";

const PESTANAS = [
  { valor: "duelos", etiqueta: "Duelos" },
  { valor: "cara", etiqueta: "Cara a cara" },
];

// /versus?rival=<id> abre el formulario con ese rival; /versus?tab=cara&con=<id> compara con él.
function leerUrl() {
  const p = new URLSearchParams(window.location.search);
  return {
    pestana: p.get("tab") === "cara" ? "cara" : "duelos",
    rival: p.get("rival") ?? undefined,
    con: p.get("con") ?? undefined,
  };
}

function Seccion({ titulo, contador, children }) {
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 font-sans text-sm font-bold uppercase tracking-[0.12em] text-suave">
        {titulo}
        {contador > 0 && <span className="rounded-full bg-elevada px-2 py-0.5 text-[11px] tabular-nums">{contador}</span>}
      </h2>
      {children}
    </section>
  );
}

export default function PaginaVersus() {
  const [estado, setEstado] = useState("cargando");
  const [error, setError] = useState("");
  const [datos, setDatos] = useState(null);
  const [pestana, setPestana] = useState("duelos");
  const [inicial, setInicial] = useState(null);
  const [con, setCon] = useState(undefined);
  const [, setReloj] = useState(0);
  const formulario = useRef(null);

  const cargar = useCallback(async () => {
    try {
      setDatos(await obtenerVersus());
      setEstado("listo");
    } catch (err) {
      if (salirSiSesionCaducada(err)) return;
      setError(err.message || "No se han podido cargar tus versus.");
      setEstado("error");
    }
  }, []);

  useEffect(() => {
    if (!getUsuario()) {
      window.location.replace("/login");
      return;
    }
    const url = leerUrl();
    setPestana(url.pestana);
    if (url.rival) setInicial({ rival: url.rival });
    setCon(url.con);
    cargar();
    // Cada minuto se repinta la cuenta atrás; cada 5, se piden marcadores nuevos.
    const tic = setInterval(() => setReloj((n) => n + 1), 60_000);
    const refresco = setInterval(cargar, 5 * 60_000);
    return () => {
      clearInterval(tic);
      clearInterval(refresco);
    };
  }, [cargar]);

  const cambiarPestana = (valor) => {
    setPestana(valor);
    window.history.replaceState(null, "", valor === "duelos" ? "/versus" : `/versus?tab=${valor}`);
  };

  // Desde el cara a cara o la revancha: se va al formulario con los datos ya puestos.
  const prepararReto = (datosReto) => {
    cambiarPestana("duelos");
    setInicial({ ...datosReto, _t: Date.now() });
    requestAnimationFrame(() => formulario.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const sustituir = (duelo) =>
    setDatos((d) => ({ ...d, duelos: d.duelos.map((x) => (x.id === duelo.id ? duelo : x)) }));

  const anadir = (duelo) => setDatos((d) => ({ ...d, duelos: [duelo, ...d.duelos] }));

  if (estado === "cargando") {
    return (
      <p role="status" className="text-sm text-suave">
        Cargando tus versus...
      </p>
    );
  }

  if (estado === "error") {
    return (
      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
        <p role="alert" className="text-sm text-peligro">
          {error}
        </p>
        <button
          type="button"
          onClick={() => {
            setEstado("cargando");
            cargar();
          }}
          className="mt-4 h-11 rounded-lg bg-primario px-5 text-sm font-bold text-tinta transition hover:brightness-110"
        >
          Reintentar
        </button>
      </div>
    );
  }

  const duelos = datos.duelos;
  const recibidos = duelos.filter((d) => d.estado === "pendiente" && !d.soyRetador);
  const enCurso = duelos.filter((d) => d.estado === "activo").sort((a, b) => new Date(a.fin) - new Date(b.fin));
  const enviados = duelos.filter((d) => d.estado === "pendiente" && d.soyRetador);
  const historial = duelos.filter((d) => ["terminado", "rechazado", "cancelado"].includes(d.estado));

  const terminados = duelos.filter((d) => d.estado === "terminado");
  const victorias = terminados.filter((d) => d.marcador?.ganador === (d.soyRetador ? "retador" : "rival")).length;
  const derrotas = terminados.filter((d) => d.marcador?.ganador === (d.soyRetador ? "rival" : "retador")).length;

  const revancha = (d) =>
    prepararReto({
      rival: d.soyRetador ? d.rival.id : d.retador.id,
      ejercicio: d.ejercicio.key,
      modalidad: d.modalidad,
      dias: d.dias,
      mensaje: d.marcador?.ganador === (d.soyRetador ? "rival" : "retador") ? "Quiero la revancha." : "¿Otra ronda?",
    });

  return (
    <div>
      <header className="mb-6">
        <p className="text-xs text-suave">Comunidad / Versus</p>
        <h1 className="mt-2 flex items-center gap-3 text-3xl font-extrabold tracking-tight md:text-4xl">
          Versus
          <span className="rounded-full border border-acento/40 bg-acento/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-[0.12em] text-acento">
            Beta
          </span>
        </h1>
        <p className="mt-1 text-sm text-suave">
          Reta a tu gente y descubrid quién levanta más… o quién levanta más para lo que pesa.
        </p>
        {terminados.length > 0 && (
          <p className="mt-3 text-sm">
            Tu balance: <span className="font-bold text-primario">{victorias} {victorias === 1 ? "victoria" : "victorias"}</span> ·{" "}
            <span className="font-bold">{derrotas} {derrotas === 1 ? "derrota" : "derrotas"}</span>
          </p>
        )}
      </header>

      <div role="tablist" aria-label="Secciones" className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {PESTANAS.map((p) => (
          <button
            key={p.valor}
            type="button"
            role="tab"
            id={`tab-${p.valor}`}
            aria-selected={pestana === p.valor}
            aria-controls={`panel-${p.valor}`}
            onClick={() => cambiarPestana(p.valor)}
            className={`h-10 shrink-0 rounded-full border px-4 text-sm font-semibold transition ${
              pestana === p.valor ? "border-primario bg-primario/15 text-primario" : "border-borde text-suave hover:text-texto"
            }`}
          >
            {p.etiqueta}
            {p.valor === "duelos" && recibidos.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primario px-1.5 text-[11px] font-bold text-tinta">{recibidos.length}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${pestana}`} aria-labelledby={`tab-${pestana}`}>
        {pestana === "duelos" ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="min-w-0 space-y-8">
              {recibidos.length > 0 && (
                <Seccion titulo="Te han retado" contador={recibidos.length}>
                  {recibidos.map((d) => (
                    <TarjetaDuelo key={d.id} duelo={d} onCambio={sustituir} />
                  ))}
                </Seccion>
              )}

              <Seccion titulo="En curso" contador={enCurso.length}>
                {enCurso.length ? (
                  enCurso.map((d) => <TarjetaDuelo key={d.id} duelo={d} onCambio={sustituir} />)
                ) : (
                  <p className="rounded-2xl border border-dashed border-borde p-6 text-center text-sm text-suave">
                    No tienes ningún versus en marcha. Lanza uno y que empiece el pique.
                  </p>
                )}
              </Seccion>

              {enviados.length > 0 && (
                <Seccion titulo="Esperando respuesta" contador={enviados.length}>
                  {enviados.map((d) => (
                    <TarjetaDuelo key={d.id} duelo={d} onCambio={sustituir} />
                  ))}
                </Seccion>
              )}

              {historial.length > 0 && (
                <Seccion titulo="Historial">
                  {historial.map((d) => (
                    <TarjetaDuelo key={d.id} duelo={d} onCambio={sustituir} onRevancha={d.estado === "terminado" ? revancha : undefined} />
                  ))}
                </Seccion>
              )}

              <p className="text-[11px] text-suave">
                Versus está en beta. Cuenta tu mejor 1RM estimado (Epley) con series de 1 a 10 repeticiones de los
                entrenamientos que termines durante el duelo. Una marca que supera en más de un 50 % tu mejor de los 90
                días anteriores no cuenta (suele ser un error al teclear).
              </p>
            </div>

            <aside ref={formulario} className="scroll-mt-6 lg:sticky lg:top-6 lg:self-start">
              <NuevoVersus opciones={datos} inicial={inicial} onCreado={anadir} />
            </aside>
          </div>
        ) : (
          <CaraACara amigos={datos.amigos} inicial={con} onRetar={prepararReto} />
        )}
      </div>
    </div>
  );
}

// Se ejecuta en todas las páginas (desde Layout.astro).

import { getUsuario } from "./auth.js";
import { sincronizar, suscribir, resumenSincronizacion } from "./sinConexion.js";

export function iniciarPwa() {
  registrarServiceWorker();
  avisoDeConexion();
  sincronizacionAutomatica();
  ofrecerInstalacion();
}

/* ---------- Service worker ---------- */

function registrarServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!import.meta.env.PROD) {
    // En desarrollo no se usa: se quita por si quedó uno de `npm run preview`.
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
    return;
  }
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* sin service worker la app funciona igual, solo que no sin conexión */
    });
  });
}

/* ---------- Aviso de "sin conexión" ---------- */

function avisoDeConexion() {
  const aviso = document.getElementById("aviso-red");
  if (!aviso) return;
  let sync = resumenSincronizacion();

  const pintar = () => {
    let texto = "";
    if (!navigator.onLine) texto = "Sin conexión · lo que entrenes se guarda en el móvil";
    else if (sync.enviando && sync.sinEnviar > 0) texto = "Subiendo entrenamientos guardados…";
    aviso.textContent = texto;
    aviso.hidden = !texto;
  };

  suscribir((r) => {
    sync = r;
    pintar();
  });
  window.addEventListener("online", pintar);
  window.addEventListener("offline", pintar);
  pintar();
}

/* ---------- Subir entrenamientos guardados en el móvil ---------- */

function sincronizacionAutomatica() {
  if (!getUsuario()) return;
  const siHayAlgo = () => {
    const r = resumenSincronizacion();
    if (navigator.onLine && r.sinEnviar > 0 && !r.enviando) sincronizar();
  };
  siHayAlgo();
  window.addEventListener("online", siHayAlgo);
  document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && siHayAlgo());
  setInterval(siHayAlgo, 30000);
}

/* ---------- "Instalar AlFallo" ---------- */

const CLAVE_DESCARTADO = "alfallo:instalar-descartado";

function ofrecerInstalacion() {
  const banner = document.getElementById("aviso-instalar");
  if (!banner) return;
  let peticion = null;

  let descartado = false;
  try {
    descartado = localStorage.getItem(CLAVE_DESCARTADO) === "1";
  } catch {
    /* almacenamiento no disponible */
  }

  // Chrome y Edge (Android y escritorio) avisan cuando la app se puede instalar.
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    peticion = e;
    if (!descartado) banner.hidden = false;
  });
  window.addEventListener("appinstalled", () => {
    banner.hidden = true;
    peticion = null;
  });

  banner.querySelector("[data-instalar]")?.addEventListener("click", async () => {
    if (!peticion) return;
    banner.hidden = true;
    peticion.prompt();
    await peticion.userChoice.catch(() => null);
    peticion = null;
  });
  banner.querySelector("[data-cerrar]")?.addEventListener("click", () => {
    banner.hidden = true;
    try {
      localStorage.setItem(CLAVE_DESCARTADO, "1");
    } catch {
      /* almacenamiento no disponible */
    }
  });
}

import { useEffect, useRef } from "react";

const CLIENT_ID = import.meta.env.PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

// Carga el script de Google una sola vez.
let cargaScript;
function cargarGoogle() {
  if (window.google?.accounts?.id) return Promise.resolve();
  cargaScript ??= new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
  return cargaScript;
}

// Botón oficial de Google. Al elegir cuenta llama a onCredential(token).
export default function BotonGoogle({ modo = "login", onCredential }) {
  const contenedor = useRef(null);
  const callback = useRef(onCredential);
  callback.current = onCredential;

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelado = false;

    cargarGoogle()
      .then(() => {
        if (cancelado || !contenedor.current) return;
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: ({ credential }) => callback.current(credential),
        });
        window.google.accounts.id.renderButton(contenedor.current, {
          theme: "filled_black",
          size: "large",
          shape: "rectangular",
          text: modo === "registro" ? "signup_with" : "signin_with",
          locale: "es",
          width: Math.min(contenedor.current.offsetWidth, 400),
        });
      })
      .catch(() => {
        /* sin conexión con Google: no se muestra el botón */
      });

    return () => {
      cancelado = true;
    };
  }, [modo]);

  if (!CLIENT_ID) return null; // sin PUBLIC_GOOGLE_CLIENT_ID no se muestra
  return <div ref={contenedor} className="flex h-11 w-full justify-center" />;
}
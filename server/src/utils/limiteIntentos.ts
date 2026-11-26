// Límite de intentos fallidos en memoria (p. ej. contraseñas) para evitar ataques de fuerza bruta.
// Se reinicia al arrancar el servidor; suficiente para una sola instancia.
export function crearLimiteIntentos(maxIntentos: number, ventanaMs: number) {
  const intentos = new Map<string, { fallos: number; desde: number }>();

  return {
    bloqueado(clave: string) {
      const r = intentos.get(clave);
      if (!r) return false;
      if (Date.now() - r.desde > ventanaMs) {
        intentos.delete(clave);
        return false;
      }
      return r.fallos >= maxIntentos;
    },
    registrarFallo(clave: string) {
      const r = intentos.get(clave);
      if (!r || Date.now() - r.desde > ventanaMs) intentos.set(clave, { fallos: 1, desde: Date.now() });
      else r.fallos++;
    },
    limpiar(clave: string) {
      intentos.delete(clave);
    },
  };
}

import { useEffect, useState } from "react";

/**
 * Devuelve `true` solo después del primer render en el cliente.
 * Úsalo para evitar hydration mismatches en componentes que dependen
 * de estado del navegador (wallet, localStorage, window, etc.).
 */
export function useIsMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

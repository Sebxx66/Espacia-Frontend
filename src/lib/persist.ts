import { useEffect, useState } from "react";

// Guarda la pantalla y la pestaña abiertas en sessionStorage (solo esta pestaña del navegador),
// para que al recargar la página se vuelva al mismo lugar en vez de a la pantalla principal.

const PREFIX = "espacia.nav.";

export function readPersisted<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writePersisted(key: string, value: unknown) {
  try {
    sessionStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    // sin almacenamiento disponible: solo se pierde la pantalla al recargar
  }
}

// Al cerrar o iniciar sesión se olvida la navegación anterior
export function clearPersisted() {
  try {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // nada que borrar
  }
}

// useState que sobrevive a recargar la página. `allowed` evita restaurar valores que ya no existen.
export function usePersistedState<T extends string>(key: string, initial: T, allowed: readonly T[]) {
  const [value, setValue] = useState<T>(() => {
    const saved = readPersisted<T>(key);
    return saved !== null && allowed.includes(saved) ? saved : initial;
  });
  useEffect(() => {
    writePersisted(key, value);
  }, [key, value]);
  return [value, setValue] as const;
}

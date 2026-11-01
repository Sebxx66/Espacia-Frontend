import { useCallback, useEffect, useRef, useState } from "react";

// Carga datos de la API y expone estado de carga, error y una función para recargar
export function useLoader<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const loadRef = useRef(load);
  loadRef.current = load;

  // silent = recargar sin mostrar el estado de "cargando" (por ejemplo, después de una acción)
  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      setData(await loadRef.current());
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudieron cargar los datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, setData, loading, error, reload };
}

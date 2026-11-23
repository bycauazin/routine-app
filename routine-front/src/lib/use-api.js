import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { onDataChanged } from "./data-events";

/**
 * Loads data from the API with loading/error state and a `reload` function.
 * Pass `null` as path to skip loading.
 * @param {string | null} path
 * @param {Record<string, unknown>} [query]
 */
export function useApi(path, query) {
  const [state, setState] = useState({ data: undefined, meta: undefined, error: null, loading: path !== null });
  const queryKey = JSON.stringify(query ?? {});
  const controllerRef = useRef(null);

  const load = useCallback(async () => {
    if (path === null) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await api(path, { query: JSON.parse(queryKey), signal: controller.signal });
      setState({ data: res?.data, meta: res?.meta, error: null, loading: false });
    } catch (error) {
      if (error.name === "AbortError") return;
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, [path, queryKey]);

  useEffect(() => {
    load();
    return () => controllerRef.current?.abort();
  }, [load]);

  // Something was undone (Histórico): show the data as it is now.
  useEffect(() => onDataChanged(load), [load]);

  return { ...state, reload: load };
}

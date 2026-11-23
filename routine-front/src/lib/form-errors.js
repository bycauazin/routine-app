import { ApiError } from "./api";

/**
 * Shows API validation errors next to the matching form fields; anything
 * else becomes a toast. Returns true when at least one field was flagged.
 * @param {unknown} error
 * @param {(name: string, error: { message: string }) => void} setError  react-hook-form setError
 * @param {{ error: (message: string) => void }} toast
 */
export function handleFormError(error, setError, toast) {
  if (error instanceof ApiError && Object.keys(error.fields).length > 0) {
    for (const [field, message] of Object.entries(error.fields)) {
      setError(field === "_" ? "root" : field, { type: "server", message });
    }
    if (error.fields._) toast.error(error.fields._);
    return true;
  }
  toast.error(error?.message ?? "Não foi possível salvar.");
  return false;
}

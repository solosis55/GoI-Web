type StatusMessageProps = {
  loading?: boolean;
  error?: string;
  success?: string;
  loadingText?: string;
  /** Textos pensados para fondo oscuro (p. ej. auth). */
  tone?: "light" | "dark";
};

export function StatusMessage({
  loading = false,
  error = "",
  success = "",
  loadingText = "Cargando...",
  tone = "light",
}: StatusMessageProps) {
  const loadingClass = tone === "dark" ? "text-neutral-400" : "text-neutral-600";
  const errorClass = tone === "dark" ? "text-red-400" : "text-red-600";
  const successClass = tone === "dark" ? "text-emerald-400" : "text-green-700 dark:text-green-400";

  return (
    <>
      {loading && <p className={`m-0 ${loadingClass}`}>{loadingText}</p>}
      {error && <p className={`m-0 ${errorClass}`}>{error}</p>}
      {success && <p className={`m-0 ${successClass}`}>{success}</p>}
    </>
  );
}

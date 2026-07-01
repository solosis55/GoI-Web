import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { PostSessionPickerController } from "../../hooks/usePostSessionPicker";
import { SessionPickerFilters, SessionPickerList } from "./SessionPickerPanel";

type CreatePostSessionPickerModalProps = {
  open: boolean;
  onClose: () => void;
  picker: PostSessionPickerController;
  selectedSessionId: string;
  showUnlink?: boolean;
  onSelect: (sessionId: string) => void;
};

export function CreatePostSessionPickerModal({
  open,
  onClose,
  picker,
  selectedSessionId,
  showUnlink = true,
  onSelect,
}: CreatePostSessionPickerModalProps) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    void picker.refresh();
    const t = window.setTimeout(() => searchRef.current?.focus(), 80);
    return () => window.clearTimeout(t);
  }, [open, picker.refresh]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const pick = (id: string) => {
    onSelect(id);
    onClose();
  };

  if (!open) return null;

  const hasFilters =
    picker.query.trim().length > 0 || picker.datePreset !== "all" || Boolean(picker.workoutId);

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/65 p-0 backdrop-blur-[2px] sm:items-center sm:p-4 light:bg-zinc-900/45"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="flex max-h-[min(88vh,640px)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-neutral-800 bg-zinc-950 shadow-2xl sm:rounded-2xl light:border-zinc-200 light:bg-white"
        role="dialog"
        aria-modal="true"
        aria-label="Elegir sesión"
      >
        <div className="shrink-0 border-b border-neutral-800/70 px-4 pb-3 pt-4 light:border-zinc-200">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-neutral-100 light:text-zinc-900">Vincular sesión</h3>
              <p className="mt-0.5 text-xs text-neutral-500">
                Las ya publicadas aparecen deshabilitadas. Usa filtros si tienes muchas sesiones.
              </p>
            </div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm font-semibold text-neutral-500 hover:bg-neutral-800/60 hover:text-neutral-200 light:hover:bg-zinc-100"
              onClick={onClose}
            >
              Cerrar
            </button>
          </div>
          <SessionPickerFilters picker={picker} searchRef={searchRef} />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2 sm:px-4">
          {!selectedSessionId && picker.todayAvailableSession ? (
            <div className="mb-3">
              <button
                type="button"
                onClick={() => pick(picker.todayAvailableSession!.id)}
                className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-goi-gold/45 bg-goi-gold/10 px-3 py-3 text-left transition hover:bg-goi-gold/15"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-goi-gold">Acción rápida</span>
                <span className="font-semibold text-neutral-100 light:text-zinc-900">
                  Vincular sesión de hoy · {picker.todayAvailableSession.workoutTitle}
                </span>
              </button>
            </div>
          ) : null}
          {picker.loading ? (
            <p className="py-8 text-center text-sm text-neutral-500">Cargando sesiones…</p>
          ) : picker.sessions.length === 0 ? (
            <div className="py-8 text-center">
              <p className="font-semibold text-neutral-200 light:text-zinc-800">
                {hasFilters ? "Sin resultados" : "Sin sesiones registradas"}
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                {hasFilters
                  ? "Prueba otro término o amplía el rango de fechas."
                  : "Completa un entrenamiento en la app móvil para vincularlo aquí."}
              </p>
            </div>
          ) : (
            <SessionPickerList
              sessions={picker.sessions}
              selectedSessionId={selectedSessionId}
              suggestedSessionId={picker.suggestedSessionId}
              showUnlink={showUnlink}
              loadingMore={picker.loadingMore}
              hasMore={picker.hasMore}
              onLoadMore={picker.loadMore}
              onSelect={pick}
              onSelectUnlink={() => pick("")}
              hideUnlinkWhenSearching={hasFilters}
            />
          )}
        </div>
      </section>
    </div>,
    document.body,
  );
}

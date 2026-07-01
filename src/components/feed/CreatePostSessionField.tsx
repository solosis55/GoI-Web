import { useState } from "react";
import { Button } from "../ui/Button";
import type { WorkoutSessionWithTitle } from "../../types/workoutSession";
import type { PostSessionPickerController } from "../../hooks/usePostSessionPicker";
import { CreatePostSessionHero } from "./CreatePostSessionHero";
import { CreatePostSessionPickerModal } from "./CreatePostSessionPickerModal";

type CreatePostSessionFieldProps = {
  picker: PostSessionPickerController;
  selectedSessionId: string;
  selectedSession?: WorkoutSessionWithTitle | null;
  onChangeSessionId: (sessionId: string) => void;
  hint?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onPressViewSession?: () => void;
};

export function CreatePostSessionField({
  picker,
  selectedSessionId,
  selectedSession = null,
  onChangeSessionId,
  hint = "Entrenos completados en la app móvil.",
  open: openControlled,
  onOpenChange,
  onPressViewSession,
}: CreatePostSessionFieldProps) {
  const [openInternal, setOpenInternal] = useState(false);
  const [linkingToday, setLinkingToday] = useState(false);
  const pickerOpen = openControlled ?? openInternal;
  const setPickerOpen = onOpenChange ?? setOpenInternal;
  const selected =
    selectedSession ??
    picker.getSession(selectedSessionId) ??
    null;

  const todaySession = picker.todayAvailableSession;
  const showTodayCta = !selectedSessionId && (todaySession || linkingToday);

  const linkToday = async () => {
    setLinkingToday(true);
    try {
      const session = todaySession ?? (await picker.linkTodaySession());
      if (session) onChangeSessionId(session.id);
    } finally {
      setLinkingToday(false);
    }
  };

  return (
    <>
      <fieldset className="grid gap-2 rounded-xl border border-neutral-800/85 bg-black/25 p-3 light:border-zinc-200 light:bg-zinc-50">
        <legend className="font-semibold">Entreno vinculado</legend>
        <p className="text-xs text-neutral-500">{hint}</p>

        {showTodayCta ? (
          <button
            type="button"
            disabled={linkingToday}
            onClick={() => void linkToday()}
            className="flex w-full flex-col items-start gap-0.5 rounded-xl border border-goi-gold/45 bg-goi-gold/10 px-3 py-3 text-left transition hover:bg-goi-gold/15 disabled:opacity-60"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-goi-gold">Acción rápida</span>
            <span className="font-semibold text-neutral-100 light:text-zinc-900">
              {linkingToday
                ? "Buscando sesión de hoy…"
                : `Vincular sesión de hoy · ${todaySession?.workoutTitle ?? ""}`}
            </span>
            {!linkingToday && todaySession ? (
              <span className="text-xs text-neutral-500">Un toque para usar tu entreno de hoy</span>
            ) : null}
          </button>
        ) : null}

        {selected && selectedSessionId ? (
          <div className="grid gap-2">
            <CreatePostSessionHero session={selected} onPressView={onPressViewSession} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => setPickerOpen(true)}>
                Cambiar
              </Button>
              <Button type="button" variant="secondary" onClick={() => onChangeSessionId("")}>
                Quitar
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="secondary" disabled={picker.loading} onClick={() => setPickerOpen(true)}>
            {picker.loading ? "Cargando sesiones…" : "Elegir sesión"}
          </Button>
        )}
        {!picker.loading && picker.available.length === 0 && !selectedSessionId ? (
          <p className="text-xs text-neutral-500">
            No hay sesiones disponibles. Las ya publicadas aparecen deshabilitadas en el listado.
          </p>
        ) : null}
      </fieldset>

      <CreatePostSessionPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        picker={picker}
        selectedSessionId={selectedSessionId}
        onSelect={onChangeSessionId}
      />
    </>
  );
}

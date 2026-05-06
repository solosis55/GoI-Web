import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { markNotificationsRead } from "../../api/postsApi";
import type { FeedNotification, NotificationsResponse } from "../../types/post";
import { getErrorMessage } from "../../utils/errorMessages";
import { Button } from "../ui/Button";

type NotifTab = "all" | FeedNotification["type"];

type FeedNotificationsBellProps = {
  notifications: FeedNotification[];
  unreadCount: number;
  loading: boolean;
  onRefresh: () => Promise<NotificationsResponse | null | void>;
};

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

export function FeedNotificationsBell({
  notifications,
  unreadCount,
  loading,
  onRefresh,
}: FeedNotificationsBellProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<NotifTab>("all");
  const [markBusy, setMarkBusy] = useState(false);
  const [markingSingleId, setMarkingSingleId] = useState<string | null>(null);
  const [markErr, setMarkErr] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const data = (await onRefresh()) as NotificationsResponse | null | undefined;
      if (cancelled || !data?.notifications?.length) return;
      const unreadKeys = data.notifications.filter((n) => n.read !== true).map((n) => n.id);
      if (unreadKeys.length === 0) return;
      try {
        await markNotificationsRead({ keys: unreadKeys });
        await onRefresh();
      } catch {
        /* no bloquear el panel */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onRefresh]);

  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(ev: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(ev.target as Node)) {
        close();
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open, close]);

  const filtered = useMemo(() => {
    if (tab === "all") return notifications;
    return notifications.filter((n) => n.type === tab);
  }, [notifications, tab]);

  async function handleMarkAllRead() {
    setMarkErr("");
    setMarkBusy(true);
    try {
      await markNotificationsRead({ all: true });
      await onRefresh();
    } catch (e) {
      setMarkErr(getErrorMessage(e, "No se pudieron marcar como leídas"));
    } finally {
      setMarkBusy(false);
    }
  }

  async function handleMarkOneRead(notificationId: string) {
    setMarkErr("");
    setMarkingSingleId(notificationId);
    try {
      await markNotificationsRead({ keys: [notificationId] });
      await onRefresh();
    } catch (e) {
      setMarkErr(getErrorMessage(e, "No se pudo marcar como leída"));
    } finally {
      setMarkingSingleId(null);
    }
  }

  function handleOpenPost(postId: string | undefined) {
    if (!postId) return;
    setOpen(false);
    requestAnimationFrame(() => {
      document.getElementById(`feed-post-${postId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Cerrar notificaciones" : "Abrir notificaciones"}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-700 bg-neutral-950 text-neutral-300 transition-colors hover:border-goi-gold/35 hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span
            key={unreadCount}
            className="absolute -right-1 -top-1 flex min-w-[1rem] justify-center rounded-full bg-goi-gold px-1 text-[10px] font-semibold leading-4 text-black shadow-[0_0_10px_-2px_rgba(212,175,55,0.85)] motion-safe:animate-[feedBellBadge_0.45s_ease-out_1]"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className="feed-notif-panel-animate absolute right-0 top-full z-30 mt-2 w-[min(100vw-2rem,22rem)] max-h-[min(70vh,26rem)] overflow-y-auto rounded-lg border border-neutral-800 bg-zinc-950 py-2 shadow-xl shadow-black/40"
          role="region"
          aria-label="Actividad reciente"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-800 px-3 pb-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Actividad</p>
            <Button
              type="button"
              variant="secondary"
              className="!py-1 !text-xs"
              disabled={markBusy || markingSingleId !== null || unreadCount === 0}
              onClick={() => void handleMarkAllRead()}
            >
              Marcar todo leído
            </Button>
          </div>
          {markErr ? <p className="px-3 pt-2 text-xs text-red-400">{markErr}</p> : null}

          <div className="mt-2 flex flex-wrap gap-1 px-3" role="tablist" aria-label="Filtrar notificaciones">
            {(["all", "like", "comment", "follow"] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize transition-colors ${
                  tab === t
                    ? "border-goi-gold/50 bg-goi-gold/15 text-goi-gold"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {t === "all" ? "Todas" : t === "like" ? "Likes" : t === "comment" ? "Comentarios" : "Siguen"}
              </button>
            ))}
          </div>

          {loading && notifications.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500">Cargando…</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-4 text-sm text-neutral-500">Sin entradas en este filtro.</p>
          ) : (
            <ul className="list-none p-0">
              {filtered.map((n) => (
                <li
                  key={n.id}
                  className={`border-b border-neutral-800/70 px-3 py-2.5 text-sm last:border-b-0 ${
                    n.read === false ? "bg-goi-gold/[0.04]" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-neutral-200">{n.actorUsername}</p>
                      <p className="mt-0.5 text-neutral-400">
                        {n.type === "like" ? "Ha dado like a tu publicación." : null}
                        {n.type === "comment" ? "Ha comentado tu publicación." : null}
                        {n.type === "follow" ? "Ha empezado a seguirte." : null}
                      </p>
                      {n.commentPreview ? (
                        <p className="mt-1 line-clamp-2 text-xs italic text-neutral-500">
                          &quot;{n.commentPreview}&quot;
                        </p>
                      ) : null}
                      {n.postPreview && n.type !== "follow" ? (
                        <p className="mt-1 line-clamp-2 text-xs text-neutral-600">{n.postPreview}</p>
                      ) : null}
                      <time className="mt-1 block text-[10px] text-neutral-600">
                        {new Intl.DateTimeFormat("es-ES", {
                          dateStyle: "short",
                          timeStyle: "short",
                        }).format(new Date(n.createdAt))}
                      </time>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    {n.read !== true ? (
                      <button
                        type="button"
                        disabled={markBusy || markingSingleId !== null}
                        className="text-left text-[11px] font-medium uppercase tracking-wide text-neutral-500 hover:text-neutral-300 disabled:opacity-45"
                        onClick={() => void handleMarkOneRead(n.id)}
                      >
                        {markingSingleId === n.id ? "Marcando…" : "Marcar leída"}
                      </button>
                    ) : null}
                    {n.postId ? (
                      <button
                        type="button"
                        className="text-left text-[11px] font-medium uppercase tracking-wide text-goi-gold hover:underline"
                        onClick={() => handleOpenPost(n.postId)}
                      >
                        Ver publicación
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

import type { PostFormat } from "../../constants/postFormat";
import { PostFeedPreviewStandard } from "./PostFeedPreviewStandard";
import { PostFeedPreviewTraining } from "./PostFeedPreviewTraining";

type CreatePostFormatChooserProps = {
  username: string;
  avatarUrl: string;
  onSelect: (format: PostFormat) => void;
  suggestedFormat?: PostFormat;
};

const OPTIONS: { format: PostFormat; title: string; bullets: string[] }[] = [
  {
    format: "standard",
    title: "Publicación",
    bullets: [
      "Foto cuadrada obligatoria",
      "Caption bajo los iconos del feed",
      "Entreno vinculado opcional (icono mancuerna)",
    ],
  },
  {
    format: "training",
    title: "Training",
    bullets: [
      "Tarjeta de sesión como protagonista",
      "Comentario sobre el entreno",
      "Foto opcional al final del post",
    ],
  },
];

export function CreatePostFormatChooser({
  username,
  avatarUrl,
  onSelect,
  suggestedFormat,
}: CreatePostFormatChooserProps) {
  return (
    <div className="grid gap-5">
      <div className="text-center">
        <h4 className="text-lg font-bold text-neutral-100 light:text-zinc-900">Elige el formato del post</h4>
        <p className="mt-1 text-sm text-neutral-500">
          Las sesiones se registran en la app móvil; aquí puedes compartirlas en el feed.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const suggested = suggestedFormat === opt.format;
          return (
            <button
              key={opt.format}
              type="button"
              onClick={() => onSelect(opt.format)}
              className={[
                "group flex flex-col overflow-hidden rounded-2xl border text-left transition hover:border-goi-gold/45 hover:shadow-lg hover:shadow-goi-gold/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45",
                suggested ? "border-goi-gold/50 ring-1 ring-goi-gold/25" : "border-neutral-700 light:border-zinc-300",
              ].join(" ")}
            >
              <div className="pointer-events-none max-h-[min(42vh,320px)] overflow-hidden opacity-95">
                {opt.format === "standard" ? (
                  <PostFeedPreviewStandard
                    username={username}
                    avatarUrl={avatarUrl}
                    visibility="public"
                    content="Mi mejor serie del día 💪"
                    imageUrls={["data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Crect fill='%23222' width='400' height='400'/%3E%3Ctext x='50%25' y='50%25' fill='%23d4af37' font-size='20' text-anchor='middle' dy='.3em'%3EFoto%3C/text%3E%3C/svg%3E"]}
                  />
                ) : (
                  <PostFeedPreviewTraining
                    username={username}
                    avatarUrl={avatarUrl}
                    visibility="public"
                    content="¡Buen entreno!"
                    sessionId="preview"
                    workoutTitle="Push · ejemplo"
                    performedAt={new Date().toISOString()}
                    metrics={{ completedSets: 12, totalSets: 14, completedExercises: 4, totalExercises: 5 }}
                    exercisePreviews={[
                      { exerciseName: "Press banca", summary: "60 kg × 10" },
                      { exerciseName: "Remo con barra", summary: "50 kg × 10" },
                    ]}
                  />
                )}
              </div>
              <div className="border-t border-neutral-800/70 bg-neutral-950/90 p-4 light:border-zinc-200 light:bg-zinc-50">
                <div className="flex items-center justify-between gap-2">
                  <h5 className="font-bold text-neutral-100 light:text-zinc-900">{opt.title}</h5>
                  {suggested ? (
                    <span className="rounded-full bg-goi-gold/20 px-2 py-0.5 text-[10px] font-bold uppercase text-goi-gold">
                      Sugerido
                    </span>
                  ) : null}
                </div>
                <ul className="mt-2 grid gap-1 text-xs text-neutral-500">
                  {opt.bullets.map((b) => (
                    <li key={b}>· {b}</li>
                  ))}
                </ul>
                <span className="mt-3 inline-block text-sm font-semibold text-goi-gold group-hover:underline">
                  Continuar con {opt.title} →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

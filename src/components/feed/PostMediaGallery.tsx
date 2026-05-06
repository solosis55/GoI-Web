import type { PostMediaItem } from "../../types/post";

export function PostMediaGallery({ media }: { media: PostMediaItem[] }) {
  if (!media.length) return null;
  const grid =
    media.length === 1
      ? "grid-cols-1"
      : media.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  return (
    <div className={[ "mt-2.5 grid gap-1.5", grid ].join(" ")}>
      {media.map((item, index) =>
        item.type === "image" ? (
          <a
            key={`${index}-${item.url.slice(0, 32)}`}
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className="relative block overflow-hidden rounded-lg border border-neutral-800/90 bg-neutral-950/80 outline-none ring-goi-gold/30 transition hover:border-goi-gold/35 focus-visible:ring-2"
          >
            <img
              src={item.url}
              alt={`Foto ${index + 1} de la publicación`}
              loading="lazy"
              className="max-h-[min(420px,70vh)] w-full object-cover sm:max-h-[min(520px,75vh)]"
            />
          </a>
        ) : null,
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { PostMediaItem } from "../../types/post";
import { PostMediaLightbox } from "./PostMediaLightbox";
import { FeedPostImage } from "./FeedPostImage";
import { resolvePostMedia } from "../../utils/postMedia";

/** Tope para miniaturas / rejilla inline (no aplica al hero de una sola foto en feed). */
export const POST_GALLERY_IMAGE_MAX_HEIGHT_PX = 520;

export type PostMediaGalleryLayout = "inline" | "hero";

type PostMediaGalleryProps = {
  media: PostMediaItem[];
  /** `hero`: ancho completo del post, protagonista visual (feed). `inline`: bloque estándar dentro de la columna. */
  layout?: PostMediaGalleryLayout;
  /** Feed: carrusel con varias fotos, lightbox al pulsar, teclado en el visor. */
  feedInteractive?: boolean;
};

function isImage(m: PostMediaItem): m is PostMediaItem & { type: "image" } {
  return m.type === "image";
}

export function PostMediaGallery({ media, layout = "inline", feedInteractive = false }: PostMediaGalleryProps) {
  const resolvedMedia = useMemo(() => resolvePostMedia(media), [media]);
  const imageItems = useMemo(() => resolvedMedia.filter(isImage), [resolvedMedia]);
  const urls = useMemo(() => imageItems.map((i) => i.url), [imageItems]);
  const hero = layout === "hero";
  const single = resolvedMedia.length === 1;

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [carouselIdx, setCarouselIdx] = useState(0);

  const openLightbox = useCallback((i: number) => {
    if (!urls.length) return;
    setLightboxIndex(Math.min(Math.max(0, i), urls.length - 1));
    setLightboxOpen(true);
  }, [urls.length]);

  const syncCarouselFromScroll = useCallback(() => {
    const el = scrollerRef.current;
    if (!el || urls.length <= 1) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const i = Math.round(el.scrollLeft / w);
    setCarouselIdx(Math.min(urls.length - 1, Math.max(0, i)));
  }, [urls.length]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !feedInteractive || !hero || urls.length <= 1) return;
    el.addEventListener("scroll", syncCarouselFromScroll, { passive: true });
    syncCarouselFromScroll();
    return () => el.removeEventListener("scroll", syncCarouselFromScroll);
  }, [feedInteractive, hero, syncCarouselFromScroll, urls.length]);

  const goToCarouselSlide = useCallback(
    (i: number) => {
      const el = scrollerRef.current;
      if (!el) return;
      const w = el.clientWidth;
      el.scrollTo({ left: i * w, behavior: "smooth" });
    },
    [],
  );

  const carouselPrev = useCallback(() => {
    if (urls.length <= 1) return;
    const next = carouselIdx <= 0 ? urls.length - 1 : carouselIdx - 1;
    goToCarouselSlide(next);
  }, [carouselIdx, goToCarouselSlide, urls.length]);

  const carouselNext = useCallback(() => {
    if (urls.length <= 1) return;
    const next = carouselIdx >= urls.length - 1 ? 0 : carouselIdx + 1;
    goToCarouselSlide(next);
  }, [carouselIdx, goToCarouselSlide, urls.length]);

  if (!resolvedMedia.length) return null;

  /** Hero del feed: carrusel + lightbox (no enlaces directos al asset). */
  if (feedInteractive && hero && urls.length > 0) {
    const shellClass = [
      "mt-0 w-full rounded-none border-0 border-t border-neutral-800/65 bg-neutral-950/45 shadow-none light:border-zinc-200/90 light:bg-zinc-100/60",
    ].join(" ");

    const heroImgStyle: CSSProperties = {
      maxHeight: "min(92vh, 1400px)",
      width: "100%",
      height: "auto",
    };

    return (
      <>
        <div className={shellClass}>
          {urls.length === 1 ? (
            <button
              type="button"
              className="group relative block w-full cursor-zoom-in border-0 bg-neutral-950 p-0 text-left outline-none ring-goi-gold/20 transition hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:bg-zinc-100 healthy:ring-goi-gold/18 healthy:focus-visible:ring-goi-gold/34"
              onClick={() => openLightbox(0)}
              aria-label="Ampliar foto"
            >
              <FeedPostImage
                src={urls[0]}
                alt="Foto de la publicación"
                loading="lazy"
                className="block h-auto w-full max-w-full bg-neutral-950 transition duration-200 group-hover:brightness-[1.04] light:bg-zinc-100"
                style={heroImgStyle}
              />
            </button>
          ) : (
            <div className="relative">
              <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {urls.map((url, index) => (
                  <div key={`${index}-${url.slice(0, 24)}`} className="w-full shrink-0 snap-center snap-always">
                    <button
                      type="button"
                      className="group relative block w-full cursor-zoom-in border-0 bg-neutral-950 p-0 text-left outline-none ring-goi-gold/20 transition hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:bg-zinc-100 healthy:ring-goi-gold/18 healthy:focus-visible:ring-goi-gold/34"
                      onClick={() => openLightbox(index)}
                      aria-label={`Foto ${index + 1} de ${urls.length}, ampliar`}
                    >
                      <FeedPostImage
                        src={url}
                        alt={`Foto ${index + 1} de ${urls.length}`}
                        loading={index === 0 ? "eager" : "lazy"}
                        className="block h-auto w-full max-w-full bg-neutral-950 transition duration-200 group-hover:brightness-[1.04] light:bg-zinc-100"
                        style={heroImgStyle}
                      />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                aria-label="Foto anterior"
                className="absolute left-1 top-1/2 z-[1] hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-2.5 py-2 text-base text-white shadow-md backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 healthy:focus-visible:ring-goi-gold/32 sm:left-2 md:block"
                onClick={(e) => {
                  e.stopPropagation();
                  carouselPrev();
                }}
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Foto siguiente"
                className="absolute right-1 top-1/2 z-[1] hidden -translate-y-1/2 rounded-full border border-white/15 bg-black/45 px-2.5 py-2 text-base text-white shadow-md backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/45 healthy:focus-visible:ring-goi-gold/32 sm:right-2 md:block"
                onClick={(e) => {
                  e.stopPropagation();
                  carouselNext();
                }}
              >
                ›
              </button>

              <div className="flex justify-center gap-1.5 py-2.5" role="tablist" aria-label="Posición en la galería">
                {urls.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    role="tab"
                    aria-selected={i === carouselIdx}
                    aria-label={`Ir a la foto ${i + 1}`}
                    className={[
                      "h-2 rounded-full transition-[width,background] duration-200",
                      i === carouselIdx ? "w-6 bg-goi-gold/90 healthy:bg-goi-gold/[0.55]" : "w-2 bg-neutral-600 hover:bg-neutral-500 light:bg-zinc-400 healthy:hover:bg-goi-gold/30",
                    ].join(" ")}
                    onClick={() => goToCarouselSlide(i)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <PostMediaLightbox
          open={lightboxOpen}
          urls={urls}
          index={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
          onIndexChange={setLightboxIndex}
        />
      </>
    );
  }

  const heroSingle = hero && single;
  const grid =
    resolvedMedia.length === 1
      ? "grid-cols-1"
      : resolvedMedia.length === 2
        ? "grid-cols-2"
        : "grid-cols-2 sm:grid-cols-3";

  const imgContainClass =
    "mx-auto block h-auto w-full max-w-full object-contain transition duration-200 group-hover:brightness-[1.04]";

  const shellClass = hero
    ? [
        "mt-0 grid w-full",
        single ? "gap-0 p-0" : "gap-1 p-1 sm:gap-1.5 sm:p-1.5",
        "rounded-none border-0 border-t border-neutral-800/65 bg-neutral-950/45 shadow-none light:border-zinc-200/90 light:bg-zinc-100/60",
        grid,
      ].join(" ")
    : [
        single ? "mt-2 p-1 sm:p-1.5" : "mt-2 p-2 sm:p-2.5",
        "grid gap-2 sm:gap-2.5 rounded-2xl border border-neutral-800/85 bg-black/35 shadow-[inset_0_1px_0_0_rgb(255_255_255_/_0.05)] light:border-zinc-200 light:bg-zinc-50/95 light:shadow-none",
        grid,
      ].join(" ");

  const linkClassHeroSingle =
    "group relative block w-full border-0 bg-neutral-950 outline-none ring-goi-gold/20 transition hover:brightness-[1.03] focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:bg-zinc-100 healthy:ring-goi-gold/18 healthy:focus-visible:ring-goi-gold/34";

  const linkClassHeroMulti =
    "group relative flex min-h-0 w-full items-center justify-center rounded-lg border border-neutral-700/80 bg-neutral-950/90 outline-none ring-goi-gold/25 transition hover:border-goi-gold/50 hover:brightness-[1.03] hover:shadow-md focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:border-zinc-200 light:bg-zinc-100 healthy:ring-goi-gold/22 healthy:hover:border-goi-gold/34 healthy:focus-visible:ring-goi-gold/34";

  const linkClassInline =
    "group relative flex min-h-0 w-full items-center justify-center rounded-xl border border-neutral-700/85 bg-neutral-950/90 outline-none ring-goi-gold/25 transition hover:border-goi-gold/55 hover:brightness-[1.03] hover:shadow-[0_8px_28px_rgb(0_0_0_/_0.35)] focus-visible:ring-2 focus-visible:ring-goi-gold/45 light:border-zinc-200 light:bg-white light:hover:shadow-[0_8px_26px_rgb(24_24_27_/_0.09)] healthy:ring-goi-gold/22 healthy:hover:border-goi-gold/36 healthy:focus-visible:ring-goi-gold/34 healthy:hover:shadow-[0_8px_26px_rgb(95_116_107_/_0.1)]";

  return (
    <div className={shellClass}>
      {resolvedMedia.map((item, index) =>
        item.type === "image" ? (
          <a
            key={`${index}-${item.url.slice(0, 32)}`}
            href={item.url}
            target="_blank"
            rel="noreferrer noopener"
            className={
              heroSingle
                ? linkClassHeroSingle
                : hero
                  ? linkClassHeroMulti
                  : linkClassInline
            }
          >
            {heroSingle ? (
              <FeedPostImage
                src={item.url}
                alt={`Foto ${index + 1} de la publicación`}
                className="block h-auto w-full max-w-full bg-neutral-950 transition duration-200 group-hover:brightness-[1.04] light:bg-zinc-100"
                style={{
                  maxHeight: "min(92vh, 1400px)",
                  width: "100%",
                  height: "auto",
                }}
              />
            ) : (
              <FeedPostImage
                src={item.url}
                alt={`Foto ${index + 1} de la publicación`}
                className={imgContainClass}
                style={{
                  maxHeight: POST_GALLERY_IMAGE_MAX_HEIGHT_PX,
                  width: "100%",
                  height: "auto",
                  objectFit: "contain",
                }}
              />
            )}
          </a>
        ) : null,
      )}
    </div>
  );
}

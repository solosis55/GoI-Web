import { useEffect, useState, type CSSProperties } from "react";

type FeedPostImageProps = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  loading?: "eager" | "lazy";
};

export function FeedPostImage({ src, alt, className, style, loading = "lazy" }: FeedPostImageProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    return (
      <div
        className="flex min-h-[180px] items-center justify-center bg-neutral-900/80 px-4 py-8 text-center text-sm text-neutral-400 light:bg-zinc-100 light:text-zinc-600"
        role="status"
      >
        No se pudo cargar la foto. Si acabas de desplegar el servidor, vuelve a publicar la imagen.
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      className={className}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}

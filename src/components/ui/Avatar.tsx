type AvatarProps = {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
  /** Rellena el contenedor (el padre debe fijar tamaño). Útil en marcos circulares grandes. */
  fill?: boolean;
};

const FALLBACK_AVATAR = "https://via.placeholder.com/64x64";

export function Avatar({ src, alt, size = 32, className = "", fill = false }: AvatarProps) {
  return (
    <img
      src={src || FALLBACK_AVATAR}
      alt={alt}
      className={[
        "rounded-full object-cover",
        fill ? "h-full w-full min-h-0 min-w-0" : "ring-2 ring-neutral-800",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={fill ? undefined : { width: size, height: size }}
    />
  );
}

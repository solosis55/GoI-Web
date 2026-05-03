type AvatarProps = {
  src?: string;
  alt: string;
  size?: number;
  className?: string;
};

const FALLBACK_AVATAR = "https://via.placeholder.com/64x64";

export function Avatar({ src, alt, size = 32, className = "" }: AvatarProps) {
  return (
    <img
      src={src || FALLBACK_AVATAR}
      alt={alt}
      className={["rounded-full object-cover ring-2 ring-neutral-800", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    />
  );
}

import { Button } from "../ui/Button";

type PostActionsProps = {
  isOwner: boolean;
  likedByMe?: boolean;
  likesCount: number;
  onLike: () => void;
  onDelete: () => void;
  onEdit?: () => void;
  onCopyLink?: () => void;
  /** Tras copiar enlace con éxito (feedback breve en el botón). */
  linkCopied?: boolean;
};

function HeartIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      className={className}
      aria-hidden
    >
      {filled ? (
        <path
          fill="currentColor"
          d="M12 21s-6.716-5.304-9.233-8.607C.32 9.59.32 6.26 2.49 4.22 4.66 2.18 7.79 2.39 9.9 4.22L12 6.13l2.1-1.91c2.11-1.83 5.24-2.04 7.41-.02 2.17 2.02 2.17 5.35-.28 8.18C16.72 15.7 12 21 12 21Z"
        />
      ) : (
        <path
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          d="M12 21s-6.716-5.304-9.233-8.607C.32 9.59.32 6.26 2.49 4.22 4.66 2.18 7.79 2.39 9.9 4.22L12 6.13l2.1-1.91c2.11-1.83 5.24-2.04 7.41-.02 2.17 2.02 2.17 5.35-.28 8.18C16.72 15.7 12 21 12 21Z"
        />
      )}
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M5 13.5 9.5 18 19 6"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function PostActions({
  isOwner,
  likedByMe,
  likesCount,
  onLike,
  onDelete,
  onEdit,
  onCopyLink,
  linkCopied = false,
}: PostActionsProps) {
  return (
    <div className="actions flex flex-wrap gap-2">
      <Button
        type="button"
        variant="secondary"
        onClick={onLike}
        aria-pressed={!!likedByMe}
        aria-label={
          likedByMe
            ? `Quitar tu me gusta. Total: ${likesCount}.`
            : `Dar me gusta. Actualmente ${likesCount}.`
        }
        className={
          likedByMe
            ? "!inline-flex !items-center !gap-1.5 !border-goi-gold/45 !bg-goi-gold/15 !text-goi-gold hover:!border-goi-gold/65"
            : "!inline-flex !items-center !gap-1.5"
        }
      >
        <HeartIcon filled={!!likedByMe} className="size-4 shrink-0 text-current opacity-95" />
        <span>{likesCount}</span>
      </Button>
      {isOwner && (
        <>
          {onCopyLink ? (
            <Button
              type="button"
              variant="secondary"
              className="!inline-flex !items-center !gap-1 !py-1.5 !text-xs"
              onClick={onCopyLink}
            >
              {linkCopied ? (
                <>
                  <CheckIcon className="size-3.5 text-emerald-400" />
                  Listo
                </>
              ) : (
                "Copiar enlace"
              )}
            </Button>
          ) : null}
          {onEdit ? (
            <Button type="button" variant="secondary" className="!py-1.5 !text-xs" onClick={onEdit}>
              Editar
            </Button>
          ) : null}
          <Button type="button" variant="danger" className="!py-1.5 !text-xs" onClick={onDelete}>
            Eliminar
          </Button>
        </>
      )}
    </div>
  );
}

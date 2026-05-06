function InboxQuietIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M21 13.5v-4a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v4l2.76 4.94A2 2 0 0 0 9.74 21h4.52a2 2 0 0 0 1.98-1.56L21 13.5Z" />
      <path d="M3 13.5h6.14a3 3 0 0 1 5.72 0H21" />
    </svg>
  );
}

type EmptyStateProps = {
  message: string;
  className?: string;
  /** Tarjeta con ícono (p. ej. feed vacío). */
  showIcon?: boolean;
};

export function EmptyState({ message, className = "", showIcon = false }: EmptyStateProps) {
  if (showIcon) {
    return (
      <div
        className={[
          "rounded-lg border border-dashed border-neutral-700/75 bg-neutral-950/35 px-4 py-8 text-center",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <InboxQuietIcon className="mx-auto mb-3 size-11 text-neutral-600" aria-hidden />
        <p className="text-sm text-neutral-500">{message}</p>
      </div>
    );
  }

  return <p className={["empty-state text-neutral-500", className].filter(Boolean).join(" ")}>{message}</p>;
}

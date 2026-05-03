type EmptyStateProps = {
  message: string;
  className?: string;
};

export function EmptyState({ message, className = "" }: EmptyStateProps) {
  return <p className={["empty-state text-neutral-500", className].filter(Boolean).join(" ")}>{message}</p>;
}

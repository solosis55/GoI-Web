import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
  id?: string;
  tone?: "light" | "dark";
  as?: "section" | "article" | "aside" | "div";
};

export function Card({ children, className = "", id, tone = "light", as = "section" }: CardProps) {
  const Component = as;
  const toneClasses =
    tone === "dark"
      ? "card-dark border-neutral-800 bg-zinc-950 text-neutral-200 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.08)]"
      : "border-neutral-700 bg-zinc-900 text-neutral-200 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.05)]";
  const classes = ["card rounded-[10px] border p-4", toneClasses, className].filter(Boolean).join(" ");

  return (
    <Component className={classes} id={id}>
      {children}
    </Component>
  );
}

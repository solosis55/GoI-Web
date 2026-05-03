import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "navActive" | "link" | "linkDark";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
};

const variantClassMap: Record<ButtonVariant, string> = {
  primary:
    "border-goi-gold-dim bg-goi-gold font-semibold text-neutral-950 hover:brightness-[1.06] border",
  secondary:
    "secondary border-neutral-700 bg-neutral-100 text-neutral-950 hover:bg-white hover:border-neutral-500",
  danger: "danger bg-red-700 border-red-700 text-white hover:bg-red-800",
  navActive:
    "nav-active border-goi-gold-dim bg-goi-gold font-semibold text-neutral-950 hover:brightness-[1.07]",
  link: "link-btn mt-3 w-full bg-transparent border-transparent text-goi-gold hover:bg-neutral-900/70 hover:text-yellow-400",
  linkDark:
    "link-btn mt-3 w-full bg-transparent border-transparent text-goi-steel hover:bg-neutral-950/70 hover:text-goi-gold",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  const variantClass = variantClassMap[variant];
  const baseClasses =
    "inline-flex items-center justify-center rounded-lg border px-3 py-2 font-inherit transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/50 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:cursor-not-allowed disabled:opacity-70";
  const classes = [baseClasses, variantClass, className].filter(Boolean).join(" ");

  return (
    <button {...props} className={classes}>
      {children}
    </button>
  );
}

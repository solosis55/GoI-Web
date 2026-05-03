const TRELLO_ROADMAP = "https://trello.com/b/6Yn18TWn/red-social-goi";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="site-footer border-t border-neutral-900 bg-black px-4 py-6 text-sm text-neutral-500 max-md:px-2.5">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="min-w-0">
          <p className="font-medium text-neutral-400">
            © {year} FitSocial · GoI
          </p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-600">
            Red social y seguimiento de entrenos. Uso educativo / MVP; revisa las políticas de tu despliegue antes de datos reales.
          </p>
        </div>

        <nav
          className="flex flex-wrap items-center gap-x-5 gap-y-2 text-neutral-400"
          aria-label="Pie de página"
        >
          <a
            className="transition-colors hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
            href={TRELLO_ROADMAP}
            target="_blank"
            rel="noreferrer noopener"
          >
            Roadmap
          </a>
          <span className="text-neutral-700" aria-hidden>
            ·
          </span>
          <span className="text-neutral-500" title="Página en preparación">
            Aviso legal
          </span>
          <span className="text-neutral-700" aria-hidden>
            ·
          </span>
          <span className="text-neutral-500" title="Página en preparación">
            Privacidad
          </span>
          <span className="text-neutral-700" aria-hidden>
            ·
          </span>
          <span className="text-neutral-500" title="Página en preparación">
            Contacto
          </span>
        </nav>
      </div>
    </footer>
  );
}

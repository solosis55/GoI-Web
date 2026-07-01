import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { ThemeModePicker } from "../components/ui/ThemeModePicker";

type SettingsPageProps = {
  onGoToProfile: () => void;
};

export function SettingsPage({ onGoToProfile }: SettingsPageProps) {
  return (
    <section className="mx-auto w-full max-w-3xl space-y-6 pb-16">
      <header className="feed-page-header relative overflow-hidden rounded-2xl border border-neutral-800/75 bg-linear-to-b from-neutral-950 via-neutral-950 to-neutral-950/90 px-4 py-5 shadow-[0_14px_44px_-20px_rgba(0,0,0,0.65)] sm:px-6 sm:py-6 light:border-zinc-200/90 light:from-white light:via-white light:to-zinc-50">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-goi-gold-dim">Preferencias</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-50 light:text-zinc-900">Ajustes</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-neutral-400 light:text-zinc-600">
          Personaliza la experiencia, revisa enlaces legales y accesos rápidos. Los cambios de tema se guardan en este
          dispositivo.
        </p>
      </header>

      <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
        <h2 className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">Apariencia</h2>
        <div className="mt-4 space-y-4 border-t border-neutral-800/80 pt-4 light:border-zinc-200">
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-200 light:text-zinc-900">Tema</p>
            <p className="mt-0.5 text-xs text-neutral-500 light:text-zinc-600">
              Temas claros (Encendido, Healthy) y oscuros (Legacy, Neon); elige el que prefieras.
            </p>
          </div>
          <ThemeModePicker />
        </div>
      </Card>

      <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
        <h2 className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">Cuenta y perfil</h2>
        <p className="mt-1 text-sm text-neutral-500 light:text-zinc-600">
          Nombre de usuario, bio, foto y correo se gestionan desde tu perfil.
        </p>
        <Button type="button" variant="secondary" className="mt-4 w-full sm:w-auto" onClick={onGoToProfile}>
          Ir al perfil
        </Button>
      </Card>

      <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
        <h2 className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">Notificaciones</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-500 light:text-zinc-600">
          Las alertas del feed (likes, comentarios, nuevos seguidores) aparecen en la campana del Inicio. Podrás definir
          preferencias más finas cuando integremos correo y push.
        </p>
      </Card>

      <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
        <h2 className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">Privacidad y datos</h2>
        <ul className="mt-3 list-none space-y-2 p-0 text-sm">
          <li>
            <Link
              to="/privacidad"
              className="font-medium text-goi-gold underline-offset-4 hover:underline light:text-goi-gold-dim healthy:text-goi-gold-dim"
            >
              Política de privacidad
            </Link>
            <span className="text-neutral-500 light:text-zinc-600"> · cómo tratamos tus datos.</span>
          </li>
          <li>
            <Link
              to="/aviso-legal"
              className="font-medium text-goi-gold underline-offset-4 hover:underline light:text-goi-gold-dim healthy:text-goi-gold-dim"
            >
              Aviso legal
            </Link>
          </li>
          <li>
            <Link
              to="/contacto"
              className="font-medium text-goi-gold underline-offset-4 hover:underline light:text-goi-gold-dim healthy:text-goi-gold-dim"
            >
              Contacto
            </Link>
          </li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-neutral-500 light:text-zinc-600">
          Exportación o borrado completo de cuenta: disponible más adelante; mientras tanto puedes ajustar visibilidad de
          publicaciones desde cada post.
        </p>
      </Card>

      <Card tone="dark" className="border-neutral-800/70 light:border-zinc-200">
        <h2 className="mt-0 text-sm font-semibold text-neutral-100 light:text-zinc-900">Acerca de</h2>
        <p className="mt-2 text-sm text-neutral-500 light:text-zinc-600">
          GoI · cliente web ({import.meta.env.MODE === "production" ? "producción" : "desarrollo"})
        </p>
      </Card>
    </section>
  );
}

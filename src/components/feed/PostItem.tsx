import { useEffect, useState } from "react";
import { PostActions } from "./PostActions";
import { CommentList } from "./CommentList";
import { MentionComposer } from "./MentionComposer";
import { Avatar } from "../ui/Avatar";
import { PostMediaGallery } from "./PostMediaGallery";
import type { Post } from "../../types/post";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import type { MentionUserDirectory } from "../../utils/mentionText";
import { visibilityBadgeClasses } from "../../utils/visibilityBadgeClasses";
import { formatPostAbsolute, formatPostRelative } from "../../utils/feedPostDate";
import { hasDisplayableMedia } from "../../utils/postMedia";
import { PostFeedText } from "./PostFeedText";
import { FeedPostOverflowMenu } from "./FeedPostOverflowMenu";
import { usePostMediaHydration } from "../../hooks/usePostMediaHydration";

type PostItemProps = {
  post: Post;
  isOwner: boolean;
  currentUserId?: string;
  commentValue: string;
  onChangeComment: (value: string) => void;
  onLike: () => void;
  onDelete: () => void;
  onUpdate?: (postId: string, input: { content: string; visibility: "public" | "followers" | "private" }) => void;
  onComment: () => void;
  getWorkoutTitle: (workoutId: string | null) => string | null;
  onOpenUserProfile?: (userId: string) => void;
  mentionCandidates: MentionPickUser[];
  mentionDirectory: MentionUserDirectory;
  onMentionPick?: (picked: MentionPickUser) => void;
  /** Destaca la tarjeta tras scroll por enlace (`?post=`). */
  emphasized?: boolean;
  /** Tras copiar URL del post (solo propio). */
  onPostLinkCopied?: () => void;
  /** Ese usuario te sigue (mutuo contexto social). */
  authorFollowsYou?: boolean;
  saved?: boolean;
  onToggleSave?: () => void;
  onMuteAuthor?: () => void;
  onReport?: () => void;
};

function DumbbellIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        d="M4 14V10M20 14V10M7 17V7M17 17V7"
      />
      <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M7 10h10M7 14h10" />
    </svg>
  );
}

export function PostItem({
  post,
  isOwner,
  currentUserId,
  commentValue,
  onChangeComment,
  onLike,
  onDelete,
  onUpdate,
  onComment,
  getWorkoutTitle,
  onOpenUserProfile,
  mentionCandidates,
  mentionDirectory,
  onMentionPick,
  emphasized = false,
  onPostLinkCopied,
  authorFollowsYou = false,
  saved = false,
  onToggleSave,
  onMuteAuthor,
  onReport,
}: PostItemProps) {
  const displayPost = usePostMediaHydration(post);
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState<"public" | "followers" | "private">(post.visibility ?? "public");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const visibility = post.visibility ?? "public";
  const visibilityLabel =
    visibility === "public" ? "Público" : visibility === "followers" ? "Seguidores" : "Solo yo";

  const commentsCount = post.comments.length;

  function startEdit() {
    setEditContent(post.content);
    setEditVisibility(visibility);
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditContent(post.content);
    setEditVisibility(visibility);
  }

  function submitEdit() {
    const trimmed = editContent.trim();
    const hasPhotos = (post.media?.length ?? 0) > 0;
    if (!onUpdate) return;
    if (trimmed.length > 280) return;
    if (!hasPhotos && trimmed.length < 4) return;
    onUpdate(post.id, { content: trimmed, visibility: editVisibility });
    setEditing(false);
  }

  useEffect(() => {
    if (editing) return;
    setEditContent(post.content);
    setEditVisibility(visibility);
  }, [editing, post.content, visibility]);

  useEffect(() => {
    if (!linkCopied) return;
    const t = window.setTimeout(() => setLinkCopied(false), 2200);
    return () => window.clearTimeout(t);
  }, [linkCopied]);

  useEffect(() => {
    if (commentsOpen) setComposerExpanded(true);
  }, [commentsOpen]);

  const hasMedia = hasDisplayableMedia(displayPost);
  const showComposerMobile =
    composerExpanded || commentValue.trim().length > 0;

  async function handleCopyPostLink() {
    try {
      const url = `${window.location.origin}${window.location.pathname}?post=${encodeURIComponent(post.id)}`;
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      onPostLinkCopied?.();
    } catch {
      /* permisos o navegador sin clipboard */
    }
  }

  const hoverLift = emphasized
    ? ""
    : "lg:hover:-translate-y-px lg:hover:shadow-[0_14px_44px_rgb(0_0_0_/_0.48)] light:lg:hover:shadow-[0_12px_36px_rgb(24_24_27_/_0.11)]";

  return (
    <li
      id={`feed-post-${post.id}`}
      className={`feed-post-card flex flex-col overflow-hidden rounded-2xl border transition-[box-shadow,ring,transform] duration-300 max-lg:hover:translate-y-0 max-lg:hover:shadow-none ${hoverLift} ${
        emphasized
          ? "ring-2 ring-goi-gold/50 ring-offset-2 ring-offset-black light:ring-offset-zinc-100"
          : ""
      }`}
    >
      {/* Cabecera compacta + acciones (la foto hero va debajo y ocupa el ancho del post). */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5 sm:p-5 sm:pb-3">
        <div className="flex min-w-0 flex-1 gap-3.5">
          <div className="shrink-0 pt-1">
            {onOpenUserProfile ? (
              <button
                type="button"
                aria-label={`Perfil de @${post.authorUsername}`}
                className="rounded-full outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-goi-gold/40 light:ring-offset-zinc-100"
                onClick={() => onOpenUserProfile(post.userId)}
              >
                <Avatar src={post.authorAvatarUrl} alt={post.authorUsername} size={46} />
              </button>
            ) : (
              <Avatar src={post.authorAvatarUrl} alt={post.authorUsername} size={46} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-neutral-800/40 pb-3 light:border-zinc-200/75">
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2.5 gap-y-1">
              {onOpenUserProfile ? (
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(post.userId)}
                  className="rounded-sm text-left underline-offset-4 hover:text-goi-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
                >
                  <span className="text-[15px] font-semibold tracking-tight text-neutral-100 light:text-zinc-900">
                    {post.authorUsername}
                    {isOwner ? <span className="font-normal text-neutral-500"> (tu)</span> : null}
                  </span>
                </button>
              ) : (
                <span className="text-[15px] font-semibold tracking-tight text-neutral-100 light:text-zinc-900">
                  {post.authorUsername}
                  {isOwner ? <span className="font-normal text-neutral-500"> (tu)</span> : null}
                </span>
              )}
              {!isOwner && authorFollowsYou ? (
                <span className="rounded-full border border-goi-gold/35 bg-goi-gold/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-goi-gold light:border-goi-gold/40 healthy:border-goi-gold/32 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.09] light:text-goi-gold-dim healthy:text-goi-gold-dim">
                  Te sigue
                </span>
              ) : null}
              <span className="text-neutral-600 max-[379px]:hidden">·</span>
              <time
                className="text-[13px] tabular-nums text-neutral-500 light:text-zinc-500"
                dateTime={post.createdAt}
                title={formatPostAbsolute(post.createdAt)}
              >
                {formatPostRelative(post.createdAt)}
              </time>
              <span
                className={[
                  "inline-flex scale-[0.96] items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide opacity-90",
                  visibilityBadgeClasses(visibility),
                ].join(" ")}
                title={
                  visibilityLabel === "Solo yo"
                    ? "Visible solo para ti"
                    : visibilityLabel === "Seguidores"
                      ? "Visible para tus seguidores"
                      : "Visible para todos"
                }
              >
                {visibilityLabel}
              </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:self-start sm:pt-1">
          <PostActions likedByMe={post.likedByMe} likesCount={post.likesCount} onLike={onLike} />
          {currentUserId && onToggleSave ? (
            <FeedPostOverflowMenu
              disabled={false}
              isSaved={saved}
              isOwner={isOwner}
              authorUsername={post.authorUsername}
              onToggleSave={onToggleSave}
              onMuteAuthor={!isOwner && onMuteAuthor ? onMuteAuthor : undefined}
              onReport={!isOwner && onReport ? onReport : undefined}
              onCopyLink={isOwner ? () => void handleCopyPostLink() : undefined}
              onEdit={isOwner && onUpdate ? startEdit : undefined}
              onDelete={isOwner ? onDelete : undefined}
              linkCopied={linkCopied}
            />
          ) : null}
        </div>
      </div>

      {!editing && hasMedia ? (
        <PostMediaGallery layout="hero" media={displayPost.media ?? []} feedInteractive />
      ) : null}

      <div
        className={`space-y-3 px-4 pb-4 sm:px-5 sm:pb-5 ${
          hasMedia && !editing ? "pt-4 sm:pt-5" : "pt-1 sm:pt-2"
        }`}
      >
        {editing ? (
          <div className="grid gap-2">
            <textarea
              className="goi-field min-h-[88px]"
              maxLength={280}
              value={editContent}
              onChange={(event) => setEditContent(event.target.value)}
              placeholder="Texto opcional si hay fotos (máx. 280 caracteres)."
            />
            {displayPost.media && displayPost.media.length > 0 ? (
              <PostMediaGallery media={displayPost.media} layout="inline" />
            ) : null}
            <div className="flex flex-wrap items-center gap-2 max-[479px]:grid max-[479px]:grid-cols-1">
              <select
                className="goi-field max-w-[180px] max-[479px]:max-w-none"
                value={editVisibility}
                onChange={(event) =>
                  setEditVisibility(event.target.value as "public" | "followers" | "private")
                }
              >
                <option value="public">Público</option>
                <option value="followers">Seguidores</option>
                <option value="private">Solo yo</option>
              </select>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide text-goi-gold hover:underline"
                onClick={submitEdit}
              >
                Guardar
              </button>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-300 light:text-zinc-600 light:hover:text-zinc-800"
                onClick={cancelEdit}
              >
                Cancelar
              </button>
              <span className="text-xs text-neutral-500">{editContent.trim().length}/280</span>
            </div>
          </div>
        ) : (
          <>
            <PostFeedText
              content={post.content}
              mentionDirectory={mentionDirectory}
              onOpenProfile={onOpenUserProfile}
            />
          </>
        )}

        {post.workoutId ? (
          <div className="flex w-full max-w-full flex-col items-start gap-1.5 rounded-2xl border border-goi-gold/30 bg-goi-gold/[0.09] px-3 py-2 text-xs shadow-[inset_0_1px_0_0_rgba(212,175,55,0.12)] sm:inline-flex sm:w-auto sm:max-w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:rounded-full sm:py-1.5 light:border-goi-gold/35 light:bg-goi-gold/[0.1] healthy:bg-goi-gold/[0.08]">
            <span className="inline-flex shrink-0 items-center gap-2">
              <DumbbellIcon className="size-4 shrink-0 text-goi-gold" />
              <span className="font-semibold uppercase tracking-wide text-[10px] text-goi-gold-dim">Rutina</span>
            </span>
            <span className="hidden text-neutral-600 sm:inline">·</span>
            <span className="w-full min-w-0 font-medium leading-snug text-neutral-100 sm:w-auto sm:truncate light:text-zinc-900">
              {getWorkoutTitle(post.workoutId)}
            </span>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-neutral-800/45 pt-4 text-[13px] tabular-nums leading-snug text-neutral-400 light:border-zinc-200/70 light:text-zinc-600">
          <span className="font-medium text-neutral-300 light:text-zinc-700">
            {post.likesCount === 1 ? "1 me gusta" : `${post.likesCount} me gusta`}
          </span>
          <span className="text-neutral-600 opacity-80 light:text-zinc-400" aria-hidden>
            ·
          </span>
          {commentsCount > 0 ? (
            <button
              type="button"
              className="font-semibold text-neutral-400 underline-offset-[3px] transition hover:text-goi-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 light:text-zinc-600 light:hover:text-amber-800 healthy:hover:text-goi-gold-dim"
              onClick={() => setCommentsOpen((o) => !o)}
              aria-expanded={commentsOpen}
            >
              {commentsOpen
                ? "Ocultar comentarios"
                : `${commentsCount} ${commentsCount === 1 ? "comentario" : "comentarios"}`}
            </button>
          ) : (
            <span className="text-neutral-500 light:text-zinc-500">Sin comentarios</span>
          )}
        </div>

        {commentsCount > 0 && commentsOpen ? (
          <CommentList
            comments={post.comments}
            currentUserId={currentUserId}
            mentionDirectory={mentionDirectory}
            onOpenUserProfile={onOpenUserProfile}
          />
        ) : null}

        {!showComposerMobile ? (
          <button
            type="button"
            className="mt-1 w-full rounded-xl border border-neutral-800/70 bg-black/20 py-2.5 text-sm font-medium text-neutral-300 hover:border-goi-gold/35 hover:bg-black/30 hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35 sm:hidden light:border-zinc-200 light:bg-white light:text-zinc-800 light:hover:bg-zinc-50"
            onClick={() => setComposerExpanded(true)}
          >
            Comentar
          </button>
        ) : null}

        <div className={showComposerMobile ? "mt-4 block" : "mt-4 hidden sm:block"}>
          <MentionComposer
            value={commentValue}
            onChange={onChangeComment}
            onSubmit={onComment}
            candidates={mentionCandidates}
            onMentionPick={onMentionPick}
          />
        </div>
      </div>
    </li>
  );
}

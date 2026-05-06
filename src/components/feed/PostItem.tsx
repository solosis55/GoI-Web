import { useEffect, useState } from "react";
import { PostActions } from "./PostActions";
import { CommentList } from "./CommentList";
import { MentionComposer } from "./MentionComposer";
import { Avatar } from "../ui/Avatar";
import { PostMediaGallery } from "./PostMediaGallery";
import type { Post } from "../../types/post";
import type { MentionPickUser } from "../../utils/mentionAutocomplete";
import type { MentionUserDirectory } from "../../utils/mentionText";
import { MentionHighlighted } from "../../utils/mentionText";

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
  formatDate: (value: string) => string;
  onOpenUserProfile?: (userId: string) => void;
  mentionCandidates: MentionPickUser[];
  mentionDirectory: MentionUserDirectory;
  /** Destaca la tarjeta tras scroll por enlace (`?post=`). */
  emphasized?: boolean;
  /** Tras copiar URL del post (solo propio). */
  onPostLinkCopied?: () => void;
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
  formatDate,
  onOpenUserProfile,
  mentionCandidates,
  mentionDirectory,
  emphasized = false,
  onPostLinkCopied,
}: PostItemProps) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState<"public" | "followers" | "private">(post.visibility ?? "public");
  const [commentsOpen, setCommentsOpen] = useState(false);
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

  return (
    <li
      id={`feed-post-${post.id}`}
      className={`feed-post-card flex flex-col gap-4 rounded-lg border border-neutral-800 bg-black/60 p-3 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.06)] transition-[box-shadow,ring] duration-300 sm:flex-row sm:items-start sm:justify-between sm:gap-4 ${
        emphasized ? "ring-2 ring-goi-gold/50 ring-offset-2 ring-offset-black" : ""
      }`}
    >
      <div className="flex min-w-0 flex-1 gap-3">
        <div className="shrink-0 pt-0.5">
          {onOpenUserProfile ? (
            <button
              type="button"
              aria-label={`Perfil de @${post.authorUsername}`}
              className="rounded-full outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-goi-gold/40"
              onClick={() => onOpenUserProfile(post.userId)}
            >
              <Avatar src={post.authorAvatarUrl} alt={post.authorUsername} size={46} />
            </button>
          ) : (
            <Avatar src={post.authorAvatarUrl} alt={post.authorUsername} size={46} />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            {onOpenUserProfile ? (
              <button
                type="button"
                onClick={() => onOpenUserProfile(post.userId)}
                className="rounded-sm text-left underline-offset-4 hover:text-goi-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
              >
                <strong className="text-neutral-100">
                  {post.authorUsername}
                  {isOwner ? " (tu)" : ""}
                </strong>
              </button>
            ) : (
              <strong className="text-neutral-100">
                {post.authorUsername}
                {isOwner ? " (tu)" : ""}
              </strong>
            )}
            <span className="text-neutral-600">·</span>
            <time className="text-xs text-neutral-500">{formatDate(post.createdAt)}</time>
            <span
              className="inline-flex items-center rounded-full border border-neutral-600 bg-neutral-900/70 px-2 py-0.5 text-[10px] font-medium text-neutral-400"
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

          {editing ? (
            <div className="grid gap-2">
              <textarea
                className="goi-field min-h-[88px]"
                maxLength={280}
                value={editContent}
                onChange={(event) => setEditContent(event.target.value)}
                placeholder="Texto opcional si hay fotos (máx. 280 caracteres)."
              />
              {post.media && post.media.length > 0 ? <PostMediaGallery media={post.media} /> : null}
              <div className="flex flex-wrap items-center gap-2">
                <select
                  className="goi-field max-w-[180px]"
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
                  className="text-xs font-semibold uppercase tracking-wide text-neutral-500 hover:text-neutral-300"
                  onClick={cancelEdit}
                >
                  Cancelar
                </button>
                <span className="text-xs text-neutral-500">{editContent.trim().length}/280</span>
              </div>
            </div>
          ) : (
            <>
              {post.content.trim() ? (
                <div className="whitespace-pre-wrap text-goi-steel leading-relaxed">
                  <MentionHighlighted
                    text={post.content}
                    userDirectory={mentionDirectory}
                    onOpenProfile={onOpenUserProfile}
                  />
                </div>
              ) : null}
              <PostMediaGallery media={post.media ?? []} />
            </>
          )}
          {post.workoutId ? (
            <div className="mt-1 inline-flex max-w-full flex-wrap items-center gap-2 rounded-lg border border-goi-gold/25 bg-goi-gold/[0.07] px-2.5 py-1.5 text-xs shadow-[inset_0_1px_0_0_rgba(212,175,55,0.08)]">
              <DumbbellIcon className="size-4 shrink-0 text-goi-gold-dim" />
              <span className="font-semibold uppercase tracking-wide text-[10px] text-goi-gold-dim">Rutina</span>
              <span className="text-neutral-600">·</span>
              <span className="truncate text-neutral-200">{getWorkoutTitle(post.workoutId)}</span>
            </div>
          ) : null}

          {commentsCount > 0 ? (
            <button
              type="button"
              className="rounded-sm text-left text-[11px] font-semibold uppercase tracking-wide text-goi-gold-dim hover:text-goi-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
              onClick={() => setCommentsOpen((o) => !o)}
              aria-expanded={commentsOpen}
            >
              {commentsOpen
                ? "Ocultar comentarios"
                : `Ver ${commentsCount} ${commentsCount === 1 ? "comentario" : "comentarios"}`}
            </button>
          ) : null}

          {commentsCount > 0 && commentsOpen ? (
            <CommentList
              comments={post.comments}
              currentUserId={currentUserId}
              mentionDirectory={mentionDirectory}
              onOpenUserProfile={onOpenUserProfile}
            />
          ) : null}

          <MentionComposer
            value={commentValue}
            onChange={onChangeComment}
            onSubmit={onComment}
            candidates={mentionCandidates}
          />
        </div>
      </div>

      <div className="w-full shrink-0 sm:w-auto sm:self-start sm:pt-0.5">
        <PostActions
          isOwner={isOwner}
          likedByMe={post.likedByMe}
          likesCount={post.likesCount}
          onLike={onLike}
          onDelete={onDelete}
          onEdit={isOwner ? startEdit : undefined}
          onCopyLink={isOwner ? () => void handleCopyPostLink() : undefined}
          linkCopied={linkCopied}
        />
      </div>
    </li>
  );
}

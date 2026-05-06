import type { PostComment } from "../../types/post";
import { MentionHighlighted, type MentionUserDirectory } from "../../utils/mentionText";
import { Avatar } from "../ui/Avatar";

type CommentListProps = {
  comments: PostComment[];
  currentUserId?: string;
  mentionDirectory: MentionUserDirectory;
  onOpenUserProfile?: (userId: string) => void;
};

export function CommentList({ comments, currentUserId, mentionDirectory, onOpenUserProfile }: CommentListProps) {
  return (
    <ul className="my-2 list-none space-y-2.5 border-l-2 border-goi-gold/20 pl-3">
      {comments.map((comment) => (
        <li key={comment.id} className="flex gap-2.5 text-[13px] leading-snug">
          {onOpenUserProfile ? (
            <button
              type="button"
              aria-label={`Perfil de @${comment.authorUsername}`}
              className="mt-0.5 shrink-0 rounded-full outline-none ring-offset-2 ring-offset-black focus-visible:ring-2 focus-visible:ring-goi-gold/40"
              onClick={() => onOpenUserProfile(comment.userId)}
            >
              <Avatar
                src={comment.authorAvatarUrl}
                alt={comment.authorUsername}
                size={32}
                className="ring-goi-gold/15"
              />
            </button>
          ) : (
            <Avatar
              src={comment.authorAvatarUrl}
              alt={comment.authorUsername}
              size={32}
              className="mt-0.5 shrink-0 ring-goi-gold/15"
            />
          )}
          <div className="min-w-0 flex-1 text-neutral-400">
            <div>
              {onOpenUserProfile ? (
                <button
                  type="button"
                  onClick={() => onOpenUserProfile(comment.userId)}
                  className="font-medium text-neutral-300 underline-offset-4 hover:text-goi-gold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-goi-gold/35"
                >
                  {comment.authorUsername}
                </button>
              ) : (
                <span className="font-medium text-neutral-300">{comment.authorUsername}</span>
              )}
              {comment.userId === currentUserId ? <span className="text-neutral-500"> (tu)</span> : null}
              <span className="text-neutral-500"> · </span>
              <MentionHighlighted
                text={comment.content}
                userDirectory={mentionDirectory}
                onOpenProfile={onOpenUserProfile}
                className="whitespace-pre-wrap"
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

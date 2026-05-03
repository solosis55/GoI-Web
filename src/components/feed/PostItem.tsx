import { PostActions } from "./PostActions";
import { CommentList } from "./CommentList";
import { PostComposer } from "./PostComposer";
import type { Post } from "../../types/post";

type PostItemProps = {
  post: Post;
  isOwner: boolean;
  currentUserId?: string;
  commentValue: string;
  onChangeComment: (value: string) => void;
  onLike: () => void;
  onDelete: () => void;
  onComment: () => void;
  getWorkoutTitle: (workoutId: string | null) => string | null;
  formatDate: (value: string) => string;
};

export function PostItem({
  post,
  isOwner,
  currentUserId,
  commentValue,
  onChangeComment,
  onLike,
  onDelete,
  onComment,
  getWorkoutTitle,
  formatDate,
}: PostItemProps) {
  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-neutral-800 bg-black/60 p-3 shadow-[inset_0_1px_0_0_rgba(212,175,55,0.06)] max-md:flex-col">
      <div>
        <strong className="text-neutral-100">
          {post.authorUsername}
          {isOwner ? " (tu)" : ""}
        </strong>
        <p className="mt-2 text-neutral-500">{formatDate(post.createdAt)}</p>
        <p className="text-goi-steel">{post.content}</p>
        {post.workoutId && <small className="text-neutral-400">Entrenamiento: {getWorkoutTitle(post.workoutId)}</small>}
        <p className="mt-2 text-neutral-500">Likes: {post.likesCount}</p>
        <CommentList comments={post.comments} currentUserId={currentUserId} />
        <PostComposer value={commentValue} onChange={onChangeComment} onSubmit={onComment} />
      </div>
      <PostActions isOwner={isOwner} onLike={onLike} onDelete={onDelete} />
    </li>
  );
}

import type { PostComment } from "../../types/post";

type CommentListProps = {
  comments: PostComment[];
  currentUserId?: string;
};

export function CommentList({ comments, currentUserId }: CommentListProps) {
  return (
    <ul className="my-2 list-disc pl-4">
      {comments.map((comment) => (
        <li key={comment.id}>
          <small className="text-neutral-400">
            {comment.authorUsername}
            {comment.userId === currentUserId ? " (tu)" : ""}: {comment.content}
          </small>
        </li>
      ))}
    </ul>
  );
}

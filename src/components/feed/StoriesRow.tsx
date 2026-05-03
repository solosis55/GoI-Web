import { Avatar } from "../ui/Avatar";
import type { Post } from "../../types/post";

type StoriesRowProps = {
  posts: Post[];
  /** Smaller avatars and tighter spacing for compact cards. */
  compact?: boolean;
};

export function StoriesRow({ posts, compact }: StoriesRowProps) {
  const gap = compact ? "gap-1.5" : "gap-2";
  const avatar = compact ? 30 : 34;
  const cell = compact ? "min-w-[48px] gap-0.5" : "min-w-[52px] gap-1";
  return (
    <div className="flex w-full justify-center">
      <div className={["inline-flex max-w-full overflow-x-auto pb-0.5 pt-0.5 [scrollbar-gutter:stable]", gap].join(" ")}>
        {posts.slice(0, 8).map((post) => (
          <div key={`story-${post.id}`} className={["grid shrink-0 place-items-center", cell].join(" ")}>
            <div className="rounded-full border border-goi-gold-dim p-0.5 shadow-[0_0_8px_-3px_rgba(212,175,55,0.38)]">
              <Avatar src={post.authorAvatarUrl} alt={post.authorUsername} size={avatar} />
            </div>
            <small className="max-w-[4.25rem] truncate text-center text-[11px] leading-tight text-neutral-400">
              {post.authorUsername}
            </small>
          </div>
        ))}
      </div>
    </div>
  );
}

import type { DiscoverUser } from "../../types/auth";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

type FollowSuggestionItemProps = {
  user: DiscoverUser;
  isFollowing: boolean;
  onToggleFollow: (targetUserId: string) => void;
};

export function FollowSuggestionItem({ user, isFollowing, onToggleFollow }: FollowSuggestionItemProps) {
  return (
    <li className="flex items-center gap-2.5">
      <Avatar src={user.avatarUrl} alt={user.username} size={32} />
      <span className="text-goi-steel">{user.username}</span>
      <Button type="button" variant="secondary" onClick={() => onToggleFollow(user.id)}>
        {isFollowing ? "Siguiendo" : "Seguir"}
      </Button>
    </li>
  );
}

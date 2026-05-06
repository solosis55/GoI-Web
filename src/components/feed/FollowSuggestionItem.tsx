import type { DiscoverUser } from "../../types/auth";
import { Avatar } from "../ui/Avatar";
import { Button } from "../ui/Button";

type FollowSuggestionItemProps = {
  user: DiscoverUser;
  isFollowing: boolean;
  onToggleFollow: (targetUserId: string) => void;
  onViewProfile?: (userId: string) => void;
};

export function FollowSuggestionItem({ user, isFollowing, onToggleFollow, onViewProfile }: FollowSuggestionItemProps) {
  return (
    <li className="flex flex-wrap items-center gap-2">
      <Avatar src={user.avatarUrl} alt={user.username} size={32} />
      <span className="min-w-0 flex-1 truncate text-goi-steel">{user.username}</span>
      {onViewProfile ? (
        <Button type="button" variant="secondary" className="!py-1.5 !text-xs" onClick={() => onViewProfile(user.id)}>
          Ver perfil
        </Button>
      ) : null}
      <Button type="button" variant="secondary" onClick={() => onToggleFollow(user.id)}>
        {isFollowing ? "Siguiendo" : "Seguir"}
      </Button>
    </li>
  );
}

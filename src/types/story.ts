export type FeedStorySlide = {
  id: string;
  mediaUrl: string;
  reelId: string;
};

export type FeedStoryAuthor = {
  userId: string;
  authorUsername: string;
  authorAvatarUrl: string;
  slides: FeedStorySlide[];
};

export type FeedStoriesPayload = {
  authors: FeedStoryAuthor[];
};

export type CreatedStoryPayload = {
  reel: {
    id: string;
    userId: string;
    slides: { id: string; mediaUrl: string }[];
    createdAt: string;
    expiresAt: string;
  };
};

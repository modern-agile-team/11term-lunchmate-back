import { Post } from '../entities/post.entity';

export type FindPostsResult = {
  items: Post[];
  nextCursor: number | null;
  hasNext: boolean;
};

export type CreatePostProps = {
  title: string;
  content: string;
  isAnonymous: boolean;
  category: { id: number };
  user: { id: number };
};

export type UpdatePostProps = Partial<Omit<CreatePostProps, 'user'>>;

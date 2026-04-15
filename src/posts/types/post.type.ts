import { Post } from '../entities/post.entity';

export type FindPostsResult = {
  items: Post[];
  nextCursor: number | null;
  hasNext: boolean;
};

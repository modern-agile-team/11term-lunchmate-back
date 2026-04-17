import { Comment } from '../entities/comment.entity';

export type FindCommentsResult = {
  items: Comment[];
  nextCursor: number | null;
  hasNext: boolean;
};

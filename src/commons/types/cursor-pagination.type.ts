export type CursorPaginatedResult<T> = {
  items: T[];
  nextCursor: number | null;
  hasNext: boolean;
};

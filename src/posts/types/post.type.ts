export type CreatePostProps = {
  title: string;
  content: string;
  isAnonymous: boolean;
  category: { id: number };
  user: { id: number };
};

export type UpdatePostProps = Partial<Omit<CreatePostProps, 'user'>>;

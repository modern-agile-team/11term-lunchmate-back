import { DeleteResult, Repository } from 'typeorm';
import { PostRepository } from './posts.repository';
import { Post } from './entities/post.entity';
import { CreatePostProps, UpdatePostProps } from './types/post.type';

describe('PostRepository', () => {
  let postRepository: PostRepository;
  let postOrmRepository: Pick<Repository<Post>, 'save' | 'findOne' | 'update' | 'softDelete'>;
  const manager = {
    increment: jest.fn(),
    decrement: jest.fn(),
  };

  beforeEach(() => {
    postOrmRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      softDelete: jest.fn(),
    };

    postRepository = new PostRepository(postOrmRepository as Repository<Post>);
  });

  describe('createPost', () => {
    it('저장용 props로 save를 호출', async () => {
      const createPostProps: CreatePostProps = {
        title: '학생식당 돈까스 맛있어요',
        content: '오늘 점심에 먹었는데 소스가 정말 맛있었어요.',
        isAnonymous: false,
        category: { id: 1 },
        user: { id: 7 },
      };
      const savedPost = {
        id: 1,
        ...createPostProps,
      };

      (postOrmRepository.save as jest.Mock).mockResolvedValue(savedPost);

      const result = await postRepository.createPost(createPostProps);

      expect(result).toEqual(savedPost);
      expect(postOrmRepository.save).toHaveBeenCalledWith(createPostProps);
    });
  });

  describe('findPostById', () => {
    it('postId와 relations 조건으로 findOne을 호출', async () => {
      const post = {
        id: 1,
        title: '게시글',
      };

      (postOrmRepository.findOne as jest.Mock).mockResolvedValue(post);

      const result = await postRepository.findPostById(1);

      expect(result).toEqual(post);
      expect(postOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        relations: {
          category: true,
          user: true,
        },
      });
    });
  });

  describe('updatePost', () => {
    it('postId와 수정 props로 update를 호출', async () => {
      const updatePostProps: UpdatePostProps = {
        title: '수정된 제목',
        category: { id: 2 },
        isAnonymous: true,
      };
      const updateResult = {
        affected: 1,
      };

      (postOrmRepository.update as jest.Mock).mockResolvedValue(updateResult);

      const result = await postRepository.updatePost(1, updatePostProps);

      expect(result).toEqual(updateResult);
      expect(postOrmRepository.update).toHaveBeenCalledWith(1, updatePostProps);
    });
  });

  describe('deletePost', () => {
    it('postId로 softDelete를 호출', async () => {
      const deleteResult: DeleteResult = {
        raw: [],
        affected: 1,
      };

      (postOrmRepository.softDelete as jest.Mock).mockResolvedValue(deleteResult);

      const result = await postRepository.deletePost(1);

      expect(result).toEqual(deleteResult);
      expect(postOrmRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('increasePostLikeCount', () => {
    it('manager.increment 로 좋아요 수를 1 증가시킨다', async () => {
      const updateResult = {
        affected: 1,
      };

      manager.increment.mockResolvedValue(updateResult);

      const result = await postRepository.increasePostLikeCount(1, manager as never);

      expect(result).toEqual(updateResult);
      expect(manager.increment).toHaveBeenCalledWith(Post, { id: 1 }, 'likeCount', 1);
    });
  });

  describe('decreasePostLikeCount', () => {
    it('manager.decrement 로 좋아요 수를 1 감소시킨다', async () => {
      const updateResult = {
        affected: 1,
      };

      manager.decrement.mockResolvedValue(updateResult);

      const result = await postRepository.decreasePostLikeCount(1, manager as never);

      expect(result).toEqual(updateResult);
      expect(manager.decrement).toHaveBeenCalledWith(Post, { id: 1 }, 'likeCount', 1);
    });
  });
});

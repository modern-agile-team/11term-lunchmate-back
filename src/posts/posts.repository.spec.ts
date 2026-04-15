import { Repository } from 'typeorm';
import { PostRepository } from './posts.repository';
import { Post } from './entities/post.entity';
import { CreatePostDto } from './dtos/create-post.dto';

describe('PostRepository', () => {
  let postRepository: PostRepository;
  let postOrmRepository: Pick<Repository<Post>, 'save' | 'findOne'>;

  beforeEach(() => {
    postOrmRepository = {
      save: jest.fn(),
      findOne: jest.fn(),
    };

    postRepository = new PostRepository(postOrmRepository as Repository<Post>);
  });

  describe('createPost', () => {
    it('작성 DTO와 userId로 save를 호출', async () => {
      const createPostDto: CreatePostDto = {
        title: '학생식당 돈까스 맛있어요',
        content: '오늘 점심에 먹었는데 소스가 정말 맛있었어요.',
        categoryId: 1,
        isAnonymous: false,
      };
      const savedPost = {
        id: 1,
        ...createPostDto,
      };

      (postOrmRepository.save as jest.Mock).mockResolvedValue(savedPost);

      const result = await postRepository.createPost(createPostDto, 7);

      expect(result).toEqual(savedPost);
      expect(postOrmRepository.save).toHaveBeenCalledWith({
        title: createPostDto.title,
        content: createPostDto.content,
        isAnonymous: createPostDto.isAnonymous,
        category: { id: createPostDto.categoryId },
        user: { id: 7 },
      });
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
});

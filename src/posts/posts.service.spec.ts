import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { PostService } from './posts.service';
import { PostRepository } from './posts.repository';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostMapper } from './mappers/post-mapper';

const createPostDto: CreatePostDto = {
  title: '학생식당 돈까스 맛있어요',
  content: '오늘 점심에 먹었는데 소스가 정말 맛있었어요.',
  categoryId: 1,
  isAnonymous: false,
};

const mockCategory = {
  id: 1,
  name: '자유',
};

const mockCreatedPost = {
  id: 3,
};

const mockPostEntity = {
  id: 3,
  title: createPostDto.title,
  content: createPostDto.content,
  viewCount: 0,
  commentCount: 0,
  likeCount: 0,
  isAnonymous: false,
  createdAt: '2026-04-09T00:00:00.000Z',
  category: mockCategory,
  user: {
    id: 7,
    nickname: 'writer',
  },
};

const mockPostDetailDto = {
  id: 3,
  title: createPostDto.title,
  content: createPostDto.content,
  viewCount: 0,
  commentCount: 0,
  likeCount: 0,
  isAnonymous: false,
  createdAt: '2026-04-09T00:00:00.000Z',
  category: mockCategory,
  user: {
    id: 7,
    nickname: 'writer',
  },
};

const mockPostRepository = {
  createPost: jest.fn(),
  findPostById: jest.fn(),
};

const mockPostCategoryService = {
  findPostCategoryById: jest.fn(),
};

describe('PostService', () => {
  let postService: PostService;
  let toDetailDtoSpy: jest.SpiedFunction<typeof PostMapper.toDetailDto>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    toDetailDtoSpy = jest.spyOn(PostMapper, 'toDetailDto');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: PostRepository,
          useValue: mockPostRepository,
        },
        {
          provide: PostCategoryService,
          useValue: mockPostCategoryService,
        },
      ],
    }).compile();

    postService = module.get<PostService>(PostService);
  });

  describe('createPost', () => {
    it('카테고리를 검증하고 생성된 게시글 상세 정보를 반환', async () => {
      mockPostCategoryService.findPostCategoryById.mockResolvedValue(mockCategory);
      mockPostRepository.createPost.mockResolvedValue(mockCreatedPost);
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      toDetailDtoSpy.mockReturnValue(mockPostDetailDto);

      const result = await postService.createPost(createPostDto, 7);

      expect(result).toEqual(mockPostDetailDto);
      expect(mockPostCategoryService.findPostCategoryById).toHaveBeenCalledWith(
        createPostDto.categoryId,
      );
      expect(mockPostRepository.createPost).toHaveBeenCalledWith(createPostDto, 7);
      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(mockCreatedPost.id);
      expect(toDetailDtoSpy).toHaveBeenCalledWith(mockPostEntity);
    });

    it('생성 후 게시글을 다시 조회하지 못하면 NotFoundException을 던진다', async () => {
      mockPostCategoryService.findPostCategoryById.mockResolvedValue(mockCategory);
      mockPostRepository.createPost.mockResolvedValue(mockCreatedPost);
      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(postService.createPost(createPostDto, 7)).rejects.toThrow(NotFoundException);

      expect(mockPostCategoryService.findPostCategoryById).toHaveBeenCalledWith(
        createPostDto.categoryId,
      );
      expect(mockPostRepository.createPost).toHaveBeenCalledWith(createPostDto, 7);
      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(mockCreatedPost.id);
    });
  });
});

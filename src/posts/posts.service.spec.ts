import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { PostService } from './posts.service';
import { PostRepository } from './posts.repository';
import { PostCategoryService } from 'src/post-categories/post-categories.service';
import { CreatePostDto } from './dtos/create-post.dto';
import { PostMapper } from './mappers/post-mapper';
import { FindPostsQueryDto } from './dtos/find-posts-query.dto';
import { UpdatePostDto } from './dtos/update-post.dto';
import { PostLikeService } from './post-like.service';

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

const mockPostListDto = {
  items: [
    {
      id: 3,
      title: createPostDto.title,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: '2026-04-09T00:00:00.000Z',
      user: {
        id: 7,
        nickname: 'writer',
      },
    },
  ],
  nextCursor: null,
  hasNext: false,
};

const mockPostRepository = {
  createPost: jest.fn(),
  findPostById: jest.fn(),
  findPosts: jest.fn(),
  updatePost: jest.fn(),
  deletePost: jest.fn(),
  incresePostLikeCount: jest.fn(),
  decresePostLikeCount: jest.fn(),
};

const mockPostCategoryService = {
  findPostCategoryById: jest.fn(),
};

const mockPostLikeService = {
  saveLike: jest.fn(),
  deleteLike: jest.fn(),
  findPostLikeById: jest.fn(),
};

const mockManager = {} as EntityManager;

const mockDataSource = {
  transaction: jest.fn(),
};

describe('PostService', () => {
  let postService: PostService;
  let toDetailDtoSpy: jest.SpiedFunction<typeof PostMapper.toDetailDto>;
  let toListDtoSpy: jest.SpiedFunction<typeof PostMapper.toListDto>;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();
    toDetailDtoSpy = jest.spyOn(PostMapper, 'toDetailDto');
    toListDtoSpy = jest.spyOn(PostMapper, 'toListDto');
    mockDataSource.transaction.mockImplementation(
      async <T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> => {
        return callback(mockManager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: PostRepository,
          useValue: mockPostRepository,
        },
        {
          provide: PostCategoryService,
          useValue: mockPostCategoryService,
        },
        {
          provide: PostLikeService,
          useValue: mockPostLikeService,
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

  describe('findPosts', () => {
    it('카테고리 조건이 있으면 검증 후 게시글 목록 반환', async () => {
      const query: FindPostsQueryDto = {
        categoryId: 1,
        limit: 20,
      };

      mockPostCategoryService.findPostCategoryById.mockResolvedValue(mockCategory);
      mockPostRepository.findPosts.mockResolvedValue([mockPostEntity]);
      toListDtoSpy.mockReturnValue(mockPostListDto);

      const result = await postService.findPosts(query);

      expect(result).toEqual(mockPostListDto);
      expect(mockPostCategoryService.findPostCategoryById).toHaveBeenCalledWith(query.categoryId);
      expect(mockPostRepository.findPosts).toHaveBeenCalledWith(query, 20);
      expect(toListDtoSpy).toHaveBeenCalledWith([mockPostEntity], null, false);
    });

    it('다음 페이지가 있으면 limit 만큼만 잘라 nextCursor와 함께 반환', async () => {
      const query: FindPostsQueryDto = {
        limit: 2,
      };
      const thirdPost = {
        ...mockPostEntity,
        id: 1,
      };
      const foundPosts = [mockPostEntity, { ...mockPostEntity, id: 2 }, thirdPost];
      const paginatedResult = {
        ...mockPostListDto,
        nextCursor: 2,
        hasNext: true,
      };

      mockPostRepository.findPosts.mockResolvedValue(foundPosts);
      toListDtoSpy.mockReturnValue(paginatedResult);

      const result = await postService.findPosts(query);

      expect(result).toEqual(paginatedResult);
      expect(mockPostCategoryService.findPostCategoryById).not.toHaveBeenCalled();
      expect(mockPostRepository.findPosts).toHaveBeenCalledWith(query, 2);
      expect(toListDtoSpy).toHaveBeenCalledWith(foundPosts.slice(0, 2), 2, true);
    });
  });

  describe('findPostById', () => {
    it('게시글 상세 정보를 반환', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      toDetailDtoSpy.mockReturnValue(mockPostDetailDto);

      const result = await postService.findPostById(3);

      expect(result).toEqual(mockPostDetailDto);
      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(3, undefined);
      expect(toDetailDtoSpy).toHaveBeenCalledWith(mockPostEntity);
    });

    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(postService.findPostById(999)).rejects.toThrow(NotFoundException);

      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(999, undefined);
    });
  });

  describe('updatePost', () => {
    it('작성자가 수정하면 카테고리를 검증하고 수정 후 상세 정보를 반환', async () => {
      const updatePostDto: UpdatePostDto = {
        title: '수정된 제목',
        content: '수정된 내용',
        categoryId: 2,
        isAnonymous: true,
      };
      const updatedCategory = {
        id: 2,
        name: '정보',
      };
      const updatedPostEntity = {
        ...mockPostEntity,
        title: updatePostDto.title,
        content: updatePostDto.content,
        isAnonymous: true,
        category: updatedCategory,
      };
      const updatedPostDetailDto = {
        ...mockPostDetailDto,
        title: updatePostDto.title,
        content: updatePostDto.content,
        isAnonymous: true,
        category: updatedCategory,
        user: null,
      };

      mockPostRepository.findPostById
        .mockResolvedValueOnce(mockPostEntity)
        .mockResolvedValueOnce(updatedPostEntity);
      mockPostCategoryService.findPostCategoryById.mockResolvedValue(updatedCategory);
      mockPostRepository.updatePost.mockResolvedValue({ affected: 1 });
      toDetailDtoSpy.mockReturnValue(updatedPostDetailDto);

      const result = await postService.updatePost(updatePostDto, 3, 7);

      expect(result).toEqual(updatedPostDetailDto);
      expect(mockPostCategoryService.findPostCategoryById).toHaveBeenCalledWith(
        updatePostDto.categoryId,
      );
      expect(mockPostRepository.updatePost).toHaveBeenCalledWith(3, {
        title: '수정된 제목',
        content: '수정된 내용',
        isAnonymous: true,
        category: { id: 2 },
      });
      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(1, 3, undefined);
      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(2, 3, undefined);
      expect(toDetailDtoSpy).toHaveBeenCalledWith(updatedPostEntity);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);

      await expect(postService.updatePost({ title: '수정 시도' }, 3, 8)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockPostRepository.updatePost).not.toHaveBeenCalled();
    });

    it('수정할 값이 없으면 BadRequestException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);

      await expect(postService.updatePost({}, 3, 7)).rejects.toThrow(BadRequestException);

      expect(mockPostCategoryService.findPostCategoryById).not.toHaveBeenCalled();
      expect(mockPostRepository.updatePost).not.toHaveBeenCalled();
    });

    it('카테고리 없이 부분 수정하면 카테고리 검증 없이 수정한다', async () => {
      const updatePostDto: UpdatePostDto = {
        title: '제목만 수정',
      };
      const updatedPostEntity = {
        ...mockPostEntity,
        title: '제목만 수정',
      };
      const updatedPostDetailDto = {
        ...mockPostDetailDto,
        title: '제목만 수정',
      };

      mockPostRepository.findPostById
        .mockResolvedValueOnce(mockPostEntity)
        .mockResolvedValueOnce(updatedPostEntity);
      mockPostRepository.updatePost.mockResolvedValue({ affected: 1 });
      toDetailDtoSpy.mockReturnValue(updatedPostDetailDto);

      const result = await postService.updatePost(updatePostDto, 3, 7);

      expect(result).toEqual(updatedPostDetailDto);
      expect(mockPostCategoryService.findPostCategoryById).not.toHaveBeenCalled();
      expect(mockPostRepository.updatePost).toHaveBeenCalledWith(3, {
        title: '제목만 수정',
      });
    });

    it('카테고리만 수정하면 category payload만 포함해 수정한다', async () => {
      const updatePostDto: UpdatePostDto = {
        categoryId: 2,
      };
      const updatedCategory = {
        id: 2,
        name: '정보',
      };
      const updatedPostEntity = {
        ...mockPostEntity,
        category: updatedCategory,
      };
      const updatedPostDetailDto = {
        ...mockPostDetailDto,
        category: updatedCategory,
      };

      mockPostRepository.findPostById
        .mockResolvedValueOnce(mockPostEntity)
        .mockResolvedValueOnce(updatedPostEntity);
      mockPostCategoryService.findPostCategoryById.mockResolvedValue(updatedCategory);
      mockPostRepository.updatePost.mockResolvedValue({ affected: 1 });
      toDetailDtoSpy.mockReturnValue(updatedPostDetailDto);

      const result = await postService.updatePost(updatePostDto, 3, 7);

      expect(result).toEqual(updatedPostDetailDto);
      expect(mockPostCategoryService.findPostCategoryById).toHaveBeenCalledWith(2);
      expect(mockPostRepository.updatePost).toHaveBeenCalledWith(3, {
        category: { id: 2 },
      });
    });
  });

  describe('deletePost', () => {
    it('작성자가 게시글을 삭제하면 repository deletePost를 호출한다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostRepository.deletePost.mockResolvedValue({ affected: 1 });

      await expect(postService.deletePost(3, 7)).resolves.toBeUndefined();

      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(3, undefined);
      expect(mockPostRepository.deletePost).toHaveBeenCalledWith(3);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);

      await expect(postService.deletePost(3, 8)).rejects.toThrow(ForbiddenException);

      expect(mockPostRepository.deletePost).not.toHaveBeenCalled();
    });

    it('삭제 결과 affected 가 없으면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostRepository.deletePost.mockResolvedValue({ affected: 0 });

      await expect(postService.deletePost(3, 7)).rejects.toThrow(NotFoundException);

      expect(mockPostRepository.deletePost).toHaveBeenCalledWith(3);
    });
  });

  describe('createPostLike', () => {
    it('게시글 좋아요를 저장하고 좋아요 수를 증가시킨다', async () => {
      const likedPost = {
        ...mockPostEntity,
        likeCount: 1,
      };
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostLikeService.findPostLikeById.mockResolvedValue(null);
      mockPostLikeService.saveLike.mockResolvedValue(undefined);
      mockPostRepository.incresePostLikeCount.mockResolvedValue({ affected: 1 });
      mockPostRepository.findPostById
        .mockResolvedValueOnce(mockPostEntity)
        .mockResolvedValueOnce(likedPost);

      await expect(postService.createPostLike(3, 8)).resolves.toEqual({
        postId: 3,
        liked: true,
        likeCount: 1,
      });

      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(1, 3, undefined);
      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(2, 3, mockManager);
      expect(mockPostLikeService.findPostLikeById).toHaveBeenCalledWith(3, 8);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockPostLikeService.saveLike).toHaveBeenCalledWith(3, 8, mockManager);
      expect(mockPostRepository.incresePostLikeCount).toHaveBeenCalledWith(3, mockManager);
    });

    it('자신의 게시글에는 좋아요할 수 없다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);

      await expect(postService.createPostLike(3, 7)).rejects.toThrow(BadRequestException);

      expect(mockPostLikeService.findPostLikeById).not.toHaveBeenCalled();
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('이미 좋아요한 게시글이면 실패한다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostLikeService.findPostLikeById.mockResolvedValue({
        id: 1,
      });

      await expect(postService.createPostLike(3, 8)).rejects.toThrow(BadRequestException);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('deletePostLike', () => {
    it('좋아요를 취소하고 좋아요 수를 감소시킨다', async () => {
      const likedPost = {
        ...mockPostEntity,
        likeCount: 1,
      };
      mockPostRepository.findPostById
        .mockResolvedValueOnce(likedPost)
        .mockResolvedValueOnce(mockPostEntity);
      mockPostLikeService.findPostLikeById.mockResolvedValue({
        id: 1,
      });
      mockPostLikeService.deleteLike.mockResolvedValue({ affected: 1 });
      mockPostRepository.decresePostLikeCount.mockResolvedValue({ affected: 1 });

      await expect(postService.deletePostLike(3, 8)).resolves.toEqual({
        postId: 3,
        liked: false,
        likeCount: 0,
      });

      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(1, 3, undefined);
      expect(mockPostRepository.findPostById).toHaveBeenNthCalledWith(2, 3, mockManager);
      expect(mockPostLikeService.findPostLikeById).toHaveBeenCalledWith(3, 8);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockPostLikeService.deleteLike).toHaveBeenCalledWith(3, 8, mockManager);
      expect(mockPostRepository.decresePostLikeCount).toHaveBeenCalledWith(3, mockManager);
    });

    it('좋아요하지 않은 게시글이면 취소에 실패한다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostLikeService.findPostLikeById.mockResolvedValue(null);

      await expect(postService.deletePostLike(3, 8)).rejects.toThrow(NotFoundException);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('트랜잭션에서 삭제 결과가 없으면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPostEntity);
      mockPostLikeService.findPostLikeById.mockResolvedValue({
        id: 1,
      });
      mockPostLikeService.deleteLike.mockResolvedValue({ affected: 0 });

      await expect(postService.deletePostLike(3, 8)).rejects.toThrow(NotFoundException);

      expect(mockPostRepository.decresePostLikeCount).not.toHaveBeenCalled();
    });
  });
});

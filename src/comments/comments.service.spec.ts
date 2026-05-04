import { Test, TestingModule } from '@nestjs/testing';
import { InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CommentService } from './comments.service';
import { CommentRepository } from './comments.repository';
import { PostRepository } from 'src/posts/posts.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';

const createCommentDto: CreateCommentDto = {
  content: '저도 같은 생각입니다.',
  isAnonymous: false,
};

const mockPost = {
  id: 3,
  title: '댓글이 달릴 게시글',
};

const mockCreatedComment = {
  id: 11,
};

const mockCommentEntity = {
  id: 11,
  content: createCommentDto.content,
  likeCount: 0,
  isAnonymous: false,
  createdAt: '2026-04-16T00:00:00.000Z',
  user: {
    id: 7,
    nickname: 'commenter',
  },
};

const mockCommentRepository = {
  createComment: jest.fn(),
  findCommentById: jest.fn(),
};

const mockPostRepository = {
  findPostById: jest.fn(),
  increaseCommentCount: jest.fn(),
};

const mockManager = {} as EntityManager;

const mockDataSource = {
  transaction: jest.fn(),
};

describe('CommentService', () => {
  let commentService: CommentService;

  beforeEach(async () => {
    jest.restoreAllMocks();
    jest.resetAllMocks();

    mockDataSource.transaction.mockImplementation(
      async <T>(callback: (manager: EntityManager) => Promise<T>): Promise<T> => {
        return callback(mockManager);
      },
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentService,
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
        {
          provide: CommentRepository,
          useValue: mockCommentRepository,
        },
        {
          provide: PostRepository,
          useValue: mockPostRepository,
        },
      ],
    }).compile();

    commentService = module.get<CommentService>(CommentService);
  });

  describe('createComment', () => {
    it('게시글을 검증하고 댓글 생성 후 상세 정보를 반환한다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.createComment.mockResolvedValue(mockCreatedComment);
      mockPostRepository.increaseCommentCount.mockResolvedValue({ affected: 1 });
      mockCommentRepository.findCommentById.mockResolvedValue(mockCommentEntity);

      const result = await commentService.createComment(createCommentDto, 3, 7);

      expect(result).toEqual(mockCommentEntity);
      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(3);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockCommentRepository.createComment).toHaveBeenCalledWith(
        createCommentDto,
        3,
        7,
        mockManager,
      );
      expect(mockPostRepository.increaseCommentCount).toHaveBeenCalledWith(3, mockManager);
      expect(mockCommentRepository.findCommentById).toHaveBeenCalledWith(11);
    });

    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(commentService.createComment(createCommentDto, 999, 7)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockCommentRepository.createComment).not.toHaveBeenCalled();
    });

    it('생성 후 댓글을 다시 조회하지 못하면 InternalServerErrorException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.createComment.mockResolvedValue(mockCreatedComment);
      mockPostRepository.increaseCommentCount.mockResolvedValue({ affected: 1 });
      mockCommentRepository.findCommentById.mockResolvedValue(null);

      await expect(commentService.createComment(createCommentDto, 3, 7)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findCommentById', () => {
    it('댓글 상세 정보를 반환한다', async () => {
      mockCommentRepository.findCommentById.mockResolvedValue(mockCommentEntity);

      const result = await commentService.findCommentById(11);

      expect(result).toEqual(mockCommentEntity);
    });

    it('존재하지 않는 댓글이면 null을 반환한다', async () => {
      mockCommentRepository.findCommentById.mockResolvedValue(null);

      await expect(commentService.findCommentById(999)).resolves.toBeNull();
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { CommentService } from './comments.service';
import { CommentRepository } from './comments.repository';
import { PostRepository } from 'src/posts/posts.repository';
import { CommentLikeRepository } from './comment-like.repository';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';
import { FindCommentsQueryDto } from './dtos/find-comments-query.dto';

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
  post: {
    id: 3,
  },
  user: {
    id: 7,
    nickname: 'commenter',
  },
};

const mockCommentList = [
  {
    ...mockCommentEntity,
    id: 1,
    content: '첫 번째 댓글',
  },
  {
    ...mockCommentEntity,
    id: 2,
    content: '두 번째 댓글',
  },
  {
    ...mockCommentEntity,
    id: 3,
    content: '세 번째 댓글',
  },
];

const mockCommentRepository = {
  createComment: jest.fn(),
  findByCommentIdAndPostId: jest.fn(),
  findCommentsByPostId: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  increaseCommentLikeCount: jest.fn(),
  decreaseCommentLikeCount: jest.fn(),
};

const mockPostRepository = {
  findPostById: jest.fn(),
  increaseCommentCount: jest.fn(),
  decreaseCommentCount: jest.fn(),
};

const mockCommentLikeRepository = {
  findByCommentIdAndUserId: jest.fn(),
  likeComment: jest.fn(),
  unlikeComment: jest.fn(),
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
        {
          provide: CommentLikeRepository,
          useValue: mockCommentLikeRepository,
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
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);

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
      expect(mockCommentRepository.findByCommentIdAndPostId).toHaveBeenCalledWith(11, 3);
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
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(null);

      await expect(commentService.createComment(createCommentDto, 3, 7)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('findCommentOrThrow', () => {
    it('댓글 상세 정보를 반환한다', async () => {
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);

      const result = await commentService.findCommentOrThrow(11, 3);

      expect(result).toEqual(mockCommentEntity);
    });

    it('존재하지 않는 댓글이면 NotFoundException을 던진다', async () => {
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(null);

      await expect(commentService.findCommentOrThrow(999, 3)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findCommentsByPostId', () => {
    it('게시글이 존재하면 댓글 목록을 반환한다', async () => {
      const query: FindCommentsQueryDto = {
        limit: 20,
      };

      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findCommentsByPostId.mockResolvedValue(mockCommentList.slice(0, 2));

      const result = await commentService.findCommentsByPostId(3, query);

      expect(result).toEqual({
        items: mockCommentList.slice(0, 2),
        nextCursor: null,
        hasNext: false,
      });
      expect(mockCommentRepository.findCommentsByPostId).toHaveBeenCalledWith(3, null, 20);
    });

    it('다음 페이지가 있으면 limit 만큼 자르고 nextCursor를 반환한다', async () => {
      const query: FindCommentsQueryDto = {
        cursor: 1,
        limit: 2,
      };

      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findCommentsByPostId.mockResolvedValue(mockCommentList);

      const result = await commentService.findCommentsByPostId(3, query);

      expect(result).toEqual({
        items: mockCommentList.slice(0, 2),
        nextCursor: 2,
        hasNext: true,
      });
      expect(mockCommentRepository.findCommentsByPostId).toHaveBeenCalledWith(3, 1, 2);
    });

    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(commentService.findCommentsByPostId(999, {})).rejects.toThrow(NotFoundException);

      expect(mockCommentRepository.findCommentsByPostId).not.toHaveBeenCalled();
    });
  });

  describe('editComment', () => {
    it('작성자가 댓글을 수정하면 수정 후 댓글 상세 정보를 반환한다', async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: '수정된 댓글입니다.',
      };
      const updatedCommentEntity = {
        ...mockCommentEntity,
        content: '수정된 댓글입니다.',
      };

      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentRepository.updateComment.mockResolvedValue(updatedCommentEntity);

      const result = await commentService.editComment(updateCommentDto, 3, 11, 7);

      expect(result).toEqual(updatedCommentEntity);
      expect(mockCommentRepository.updateComment).toHaveBeenCalledWith({
        ...mockCommentEntity,
        content: '수정된 댓글입니다.',
      });
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: '수정 시도',
      };

      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);

      await expect(commentService.editComment(updateCommentDto, 3, 11, 8)).rejects.toThrow(
        ForbiddenException,
      );

      expect(mockCommentRepository.updateComment).not.toHaveBeenCalled();
    });

    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: '수정 시도',
      };

      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(commentService.editComment(updateCommentDto, 999, 11, 7)).rejects.toThrow(
        NotFoundException,
      );

      expect(mockCommentRepository.findByCommentIdAndPostId).not.toHaveBeenCalled();
    });
  });

  describe('deleteComment', () => {
    it('작성자가 댓글을 삭제하면 댓글 수를 감소시킨다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentRepository.deleteComment.mockResolvedValue({ affected: 1 });
      mockPostRepository.decreaseCommentCount.mockResolvedValue({ affected: 1 });

      await expect(commentService.deleteComment(3, 11, 7)).resolves.toBeUndefined();

      expect(mockPostRepository.findPostById).toHaveBeenCalledWith(3);
      expect(mockCommentRepository.findByCommentIdAndPostId).toHaveBeenCalledWith(11, 3);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockCommentRepository.deleteComment).toHaveBeenCalledWith(11, mockManager);
      expect(mockPostRepository.decreaseCommentCount).toHaveBeenCalledWith(3, mockManager);
    });

    it('작성자가 아니면 ForbiddenException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);

      await expect(commentService.deleteComment(3, 11, 8)).rejects.toThrow(ForbiddenException);

      expect(mockDataSource.transaction).not.toHaveBeenCalled();
      expect(mockCommentRepository.deleteComment).not.toHaveBeenCalled();
    });

    it('존재하지 않는 게시글이면 NotFoundException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(null);

      await expect(commentService.deleteComment(999, 11, 7)).rejects.toThrow(NotFoundException);

      expect(mockCommentRepository.findByCommentIdAndPostId).not.toHaveBeenCalled();
    });

    it('트랜잭션에서 삭제 결과가 없으면 InternalServerErrorException을 던진다', async () => {
      mockPostRepository.findPostById.mockResolvedValue(mockPost);
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentRepository.deleteComment.mockResolvedValue({ affected: 0 });

      await expect(commentService.deleteComment(3, 11, 7)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(mockPostRepository.decreaseCommentCount).not.toHaveBeenCalled();
    });
  });

  describe('likeComment', () => {
    it('좋아요하지 않은 댓글이면 좋아요 결과를 반환한다', async () => {
      const likedComment = {
        ...mockCommentEntity,
        likeCount: 1,
      };

      mockCommentRepository.findByCommentIdAndPostId
        .mockResolvedValueOnce(mockCommentEntity)
        .mockResolvedValueOnce(likedComment);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue(null);
      mockCommentLikeRepository.likeComment.mockResolvedValue({ id: 1 });
      mockCommentRepository.increaseCommentLikeCount.mockResolvedValue({ affected: 1 });

      await expect(commentService.likeComment(3, 11, 7)).resolves.toEqual(likedComment);
      expect(mockCommentLikeRepository.findByCommentIdAndUserId).toHaveBeenCalledWith(11, 7);
      expect(mockCommentLikeRepository.likeComment).toHaveBeenCalledWith(11, 7, mockManager);
      expect(mockCommentRepository.increaseCommentLikeCount).toHaveBeenCalledWith(11, mockManager);
      expect(mockCommentRepository.findByCommentIdAndPostId).toHaveBeenLastCalledWith(
        11,
        3,
        mockManager,
      );
    });

    it('이미 좋아요한 댓글이면 BadRequestException을 던진다', async () => {
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue({ id: 1 });

      await expect(commentService.likeComment(3, 11, 7)).rejects.toThrow(BadRequestException);
    });

    it('좋아요 후 댓글을 다시 조회하지 못하면 InternalServerErrorException을 던진다', async () => {
      mockCommentRepository.findByCommentIdAndPostId
        .mockResolvedValueOnce(mockCommentEntity)
        .mockResolvedValueOnce(null);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue(null);
      mockCommentLikeRepository.likeComment.mockResolvedValue({ id: 1 });
      mockCommentRepository.increaseCommentLikeCount.mockResolvedValue({ affected: 1 });

      await expect(commentService.likeComment(3, 11, 7)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('unlikeComment', () => {
    it('좋아요한 댓글이면 좋아요 취소 결과를 반환한다', async () => {
      const unlikedComment = {
        ...mockCommentEntity,
        likeCount: 0,
      };

      mockCommentRepository.findByCommentIdAndPostId
        .mockResolvedValueOnce({ ...mockCommentEntity, likeCount: 1 })
        .mockResolvedValueOnce(unlikedComment);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue({ id: 1 });
      mockCommentLikeRepository.unlikeComment.mockResolvedValue({ affected: 1 });
      mockCommentRepository.decreaseCommentLikeCount.mockResolvedValue({ affected: 1 });

      await expect(commentService.unlikeComment(3, 11, 7)).resolves.toEqual(unlikedComment);
      expect(mockCommentLikeRepository.findByCommentIdAndUserId).toHaveBeenCalledWith(11, 7);
      expect(mockCommentLikeRepository.unlikeComment).toHaveBeenCalledWith(11, 7, mockManager);
      expect(mockCommentRepository.decreaseCommentLikeCount).toHaveBeenCalledWith(11, mockManager);
      expect(mockCommentRepository.findByCommentIdAndPostId).toHaveBeenLastCalledWith(
        11,
        3,
        mockManager,
      );
    });

    it('좋아요하지 않은 댓글이면 BadRequestException을 던진다', async () => {
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue(null);

      await expect(commentService.unlikeComment(3, 11, 7)).rejects.toThrow(BadRequestException);
    });

    it('좋아요 취소 결과가 없으면 InternalServerErrorException을 던진다', async () => {
      mockCommentRepository.findByCommentIdAndPostId.mockResolvedValue(mockCommentEntity);
      mockCommentLikeRepository.findByCommentIdAndUserId.mockResolvedValue({ id: 1 });
      mockCommentLikeRepository.unlikeComment.mockResolvedValue({ affected: 0 });

      await expect(commentService.unlikeComment(3, 11, 7)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });
});

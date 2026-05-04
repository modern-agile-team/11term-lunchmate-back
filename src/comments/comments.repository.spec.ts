import { Repository } from 'typeorm';
import { CommentRepository } from './comments.repository';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dtos/create-comment.dto';

describe('CommentRepository', () => {
  let commentRepository: CommentRepository;
  let commentOrmRepository: Pick<Repository<Comment>, 'findOne' | 'find' | 'update'>;
  const manager = {
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(() => {
    commentOrmRepository = {
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
    };

    commentRepository = new CommentRepository(commentOrmRepository as Repository<Comment>);
  });

  describe('createComment', () => {
    it('createCommentDTO, postId, userId로 manager.save를 호출', async () => {
      const createCommentDto: CreateCommentDto = {
        content: '저도 같은 생각입니다.',
        isAnonymous: false,
      };
      const savedComment = {
        id: 11,
        ...createCommentDto,
      };

      (manager.save as jest.Mock).mockResolvedValue(savedComment);

      const result = await commentRepository.createComment(
        createCommentDto,
        3,
        7,
        manager as never,
      );

      expect(result).toEqual(savedComment);
      expect(manager.save).toHaveBeenCalledWith(Comment, {
        content: createCommentDto.content,
        isAnonymous: createCommentDto.isAnonymous,
        post: { id: 3 },
        user: { id: 7 },
      });
    });
  });

  describe('findByCommentIdAndPostId', () => {
    it('commentId와 postId로 findOne을 호출', async () => {
      const comment = {
        id: 11,
        content: '댓글',
      };

      (commentOrmRepository.findOne as jest.Mock).mockResolvedValue(comment);

      const result = await commentRepository.findByCommentIdAndPostId(11, 3);

      expect(result).toEqual(comment);
      expect(commentOrmRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 11,
          post: { id: 3 },
        },
        relations: {
          user: true,
          post: true,
        },
      });
    });
  });

  describe('updateComment', () => {
    it('수정된 comment entity로 save를 호출한다', async () => {
      const comment = {
        id: 11,
        content: '수정된 댓글',
        isAnonymous: false,
      };
      const savedComment = {
        ...comment,
        createdAt: '2026-04-20T00:00:00.000Z',
      };

      (commentOrmRepository.save as jest.Mock).mockResolvedValue(savedComment);

      const result = await commentRepository.updateComment(comment as Comment);

      expect(result).toEqual(savedComment);
      expect(commentOrmRepository.save).toHaveBeenCalledWith(comment);
    });
  });

  describe('findCommentsByPostId', () => {
    it('postId와 cursor, limit 조건으로 find를 호출한다', async () => {
      const comments = [
        { id: 2, content: '두 번째 댓글' },
        { id: 3, content: '세 번째 댓글' },
      ];

      (commentOrmRepository.find as jest.Mock).mockResolvedValue(comments);

      const result = await commentRepository.findCommentsByPostId(3, 1, 2);

      expect(result).toEqual(comments);
      expect(commentOrmRepository.find).toHaveBeenCalledWith({
        where: {
          post: { id: 3 },
          id: expect.any(Object),
        },
        relations: {
          user: true,
        },
        order: {
          id: 'ASC',
        },
        take: 3,
      });
    });

    it('cursor가 없으면 postId 조건만으로 find를 호출한다', async () => {
      const comments = [{ id: 1, content: '첫 번째 댓글' }];

      (commentOrmRepository.find as jest.Mock).mockResolvedValue(comments);

      const result = await commentRepository.findCommentsByPostId(3, null, 20);

      expect(result).toEqual(comments);
      expect(commentOrmRepository.find).toHaveBeenCalledWith({
        where: {
          post: { id: 3 },
        },
        relations: {
          user: true,
        },
        order: {
          id: 'ASC',
        },
        take: 21,
      });
    });
  });

  describe('deleteComment', () => {
    it('commentId로 manager.softDelete를 호출한다', async () => {
      const deleteResult = {
        affected: 1,
      };

      (manager.softDelete as jest.Mock).mockResolvedValue(deleteResult);

      const result = await commentRepository.deleteComment(11, manager as never);

      expect(result).toEqual(deleteResult);
      expect(manager.softDelete).toHaveBeenCalledWith(Comment, 11);
    });
  });
});

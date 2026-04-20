import { Repository } from 'typeorm';
import { CommentRepository } from './comments.repository';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dtos/create-comment.dto';

describe('CommentRepository', () => {
  let commentRepository: CommentRepository;
  let commentOrmRepository: Pick<Repository<Comment>, 'findOne' | 'save'>;
  const manager = {
    save: jest.fn(),
  };

  beforeEach(() => {
    commentOrmRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
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
});

import { Repository } from 'typeorm';
import { CommentRepository } from './comments.repository';
import { Comment } from './entities/comment.entity';
import { CreateCommentDto } from './dtos/create-comment.dto';
import { UpdateCommentDto } from './dtos/update-comment.dto';

describe('CommentRepository', () => {
  let commentRepository: CommentRepository;
  let commentOrmRepository: Pick<Repository<Comment>, 'findOne' | 'update'>;
  const manager = {
    save: jest.fn(),
  };

  beforeEach(() => {
    commentOrmRepository = {
      findOne: jest.fn(),
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
    it('commentId와 수정 DTO로 update를 호출한다', async () => {
      const updateCommentDto: UpdateCommentDto = {
        content: '수정된 댓글',
      };
      const updateResult = {
        affected: 1,
      };

      (commentOrmRepository.update as jest.Mock).mockResolvedValue(updateResult);

      const result = await commentRepository.updateComment(updateCommentDto, 11);

      expect(result).toEqual(updateResult);
      expect(commentOrmRepository.update).toHaveBeenCalledWith(11, updateCommentDto);
    });
  });
});

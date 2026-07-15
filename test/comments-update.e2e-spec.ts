import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { CommentLike } from '../src/comments/entities/comment-like.entity';
import { Comment } from '../src/comments/entities/comment.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { Post } from '../src/posts/entities/post.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Comments Update (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createAuthUserTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.createQueryBuilder().delete().from(CommentLike).execute();
    await dataSource.createQueryBuilder().delete().from(Comment).execute();
    await dataSource.createQueryBuilder().delete().from(Post).execute();
    await dataSource.createQueryBuilder().delete().from(PostCategory).execute();
    await dataSource.createQueryBuilder().delete().from(User).execute();
  });

  function httpApp(): App {
    return app.getHttpServer();
  }

  async function signupUser(email: string, nickname: string): Promise<Response> {
    return request(httpApp()).post('/api/v1/auth/signup').send({
      email,
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname,
      schoolInfo: '인덕대학교',
    });
  }

  async function createCategory(name: string): Promise<PostCategory> {
    return await dataSource.getRepository(PostCategory).save({ name });
  }

  async function createPost(
    userId: number,
    categoryId: number,
    overrides?: Partial<Pick<Post, 'title' | 'content' | 'isAnonymous'>>,
  ): Promise<Post> {
    return await dataSource.getRepository(Post).save({
      title: overrides?.title ?? '댓글 수정 테스트용 게시글',
      content: overrides?.content ?? '댓글 수정이 일어날 게시글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      user: { id: userId },
      category: { id: categoryId },
    });
  }

  async function createComment(
    postId: number,
    userId: number,
    overrides?: Partial<Pick<Comment, 'content' | 'isAnonymous'>>,
  ): Promise<Comment> {
    return await dataSource.getRepository(Comment).save({
      content: overrides?.content ?? '수정 전 댓글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      post: { id: postId },
      user: { id: userId },
    });
  }

  it('PATCH /posts/:postId/comments/:commentId 작성자가 댓글을 수정한다', async () => {
    const signupResponse = await signupUser('comment-update@example.com', 'comment-writer');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '수정 후 댓글입니다.',
        isAnonymous: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(comment.id);
    expect(response.body.content).toBe('수정 후 댓글입니다.');
    expect(response.body.user).toBeNull();
    expect(response.body.likeCount).toBe(0);
    expect(response.body.createdAt).toEqual(expect.any(String));

    const updatedComment = await dataSource.getRepository(Comment).findOne({
      where: { id: comment.id },
      relations: {
        user: true,
        post: true,
      },
    });

    expect(updatedComment?.content).toBe('수정 후 댓글입니다.');
    expect(updatedComment?.isAnonymous).toBe(true);
    expect(updatedComment?.user.id).toBe(signupResponse.body.user.id);
    expect(updatedComment?.post.id).toBe(post.id);
  });

  it('PATCH /posts/:postId/comments/:commentId 작성자가 아니면 수정에 실패한다', async () => {
    const writerSignup = await signupUser('comment-owner@example.com', 'comment-owner');
    const otherSignup = await signupUser('comment-other@example.com', 'comment-other');
    const category = await createCategory('자유');
    const post = await createPost(writerSignup.body.user.id, category.id);
    const comment = await createComment(post.id, writerSignup.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${otherSignup.body.accessToken}`)
      .send({
        content: '권한 없는 수정',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 403,
      message: '댓글을 수정할 권한이 없습니다.',
    });
  });

  it('PATCH /posts/:postId/comments/:commentId 잘못된 수정값이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-invalid@example.com', 'comment-invalid');
    const category = await createCategory('정보');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: 'a'.repeat(501),
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      expect.arrayContaining(['content must be shorter than or equal to 500 characters']),
    );
  });

  it('PATCH /posts/:postId/comments/:commentId 수정할 값이 없으면 실패한다', async () => {
    const signupResponse = await signupUser('comment-empty@example.com', 'comment-empty');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '수정할 값이 없습니다.',
    });
  });

  it('PATCH /posts/:postId/comments/:commentId 존재하지 않는 게시글이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-no-post@example.com', 'comment-no-post');

    const response = await request(httpApp())
      .patch('/api/v1/posts/999/comments/1')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '없는 게시글의 댓글 수정',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 게시글입니다.',
    });
  });

  it('PATCH /posts/:postId/comments/:commentId 존재하지 않는 댓글이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-no-comment@example.com', 'comment-no-comment');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/999`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '없는 댓글 수정',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('PATCH /posts/:postId/comments/:commentId 다른 게시글의 댓글이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-wrong-post@example.com', 'wrong-post');
    const category = await createCategory('자유');
    const firstPost = await createPost(signupResponse.body.user.id, category.id, {
      title: '첫 번째 게시글',
    });
    const secondPost = await createPost(signupResponse.body.user.id, category.id, {
      title: '두 번째 게시글',
    });
    const comment = await createComment(firstPost.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${secondPost.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '다른 게시글 경로로 수정 시도',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('PATCH /posts/:postId/comments/:commentId 인증 없이 수정하면 실패한다', async () => {
    const signupResponse = await signupUser('comment-auth-owner@example.com', 'auth-commenter');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .send({
        content: '로그인 없이 수정',
      });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});

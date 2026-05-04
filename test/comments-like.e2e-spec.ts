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

describe('Comments Like (e2e)', () => {
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
    return request(httpApp()).post('/auth/signup').send({
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
      title: overrides?.title ?? '댓글 좋아요 테스트용 게시글',
      content: overrides?.content ?? '댓글 좋아요가 달릴 게시글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      user: { id: userId },
      category: { id: categoryId },
    });
  }

  async function createComment(
    postId: number,
    userId: number,
    overrides?: Partial<Pick<Comment, 'content' | 'isAnonymous' | 'likeCount'>>,
  ): Promise<Comment> {
    return await dataSource.getRepository(Comment).save({
      content: overrides?.content ?? '좋아요 테스트 댓글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      likeCount: overrides?.likeCount ?? 0,
      post: { id: postId },
      user: { id: userId },
    });
  }

  it('POST /posts/:postId/comments/:commentId/like 댓글 좋아요 성공', async () => {
    const authorSignup = await signupUser('comment-like-author@example.com', 'comment-author');
    const likerSignup = await signupUser('comment-like-user@example.com', 'comment-liker');
    const category = await createCategory('자유');
    const post = await createPost(authorSignup.body.user.id, category.id);
    const comment = await createComment(post.id, authorSignup.body.user.id);

    const response = await request(httpApp())
      .post(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      commentId: comment.id,
      liked: true,
      likeCount: 1,
    });

    const likedComment = await dataSource
      .getRepository(Comment)
      .findOneByOrFail({ id: comment.id });
    const commentLike = await dataSource.getRepository(CommentLike).findOne({
      where: {
        comment: { id: comment.id },
        user: { id: likerSignup.body.user.id },
      },
      relations: {
        comment: true,
        user: true,
      },
    });

    expect(likedComment.likeCount).toBe(1);
    expect(commentLike).toBeDefined();
  });

  it('POST /posts/:postId/comments/:commentId/like 이미 좋아요한 댓글이면 실패', async () => {
    const authorSignup = await signupUser(
      'comment-like-repeat-author@example.com',
      'repeat-author',
    );
    const likerSignup = await signupUser('comment-like-repeat-user@example.com', 'repeat-liker');
    const category = await createCategory('자유');
    const post = await createPost(authorSignup.body.user.id, category.id);
    const comment = await createComment(post.id, authorSignup.body.user.id);

    await request(httpApp())
      .post(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    const response = await request(httpApp())
      .post(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '이미 좋아요한 댓글입니다.',
    });
  });

  it('POST /posts/:postId/comments/:commentId/like 존재하지 않는 댓글이면 실패', async () => {
    const signupResponse = await signupUser('comment-like-missing@example.com', 'missing-liker');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .post(`/posts/${post.id}/comments/999/like`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('POST /posts/:postId/comments/:commentId/like 다른 게시글 경로의 댓글이면 실패', async () => {
    const signupResponse = await signupUser('comment-like-wrong-post@example.com', 'wrong-post');
    const category = await createCategory('자유');
    const firstPost = await createPost(signupResponse.body.user.id, category.id, {
      title: '첫 번째 게시글',
    });
    const secondPost = await createPost(signupResponse.body.user.id, category.id, {
      title: '두 번째 게시글',
    });
    const comment = await createComment(firstPost.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .post(`/posts/${secondPost.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('DELETE /posts/:postId/comments/:commentId/like 댓글 좋아요 취소 성공', async () => {
    const authorSignup = await signupUser('comment-unlike-author@example.com', 'unlike-author');
    const likerSignup = await signupUser('comment-unlike-user@example.com', 'unlike-user');
    const category = await createCategory('자유');
    const post = await createPost(authorSignup.body.user.id, category.id);
    const comment = await createComment(post.id, authorSignup.body.user.id);

    await request(httpApp())
      .post(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      commentId: comment.id,
      liked: false,
      likeCount: 0,
    });

    const unlikedComment = await dataSource
      .getRepository(Comment)
      .findOneByOrFail({ id: comment.id });
    const commentLike = await dataSource.getRepository(CommentLike).findOne({
      where: {
        comment: { id: comment.id },
        user: { id: likerSignup.body.user.id },
      },
      relations: {
        comment: true,
        user: true,
      },
    });

    expect(unlikedComment.likeCount).toBe(0);
    expect(commentLike).toBeNull();
  });

  it('DELETE /posts/:postId/comments/:commentId/like 좋아요하지 않은 댓글이면 실패', async () => {
    const authorSignup = await signupUser(
      'comment-unlike-missing-author@example.com',
      'missing-author',
    );
    const likerSignup = await signupUser('comment-unlike-missing-user@example.com', 'missing-user');
    const category = await createCategory('자유');
    const post = await createPost(authorSignup.body.user.id, category.id);
    const comment = await createComment(post.id, authorSignup.body.user.id);

    const response = await request(httpApp())
      .delete(`/posts/${post.id}/comments/${comment.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '좋아요하지 않은 댓글입니다.',
    });
  });

  it('댓글 좋아요/좋아요 취소는 인증이 필요하다', async () => {
    const signupResponse = await signupUser('comment-like-auth-owner@example.com', 'auth-owner');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const likeResponse = await request(httpApp()).post(
      `/posts/${post.id}/comments/${comment.id}/like`,
    );
    const unlikeResponse = await request(httpApp()).delete(
      `/posts/${post.id}/comments/${comment.id}/like`,
    );

    expect(likeResponse.status).toBe(401);
    expect(likeResponse.body.success).toBe(false);
    expect(likeResponse.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });

    expect(unlikeResponse.status).toBe(401);
    expect(unlikeResponse.body.success).toBe(false);
    expect(unlikeResponse.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});

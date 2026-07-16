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

describe('Comments Read (e2e)', () => {
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
      title: overrides?.title ?? '댓글 목록 테스트용 게시글',
      content: overrides?.content ?? '댓글 목록이 달릴 게시글입니다.',
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
      content: overrides?.content ?? '댓글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      post: { id: postId },
      user: { id: userId },
    });
  }

  it('GET /posts/:id/comments 게시글 댓글 목록 조회 성공', async () => {
    const signupResponse = await signupUser('comment-read@example.com', 'comment-reader');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const firstComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '첫 번째 댓글',
    });
    const secondComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '두 번째 댓글',
    });

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toMatchObject({
      id: firstComment.id,
      content: '첫 번째 댓글',
      user: {
        id: signupResponse.body.user.id,
        nickname: 'comment-reader',
      },
    });
    expect(response.body.items[1]).toMatchObject({
      id: secondComment.id,
      content: '두 번째 댓글',
    });
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.hasNext).toBe(false);
  });

  it('GET /posts/:id/comments cursor 기반 페이지네이션 조회 성공', async () => {
    const signupResponse = await signupUser('comment-page@example.com', 'comment-page');
    const category = await createCategory('정보');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const firstComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '첫 번째 댓글',
    });
    const secondComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '두 번째 댓글',
    });
    const thirdComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '세 번째 댓글',
    });

    const response = await request(httpApp()).get(
      `/posts/${post.id}/comments?cursor=${firstComment.id}&limit=2`,
    );

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].id).toBe(secondComment.id);
    expect(response.body.items[1].id).toBe(thirdComment.id);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.hasNext).toBe(false);
  });

  it('GET /posts/:id/comments 익명 댓글은 작성자 정보를 숨긴다', async () => {
    const signupResponse = await signupUser('comment-anon@example.com', 'anon-reader');
    const category = await createCategory('질문');
    const post = await createPost(signupResponse.body.user.id, category.id);
    await createComment(post.id, signupResponse.body.user.id, {
      content: '익명 댓글입니다.',
      isAnonymous: true,
    });

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.items[0].user).toBeNull();
  });

  it('GET /posts/:id/comments soft delete된 댓글은 목록에서 제외된다', async () => {
    const signupResponse = await signupUser('comment-deleted@example.com', 'deleted-reader');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);
    const activeComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '보이는 댓글',
    });
    const deletedComment = await createComment(post.id, signupResponse.body.user.id, {
      content: '삭제된 댓글',
    });

    await dataSource.getRepository(Comment).softDelete(deletedComment.id);

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}/comments`);

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].id).toBe(activeComment.id);
  });

  it('GET /posts/:id/comments 존재하지 않는 게시글이면 실패', async () => {
    const response = await request(httpApp()).get('/api/v1/posts/999/comments');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 게시글입니다.',
    });
  });

  it('GET /posts/:id/comments 잘못된 조회 조건이면 실패', async () => {
    const signupResponse = await signupUser('comment-invalid-query@example.com', 'invalid-query');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}/comments?cursor=0&limit=51`);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      expect.arrayContaining([
        'cursor must not be less than 1',
        'limit must not be greater than 50',
      ]),
    );
  });
});

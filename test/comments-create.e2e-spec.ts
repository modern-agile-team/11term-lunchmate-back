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

describe('Comments Create (e2e)', () => {
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
      title: overrides?.title ?? '댓글 테스트용 게시글',
      content: overrides?.content ?? '댓글이 달릴 게시글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      user: { id: userId },
      category: { id: categoryId },
    });
  }

  it('POST /posts/:id/comments 댓글 작성 성공', async () => {
    const signupResponse = await signupUser('commenter@example.com', 'commenter');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '저도 같은 생각입니다.',
        isAnonymous: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.content).toBe('저도 같은 생각입니다.');
    expect(response.body.likeCount).toBe(0);
    expect(response.body.user).toEqual({
      id: signupResponse.body.user.id,
      nickname: 'commenter',
    });
    expect(response.body.createdAt).toEqual(expect.any(String));

    const createdComment = await dataSource.getRepository(Comment).findOne({
      where: { id: response.body.id },
      relations: {
        user: true,
        post: true,
      },
    });

    expect(createdComment).toBeDefined();
    expect(createdComment?.content).toBe('저도 같은 생각입니다.');
    expect(createdComment?.likeCount).toBe(0);
    expect(createdComment?.isAnonymous).toBe(false);
    expect(createdComment?.user.id).toBe(signupResponse.body.user.id);
    expect(createdComment?.post.id).toBe(post.id);

    const updatedPost = await dataSource.getRepository(Post).findOneBy({ id: post.id });
    expect(updatedPost?.commentCount).toBe(1);
  });

  it('POST /posts/:id/comments 익명 댓글 작성 성공 시 user는 null', async () => {
    const signupResponse = await signupUser('anonymous-commenter@example.com', 'anon-commenter');
    const category = await createCategory('질문');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '익명으로 남기는 댓글입니다.',
        isAnonymous: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.user).toBeNull();
  });

  it('POST /posts/:id/comments 존재하지 않는 게시글이면 실패', async () => {
    const signupResponse = await signupUser('missing-post@example.com', 'missing-post');

    const response = await request(httpApp())
      .post('/api/v1/posts/999/comments')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '없는 게시글에 다는 댓글',
        isAnonymous: false,
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 게시글입니다.',
    });
  });

  it('POST /posts/:id/comments 잘못된 요청값이면 실패', async () => {
    const signupResponse = await signupUser('invalid-comment@example.com', 'invalid-comment');
    const category = await createCategory('정보');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .post(`/api/v1/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        content: '',
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      expect.arrayContaining([
        'content should not be empty',
        'isAnonymous should not be empty',
        'isAnonymous must be a boolean value',
      ]),
    );

    const comments = await dataSource.getRepository(Comment).find();
    expect(comments).toHaveLength(0);

    const unchangedPost = await dataSource.getRepository(Post).findOneBy({ id: post.id });
    expect(unchangedPost?.commentCount).toBe(0);
  });

  it('POST /posts/:id/comments 인증 없이 요청하면 실패', async () => {
    const signupResponse = await signupUser('post-owner@example.com', 'post-owner');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp()).post(`/api/v1/posts/${post.id}/comments`).send({
      content: '로그인 없이 작성하는 댓글',
      isAnonymous: false,
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});

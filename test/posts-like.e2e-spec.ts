import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { PostLike } from '../src/posts/entities/post-like.entity';
import { Post } from '../src/posts/entities/post.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Posts Like (e2e)', () => {
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
    await dataSource.createQueryBuilder().delete().from(PostLike).execute();
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

  async function createPostFixture(params: {
    title: string;
    content: string;
    user: User;
    category: PostCategory;
    isAnonymous?: boolean;
  }): Promise<Post> {
    return await dataSource.getRepository(Post).save({
      title: params.title,
      content: params.content,
      user: params.user,
      category: params.category,
      isAnonymous: params.isAnonymous ?? false,
    });
  }

  function expectExceptionFilterErrorResponse(
    response: Response,
    statusCode: number,
    message: string | string[],
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode,
      message,
    });
  }

  it('POST /posts/:id/like 게시글 좋아요 성공', async () => {
    const authorSignup = await signupUser('post-like-author@example.com', 'like-author');
    const likerSignup = await signupUser('post-like-user@example.com', 'like-user');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '좋아요 테스트 게시글',
      content: '좋아요 테스트 내용',
      user: author,
      category,
    });

    const response = await request(httpApp())
      .post(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      postId: post.id,
      liked: true,
      likeCount: 1,
    });

    const likedPost = await dataSource.getRepository(Post).findOneByOrFail({
      id: post.id,
    });
    const postLike = await dataSource.getRepository(PostLike).findOne({
      where: {
        post: { id: post.id },
        user: { id: likerSignup.body.user.id },
      },
      relations: {
        post: true,
        user: true,
      },
    });

    expect(likedPost.likeCount).toBe(1);
    expect(postLike).toBeDefined();
  });

  it('POST /posts/:id/like 자신의 게시글에는 좋아요할 수 없다', async () => {
    const authorSignup = await signupUser('post-like-self@example.com', 'self-like-author');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '내 게시글',
      content: '좋아요 불가',
      user: author,
      category,
    });

    const response = await request(httpApp())
      .post(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${authorSignup.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 400, '자신의 게시글에는 좋아요할 수 없습니다.');
  });

  it('POST /posts/:id/like 이미 좋아요한 게시글이면 실패', async () => {
    const authorSignup = await signupUser('post-like-repeat-author@example.com', 'repeat-author');
    const likerSignup = await signupUser('post-like-repeat-user@example.com', 'repeat-user');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '중복 좋아요 테스트',
      content: '중복 좋아요 내용',
      user: author,
      category,
    });

    await request(httpApp())
      .post(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    const response = await request(httpApp())
      .post(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 400, '이미 좋아요한 게시글입니다.');
  });

  it('DELETE /posts/:id/like 게시글 좋아요 취소 성공', async () => {
    const authorSignup = await signupUser('post-unlike-author@example.com', 'unlike-author');
    const likerSignup = await signupUser('post-unlike-user@example.com', 'unlike-user');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '좋아요 취소 테스트',
      content: '좋아요 취소 내용',
      user: author,
      category,
    });

    await request(httpApp())
      .post(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      postId: post.id,
      liked: false,
      likeCount: 0,
    });

    const unlikedPost = await dataSource.getRepository(Post).findOneByOrFail({
      id: post.id,
    });
    const postLike = await dataSource.getRepository(PostLike).findOne({
      where: {
        post: { id: post.id },
        user: { id: likerSignup.body.user.id },
      },
      relations: {
        post: true,
        user: true,
      },
    });

    expect(unlikedPost.likeCount).toBe(0);
    expect(postLike).toBeNull();
  });

  it('DELETE /posts/:id/like 좋아요하지 않은 게시글이면 실패', async () => {
    const authorSignup = await signupUser(
      'post-unlike-missing-author@example.com',
      'missing-author',
    );
    const likerSignup = await signupUser('post-unlike-missing-user@example.com', 'missing-user');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '좋아요 안한 게시글',
      content: '좋아요 취소 실패',
      user: author,
      category,
    });

    const response = await request(httpApp())
      .delete(`/posts/${post.id}/like`)
      .set('Authorization', `Bearer ${likerSignup.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 404, '좋아요하지 않은 게시글입니다.');
  });

  it('좋아요/좋아요 취소는 인증이 필요하다', async () => {
    const authorSignup = await signupUser('post-like-auth-author@example.com', 'auth-author');
    const author = await dataSource.getRepository(User).findOneByOrFail({
      id: authorSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '인증 테스트 게시글',
      content: '인증 테스트 내용',
      user: author,
      category,
    });

    const likeResponse = await request(httpApp()).post(`/posts/${post.id}/like`);
    const unlikeResponse = await request(httpApp()).delete(`/posts/${post.id}/like`);

    expectExceptionFilterErrorResponse(likeResponse, 401, 'Unauthorized');
    expectExceptionFilterErrorResponse(unlikeResponse, 401, 'Unauthorized');
  });
});

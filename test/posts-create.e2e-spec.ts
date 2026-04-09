import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { Post } from '../src/posts/entities/post.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Posts Create (e2e)', () => {
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

  it('POST /posts 게시글 작성 성공', async () => {
    const signupResponse = await signupUser('writer@example.com', 'writer');
    const category = await createCategory('자유');

    const response = await request(httpApp())
      .post('/posts')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '학생식당 돈까스 맛있어요',
        content: '오늘 점심에 먹었는데 소스가 정말 맛있었어요.',
        categoryId: category.id,
        isAnonymous: false,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toEqual(expect.any(Number));
    expect(response.body.title).toBe('학생식당 돈까스 맛있어요');
    expect(response.body.content).toBe('오늘 점심에 먹었는데 소스가 정말 맛있었어요.');
    expect(response.body.viewCount).toBe(0);
    expect(response.body.commentCount).toBe(0);
    expect(response.body.likeCount).toBe(0);
    expect(response.body.isAnonymous).toBe(false);
    expect(response.body.user).toEqual({
      id: signupResponse.body.user.id,
      nickname: 'writer',
    });
    expect(response.body.category).toEqual({
      id: category.id,
      name: '자유',
    });
    expect(response.body.createdAt).toEqual(expect.any(String));

    const createdPost = await dataSource.getRepository(Post).findOne({
      where: { id: response.body.id },
      relations: {
        user: true,
        category: true,
      },
    });

    expect(createdPost).toBeDefined();
    expect(createdPost?.title).toBe('학생식당 돈까스 맛있어요');
    expect(createdPost?.content).toBe('오늘 점심에 먹었는데 소스가 정말 맛있었어요.');
    expect(createdPost?.user.id).toBe(signupResponse.body.user.id);
    expect(createdPost?.category.id).toBe(category.id);
  });

  it('POST /posts 익명 게시글 작성 성공 시 user 는 null 이다', async () => {
    const signupResponse = await signupUser('anonymous@example.com', 'anonymous-writer');
    const category = await createCategory('정보');

    const response = await request(httpApp())
      .post('/posts')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '익명 후기',
        content: '오늘 메뉴 꽤 괜찮았어요.',
        categoryId: category.id,
        isAnonymous: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.isAnonymous).toBe(true);
    expect(response.body.user).toBeNull();
    expect(response.body.category).toEqual({
      id: category.id,
      name: '정보',
    });
  });

  it('POST /posts 존재하지 않는 카테고리면 실패', async () => {
    const signupResponse = await signupUser('missing-category@example.com', 'missing-category');

    const response = await request(httpApp())
      .post('/posts')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '없는 카테고리 글',
        content: '이 요청은 실패해야 해요.',
        categoryId: 999,
        isAnonymous: false,
      });

    expectExceptionFilterErrorResponse(response, 404, '존재하지 않은 카테고리입니다.');
  });

  it('POST /posts 잘못된 요청값이면 실패', async () => {
    const signupResponse = await signupUser('invalid-post@example.com', 'invalid-post');
    const category = await createCategory('질문');

    const response = await request(httpApp())
      .post('/posts')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '   ',
        content: '',
        categoryId: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      expect.arrayContaining([
        'title should not be empty',
        'content should not be empty',
        'categoryId must be a positive number',
        'isAnonymous should not be empty',
        'isAnonymous must be a boolean value',
      ]),
    );

    const posts = await dataSource.getRepository(Post).find();
    expect(posts).toHaveLength(0);
    expect(category.id).toBeGreaterThan(0);
  });

  it('POST /posts 인증 없이 요청하면 실패', async () => {
    const category = await createCategory('자유');

    const response = await request(httpApp()).post('/posts').send({
      title: '로그인 없이 작성',
      content: '이 요청은 인증이 필요해요.',
      categoryId: category.id,
      isAnonymous: false,
    });

    expectExceptionFilterErrorResponse(response, 401, 'Unauthorized');
  });
});

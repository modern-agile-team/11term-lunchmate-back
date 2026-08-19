import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { Post } from '../src/posts/entities/post.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Posts Read (e2e)', () => {
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

  it('GET /posts 전체 게시글 목록 조회 성공', async () => {
    const writerSignup = await signupUser('posts-list@example.com', 'list-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const freeCategory = await createCategory('자유');
    const infoCategory = await createCategory('정보');

    const olderPost = await createPostFixture({
      title: '첫 번째 글',
      content: '첫 번째 내용',
      user: writer,
      category: freeCategory,
    });
    const latestPost = await createPostFixture({
      title: '두 번째 글',
      content: '두 번째 내용',
      user: writer,
      category: infoCategory,
    });

    const response = await request(httpApp()).get('/api/v1/posts');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0]).toEqual({
      id: latestPost.id,
      title: '두 번째 글',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: expect.any(String),
      user: {
        id: writer.id,
        nickname: writer.nickname,
      },
    });
    expect(response.body.items[1].id).toBe(olderPost.id);
    expect(response.body.nextCursor).toBeNull();
    expect(response.body.hasNext).toBe(false);
    expect(response.body.items[0].content).toBeUndefined();
  });

  it('GET /posts categoryId 로 필터링 조회 성공', async () => {
    const writerSignup = await signupUser('posts-category@example.com', 'category-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const freeCategory = await createCategory('자유');
    const infoCategory = await createCategory('정보');

    await createPostFixture({
      title: '자유 글',
      content: '자유 내용',
      user: writer,
      category: freeCategory,
    });
    await createPostFixture({
      title: '정보 글',
      content: '정보 내용',
      user: writer,
      category: infoCategory,
    });

    const response = await request(httpApp()).get('/api/v1/posts').query({
      categoryId: infoCategory.id,
    });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].title).toBe('정보 글');
  });

  it('GET /posts 커서 기반 페이징 조회 성공', async () => {
    const writerSignup = await signupUser('posts-cursor@example.com', 'cursor-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('자유');

    const firstPost = await createPostFixture({
      title: '첫 글',
      content: '첫 글 내용',
      user: writer,
      category,
    });
    const secondPost = await createPostFixture({
      title: '둘째 글',
      content: '둘째 글 내용',
      user: writer,
      category,
    });
    const thirdPost = await createPostFixture({
      title: '셋째 글',
      content: '셋째 글 내용',
      user: writer,
      category,
    });

    const firstPageResponse = await request(httpApp()).get('/api/v1/posts').query({
      limit: 2,
    });

    expect(firstPageResponse.status).toBe(200);
    expect(firstPageResponse.body.items).toHaveLength(2);
    expect(firstPageResponse.body.items[0].id).toBe(thirdPost.id);
    expect(firstPageResponse.body.items[1].id).toBe(secondPost.id);
    expect(firstPageResponse.body.nextCursor).toBe(secondPost.id);
    expect(firstPageResponse.body.hasNext).toBe(true);

    const nextPageResponse = await request(httpApp()).get('/api/v1/posts').query({
      cursor: firstPageResponse.body.nextCursor,
      limit: 2,
    });

    expect(nextPageResponse.status).toBe(200);
    expect(nextPageResponse.body.items).toHaveLength(1);
    expect(nextPageResponse.body.items[0].id).toBe(firstPost.id);
    expect(nextPageResponse.body.nextCursor).toBeNull();
    expect(nextPageResponse.body.hasNext).toBe(false);
  });

  it('GET /posts 익명 게시글은 작성자 정보를 숨긴다', async () => {
    const writerSignup = await signupUser('posts-anonymous@example.com', 'anonymous-reader');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('자유');

    await createPostFixture({
      title: '익명 글',
      content: '익명 내용',
      user: writer,
      category,
      isAnonymous: true,
    });

    const response = await request(httpApp()).get('/api/v1/posts');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].user).toBeNull();
  });

  it('GET /posts 존재하지 않는 카테고리면 실패', async () => {
    const response = await request(httpApp()).get('/api/v1/posts').query({
      categoryId: 999,
    });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '존재하지 않는 카테고리입니다.',
    });
  });

  it('GET /posts/:id 게시글 상세 조회 성공', async () => {
    const writerSignup = await signupUser('posts-detail@example.com', 'detail-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '상세 글',
      content: '상세 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: post.id,
      title: '상세 글',
      content: '상세 내용',
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      createdAt: expect.any(String),
      user: {
        id: writer.id,
        nickname: writer.nickname,
      },
      category: {
        id: category.id,
        name: category.name,
      },
      isAnonymous: false,
      liked: false,
    });
  });

  it('GET /posts/:id 익명 게시글 상세 조회 시 작성자 정보를 숨긴다', async () => {
    const writerSignup = await signupUser('posts-detail-anon@example.com', 'detail-anon');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('익명');
    const post = await createPostFixture({
      title: '익명 상세 글',
      content: '익명 상세 내용',
      user: writer,
      category,
      isAnonymous: true,
    });

    const response = await request(httpApp()).get(`/api/v1/posts/${post.id}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeNull();
    expect(response.body.isAnonymous).toBe(true);
  });

  it('GET /posts/:id 존재하지 않는 게시글이면 실패', async () => {
    const response = await request(httpApp()).get('/api/v1/posts/999');

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 게시글입니다.',
    });
  });

  it('GET /posts/:id 잘못된 게시글 ID 면 실패', async () => {
    const response = await request(httpApp()).get('/api/v1/posts/abc');

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
  });
});

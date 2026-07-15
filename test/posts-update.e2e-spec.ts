import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { Post } from '../src/posts/entities/post.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Posts Update (e2e)', () => {
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

  it('PATCH /posts/:id 작성자가 게시글을 수정한다', async () => {
    const signupResponse = await signupUser('post-update@example.com', 'post-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const freeCategory = await createCategory('자유');
    const infoCategory = await createCategory('정보');
    const post = await createPostFixture({
      title: '수정 전 제목',
      content: '수정 전 내용',
      user: writer,
      category: freeCategory,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '수정 후 제목',
        content: '수정 후 내용',
        categoryId: infoCategory.id,
        isAnonymous: true,
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(post.id);
    expect(response.body.title).toBe('수정 후 제목');
    expect(response.body.content).toBe('수정 후 내용');
    expect(response.body.isAnonymous).toBe(true);
    expect(response.body.user).toBeNull();
    expect(response.body.category).toEqual({
      id: infoCategory.id,
      name: infoCategory.name,
    });

    const updatedPost = await dataSource.getRepository(Post).findOne({
      where: { id: post.id },
      relations: {
        user: true,
        category: true,
      },
    });

    expect(updatedPost?.title).toBe('수정 후 제목');
    expect(updatedPost?.content).toBe('수정 후 내용');
    expect(updatedPost?.isAnonymous).toBe(true);
    expect(updatedPost?.category.id).toBe(infoCategory.id);
  });

  it('PATCH /posts/:id 카테고리만 수정할 수 있다', async () => {
    const signupResponse = await signupUser('post-update-category@example.com', 'category-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const freeCategory = await createCategory('자유');
    const infoCategory = await createCategory('정보');
    const post = await createPostFixture({
      title: '카테고리 변경 전 제목',
      content: '카테고리 변경 전 내용',
      user: writer,
      category: freeCategory,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        categoryId: infoCategory.id,
      });

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('카테고리 변경 전 제목');
    expect(response.body.content).toBe('카테고리 변경 전 내용');
    expect(response.body.category).toEqual({
      id: infoCategory.id,
      name: infoCategory.name,
    });

    const updatedPost = await dataSource.getRepository(Post).findOne({
      where: { id: post.id },
      relations: {
        category: true,
      },
    });

    expect(updatedPost?.category.id).toBe(infoCategory.id);
  });

  it('PATCH /posts/:id 작성자가 아니면 수정에 실패한다', async () => {
    const writerSignup = await signupUser('post-owner@example.com', 'post-owner');
    const otherSignup = await signupUser('post-other@example.com', 'post-other');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '원본 제목',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${otherSignup.body.accessToken}`)
      .send({
        title: '권한 없는 수정',
      });

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 403,
      message: '게시글에 대한 권한이 없습니다.',
    });
  });

  it('PATCH /posts/:id 잘못된 수정값이면 실패한다', async () => {
    const signupResponse = await signupUser('post-invalid@example.com', 'post-invalid');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '원본 제목',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '   ',
        categoryId: 0,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.statusCode).toBe(400);
    expect(response.body.error.message).toEqual(
      expect.arrayContaining(['title should not be empty', 'categoryId must be a positive number']),
    );
  });

  it('PATCH /posts/:id 수정할 값이 없으면 실패한다', async () => {
    const signupResponse = await signupUser('post-empty@example.com', 'post-empty');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '원본 제목',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '수정할 값이 없습니다.',
    });
  });

  it('PATCH /posts/:id 존재하지 않는 카테고리로 수정하면 실패한다', async () => {
    const signupResponse = await signupUser(
      'post-missing-category@example.com',
      'missing-category',
    );
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '원본 제목',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        categoryId: 999,
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 400,
      message: '존재하지 않는 카테고리입니다.',
    });
  });

  it('PATCH /posts/:id 존재하지 않는 게시글을 수정하면 실패한다', async () => {
    const signupResponse = await signupUser('post-not-found@example.com', 'not-found');

    const response = await request(httpApp())
      .patch('/api/v1/posts/999')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '없는 게시글 수정',
      });

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 게시글입니다.',
    });
  });

  it('PATCH /posts/:id 인증 없이 수정하면 실패한다', async () => {
    const signupResponse = await signupUser('post-auth-owner@example.com', 'auth-owner');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '원본 제목',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp()).patch(`/api/v1/posts/${post.id}`).send({
      title: '로그인 없이 수정',
    });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});

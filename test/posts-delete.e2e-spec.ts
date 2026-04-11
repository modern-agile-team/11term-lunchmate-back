import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request, { Response } from 'supertest';
import { App } from 'supertest/types';
import { Post } from '../src/posts/entities/post.entity';
import { PostCategory } from '../src/post-categories/entities/post-category.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Posts Delete (e2e)', () => {
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

  it('DELETE /posts/:id 작성자가 게시글을 삭제한다', async () => {
    const signupResponse = await signupUser('post-delete@example.com', 'post-writer');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '삭제할 게시글',
      content: '삭제 전 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .delete(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(204);

    const deletedPost = await dataSource.getRepository(Post).findOne({
      where: { id: post.id },
      withDeleted: true,
    });

    expect(deletedPost?.deletedAt).not.toBeNull();
  });

  it('DELETE /posts/:id 작성자가 아니면 삭제에 실패한다', async () => {
    const writerSignup = await signupUser('post-delete-owner@example.com', 'delete-owner');
    const otherSignup = await signupUser('post-delete-other@example.com', 'delete-other');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: writerSignup.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '삭제 권한 테스트 게시글',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp())
      .delete(`/posts/${post.id}`)
      .set('Authorization', `Bearer ${otherSignup.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 403, '게시글에 권한이 없습니다.');
  });

  it('DELETE /posts/:id 존재하지 않는 게시글이면 실패한다', async () => {
    const signupResponse = await signupUser('post-delete-missing@example.com', 'delete-missing');

    const response = await request(httpApp())
      .delete('/posts/999')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 404, '존재하지 않는 게시글입니다.');
  });

  it('DELETE /posts/:id 인증 없이 삭제하면 실패한다', async () => {
    const signupResponse = await signupUser('post-delete-auth@example.com', 'delete-auth');
    const writer = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const category = await createCategory('자유');
    const post = await createPostFixture({
      title: '인증 테스트 게시글',
      content: '원본 내용',
      user: writer,
      category,
    });

    const response = await request(httpApp()).delete(`/posts/${post.id}`);

    expectExceptionFilterErrorResponse(response, 401, 'Unauthorized');
  });
});

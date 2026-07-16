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

describe('Comments Delete (e2e)', () => {
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
    overrides?: Partial<Pick<Post, 'title' | 'content' | 'isAnonymous' | 'commentCount'>>,
  ): Promise<Post> {
    return await dataSource.getRepository(Post).save({
      title: overrides?.title ?? '댓글 삭제 테스트용 게시글',
      content: overrides?.content ?? '댓글 삭제가 일어날 게시글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      commentCount: overrides?.commentCount ?? 0,
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
      content: overrides?.content ?? '삭제될 댓글입니다.',
      isAnonymous: overrides?.isAnonymous ?? false,
      post: { id: postId },
      user: { id: userId },
    });
  }

  it('DELETE /posts/:postId/comments/:commentId 작성자가 댓글을 삭제한다', async () => {
    const signupResponse = await signupUser('comment-delete@example.com', 'comment-delete');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id, { commentCount: 1 });
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(204);
    expect(response.text).toBe('');

    const deletedComment = await dataSource.getRepository(Comment).findOneBy({
      id: comment.id,
    });
    const deletedCommentWithDeleted = await dataSource.getRepository(Comment).findOne({
      where: { id: comment.id },
      withDeleted: true,
    });
    const updatedPost = await dataSource.getRepository(Post).findOneBy({ id: post.id });

    expect(deletedComment).toBeNull();
    expect(deletedCommentWithDeleted).toBeDefined();
    expect(deletedCommentWithDeleted?.id).toBe(comment.id);
    expect(updatedPost?.commentCount).toBe(0);
  });

  it('DELETE /posts/:postId/comments/:commentId 작성자가 아니면 삭제에 실패한다', async () => {
    const writerSignup = await signupUser('comment-delete-owner@example.com', 'delete-owner');
    const otherSignup = await signupUser('comment-delete-other@example.com', 'delete-other');
    const category = await createCategory('자유');
    const post = await createPost(writerSignup.body.user.id, category.id, { commentCount: 1 });
    const comment = await createComment(post.id, writerSignup.body.user.id);

    const response = await request(httpApp())
      .delete(`/api/v1/posts/${post.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${otherSignup.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 403,
      message: '댓글을 삭제할 권한이 없습니다.',
    });
  });

  it('DELETE /posts/:postId/comments/:commentId 존재하지 않는 댓글이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-delete-no-comment@example.com', 'no-comment');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id);

    const response = await request(httpApp())
      .delete(`/api/v1/posts/${post.id}/comments/999`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('DELETE /posts/:postId/comments/:commentId 다른 게시글의 댓글이면 실패한다', async () => {
    const signupResponse = await signupUser('comment-delete-wrong-post@example.com', 'wrong-post');
    const category = await createCategory('자유');
    const firstPost = await createPost(signupResponse.body.user.id, category.id, {
      commentCount: 1,
    });
    const secondPost = await createPost(signupResponse.body.user.id, category.id);
    const comment = await createComment(firstPost.id, signupResponse.body.user.id);

    const response = await request(httpApp())
      .delete(`/api/v1/posts/${secondPost.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 404,
      message: '존재하지 않는 댓글입니다.',
    });
  });

  it('DELETE /posts/:postId/comments/:commentId 인증 없이 삭제하면 실패한다', async () => {
    const signupResponse = await signupUser('comment-delete-auth-owner@example.com', 'auth-owner');
    const category = await createCategory('자유');
    const post = await createPost(signupResponse.body.user.id, category.id, { commentCount: 1 });
    const comment = await createComment(post.id, signupResponse.body.user.id);

    const response = await request(httpApp()).delete(`/api/v1/posts/${post.id}/comments/${comment.id}`);

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode: 401,
      message: 'Unauthorized',
    });
  });
});

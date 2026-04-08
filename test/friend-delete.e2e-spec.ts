import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { FRIEND_ERROR_MESSAGES } from '../src/friends/friend.constants';
import { Friend, FriendStatus } from '../src/friends/entities/friend.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Friend Delete (e2e)', () => {
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
    await dataSource.createQueryBuilder().delete().from(Friend).execute();
    await dataSource.createQueryBuilder().delete().from(User).execute();
  });

  function expectExceptionFilterErrorResponse(
    response: request.Response,
    statusCode: number,
    message: string,
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode,
      message,
    });
  }

  async function signupUser(params: {
    email: string;
    nickname: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    schoolInfo?: string;
  }) {
    return request(app.getHttpServer())
      .post('/auth/signup')
      .send({
        email: params.email,
        password: 'password1234',
        birthDate: params.birthDate ?? '1999-01-01',
        gender: params.gender ?? 'MALE',
        nickname: params.nickname,
        schoolInfo: params.schoolInfo ?? 'Hongik University',
      });
  }

  async function createFriendRelation(params: {
    requesterId: number;
    receiverId: number;
    status: FriendStatus;
  }): Promise<Friend> {
    return dataSource.getRepository(Friend).save({
      requester: { id: params.requesterId } as User,
      receiver: { id: params.receiverId } as User,
      status: params.status,
    });
  }

  it('친구 삭제 성공', async () => {
    const firstUser = await signupUser({
      email: 'first@example.com',
      nickname: 'first-user',
    });
    const secondUser = await signupUser({
      email: 'second@example.com',
      nickname: 'second-user',
    });

    const friendship = await createFriendRelation({
      requesterId: firstUser.body.user.id,
      receiverId: secondUser.body.user.id,
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/${friendship.id}`)
      .set('Authorization', `Bearer ${firstUser.body.accessToken}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const activeRelation = await dataSource.getRepository(Friend).findOne({
      where: { id: friendship.id },
    });

    expect(activeRelation).toBeNull();

    const deletedRelation = await dataSource
      .getRepository(Friend)
      .createQueryBuilder('friend')
      .withDeleted()
      .addSelect('friend.deletedAt')
      .where('friend.id = :id', { id: friendship.id })
      .getOne();

    expect(deletedRelation).toBeDefined();
    expect(deletedRelation?.deletedAt).toBeTruthy();
  });

  it('친구가 아닌 관계 삭제 시 409', async () => {
    const firstUser = await signupUser({
      email: 'pending-first@example.com',
      nickname: 'pending-first-user',
    });
    const secondUser = await signupUser({
      email: 'pending-second@example.com',
      nickname: 'pending-second-user',
    });

    const pendingFriendship = await createFriendRelation({
      requesterId: firstUser.body.user.id,
      receiverId: secondUser.body.user.id,
      status: FriendStatus.PENDING,
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/${pendingFriendship.id}`)
      .set('Authorization', `Bearer ${firstUser.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 409, FRIEND_ERROR_MESSAGES.acceptedOnly);
  });

  it('권한 없는 사용자 삭제 시 403', async () => {
    const firstUser = await signupUser({
      email: 'auth-first@example.com',
      nickname: 'auth-first-user',
    });
    const secondUser = await signupUser({
      email: 'auth-second@example.com',
      nickname: 'auth-second-user',
    });
    const thirdUser = await signupUser({
      email: 'auth-third@example.com',
      nickname: 'auth-third-user',
    });

    const friendship = await createFriendRelation({
      requesterId: firstUser.body.user.id,
      receiverId: secondUser.body.user.id,
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/${friendship.id}`)
      .set('Authorization', `Bearer ${thirdUser.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 403, FRIEND_ERROR_MESSAGES.relatedUsersOnly);
  });
});

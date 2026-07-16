import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { FRIEND_ERROR_MESSAGES } from '../src/friends/friend.constants';
import { Friend, FriendStatus } from '../src/friends/entities/friend.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Friend List (e2e)', () => {
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
    message: string | string[],
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
    introduce?: string;
    mbti?: string;
  }) {
    return request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({
        email: params.email,
        password: 'password1234',
        birthDate: params.birthDate ?? '1999-01-01',
        gender: params.gender ?? 'MALE',
        nickname: params.nickname,
        schoolInfo: params.schoolInfo ?? 'Hongik University',
        introduce: params.introduce,
        mbti: params.mbti,
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

  it('친구 목록 조회 성공', async () => {
    const currentUser = await signupUser({
      email: 'current@example.com',
      nickname: 'current-user',
    });
    const friendUser = await signupUser({
      email: 'friend@example.com',
      nickname: 'friend-user',
      gender: 'FEMALE',
      birthDate: '1998-02-02',
      schoolInfo: 'Yonsei University',
      introduce: 'hello',
      mbti: 'ENFP',
    });

    const acceptedFriend = await createFriendRelation({
      requesterId: friendUser.body.user.id,
      receiverId: currentUser.body.user.id,
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual({
      friendshipId: acceptedFriend.id,
      status: FriendStatus.ACCEPTED,
      user: expect.objectContaining({
        id: friendUser.body.user.id,
        nickname: friendUser.body.user.nickname,
        birthDate: '1998-02-02',
        gender: 'FEMALE',
        schoolInfo: 'Yonsei University',
        introduce: 'hello',
        mbti: 'ENFP',
      }),
    });
  });

  it('친구가 없을 때 빈 배열 반환', async () => {
    const currentUser = await signupUser({
      email: 'empty@example.com',
      nickname: 'empty-user',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('본인과 무관한 관계는 노출되지 않음', async () => {
    const currentUser = await signupUser({
      email: 'viewer@example.com',
      nickname: 'viewer-user',
    });
    const firstUser = await signupUser({
      email: 'first@example.com',
      nickname: 'first-user',
    });
    const secondUser = await signupUser({
      email: 'second@example.com',
      nickname: 'second-user',
    });

    await createFriendRelation({
      requesterId: firstUser.body.user.id,
      receiverId: secondUser.body.user.id,
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('PENDING 과 REJECTED 관계는 목록에 포함되지 않음', async () => {
    const currentUser = await signupUser({
      email: 'filter@example.com',
      nickname: 'filter-user',
    });
    const pendingUser = await signupUser({
      email: 'pending@example.com',
      nickname: 'pending-user',
    });
    const rejectedUser = await signupUser({
      email: 'rejected@example.com',
      nickname: 'rejected-user',
    });

    await createFriendRelation({
      requesterId: currentUser.body.user.id,
      receiverId: pendingUser.body.user.id,
      status: FriendStatus.PENDING,
    });
    await createFriendRelation({
      requesterId: rejectedUser.body.user.id,
      receiverId: currentUser.body.user.id,
      status: FriendStatus.REJECTED,
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('soft delete 된 관계는 목록에 포함되지 않음', async () => {
    const currentUser = await signupUser({
      email: 'soft@example.com',
      nickname: 'soft-user',
    });
    const friendUser = await signupUser({
      email: 'soft-friend@example.com',
      nickname: 'soft-friend-user',
    });

    const relation = await createFriendRelation({
      requesterId: currentUser.body.user.id,
      receiverId: friendUser.body.user.id,
      status: FriendStatus.ACCEPTED,
    });

    await dataSource.getRepository(Friend).softDelete(relation.id);

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('인증 없이 조회 시 401', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .query({ status: 'accepted' });

    expectExceptionFilterErrorResponse(response, 401, 'Unauthorized');
  });

  it('status=accepted 는 성공', async () => {
    const currentUser = await signupUser({
      email: 'accepted-query@example.com',
      nickname: 'accepted-query-user',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'accepted' });

    expect(response.status).toBe(200);
  });

  it('지원하지 않는 status 입력 시 400', async () => {
    const currentUser = await signupUser({
      email: 'invalid-query@example.com',
      nickname: 'invalid-query-user',
    });

    const response = await request(app.getHttpServer())
      .get('/api/v1/friends')
      .set('Authorization', `Bearer ${currentUser.body.accessToken}`)
      .query({ status: 'pending' });

    expectExceptionFilterErrorResponse(response, 400, [FRIEND_ERROR_MESSAGES.acceptedStatusOnly]);
  });
});

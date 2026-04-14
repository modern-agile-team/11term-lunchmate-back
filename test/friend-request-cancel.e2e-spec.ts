import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { FRIEND_ERROR_MESSAGES } from '../src/friends/friend.constants';
import { Friend, FriendStatus } from '../src/friends/entities/friend.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Friend Request Cancel (e2e)', () => {
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

  async function createPendingRequest() {
    const requester = await signupUser({
      email: 'requester@example.com',
      nickname: 'requester',
    });
    const receiver = await signupUser({
      email: 'receiver@example.com',
      nickname: 'receiver',
      gender: 'FEMALE',
      birthDate: '1998-02-02',
      schoolInfo: 'Yonsei University',
    });

    const friendRequest = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    return { requester, receiver, friendRequest };
  }

  it('친구 신청 취소 성공', async () => {
    const { requester, receiver, friendRequest } = await createPendingRequest();

    const response = await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const activeRelation = await dataSource.getRepository(Friend).findOne({
      where: { id: friendRequest.body.id },
    });

    expect(activeRelation).toBeNull();

    const deletedRelation = await dataSource
      .getRepository(Friend)
      .createQueryBuilder('friend')
      .withDeleted()
      .leftJoinAndSelect('friend.requester', 'requester')
      .leftJoinAndSelect('friend.receiver', 'receiver')
      .addSelect('friend.deletedAt')
      .where('friend.id = :id', { id: friendRequest.body.id })
      .getOne();

    expect(deletedRelation).toBeDefined();
    expect(deletedRelation?.deletedAt).toBeTruthy();
    expect(deletedRelation?.requester.id).toBe(requester.body.user.id);
    expect(deletedRelation?.receiver.id).toBe(receiver.body.user.id);
  });

  it('요청 보낸 사용자만 취소 가능', async () => {
    const { receiver, friendRequest } = await createPendingRequest();

    const response = await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 403, FRIEND_ERROR_MESSAGES.requesterOnly);
  });

  it('제3자 취소 시도 시 403', async () => {
    const { friendRequest } = await createPendingRequest();
    const thirdUser = await signupUser({
      email: 'third@example.com',
      nickname: 'third-user',
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${thirdUser.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 403, FRIEND_ERROR_MESSAGES.requesterOnly);
  });

  it('존재하지 않는 요청 취소 시 404', async () => {
    const requester = await signupUser({
      email: 'missing-request@example.com',
      nickname: 'missing-requester',
    });

    const response = await request(app.getHttpServer())
      .delete('/friends/requests/999999')
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 404, FRIEND_ERROR_MESSAGES.requestNotFound);
  });

  it('이미 ACCEPTED 요청 취소 시 409', async () => {
    const { requester, friendRequest } = await createPendingRequest();

    await dataSource.getRepository(Friend).update(friendRequest.body.id, {
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 409, FRIEND_ERROR_MESSAGES.alreadyProcessed);
  });

  it('이미 REJECTED 요청 취소 시 409', async () => {
    const { requester, friendRequest } = await createPendingRequest();

    await dataSource.getRepository(Friend).update(friendRequest.body.id, {
      status: FriendStatus.REJECTED,
    });

    const response = await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    expectExceptionFilterErrorResponse(response, 409, FRIEND_ERROR_MESSAGES.alreadyProcessed);
  });

  it('인증 없이 취소 시 401', async () => {
    const { friendRequest } = await createPendingRequest();

    const response = await request(app.getHttpServer()).delete(
      `/friends/requests/${friendRequest.body.id}`,
    );

    expectExceptionFilterErrorResponse(response, 401, 'Unauthorized');
  });

  it('취소 후 같은 방향 재신청이 다시 가능함', async () => {
    const { requester, receiver, friendRequest } = await createPendingRequest();

    await request(app.getHttpServer())
      .delete(`/friends/requests/${friendRequest.body.id}`)
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.id).toBe(friendRequest.body.id);
    expect(response.body.status).toBe(FriendStatus.PENDING);

    const relations = await dataSource
      .getRepository(Friend)
      .createQueryBuilder('friend')
      .withDeleted()
      .addSelect('friend.deletedAt')
      .where('friend.requester_id = :requesterId', {
        requesterId: requester.body.user.id,
      })
      .andWhere('friend.receiver_id = :receiverId', {
        receiverId: receiver.body.user.id,
      })
      .getMany();

    expect(relations).toHaveLength(1);
    expect(relations[0].id).toBe(friendRequest.body.id);
    expect(relations[0].status).toBe(FriendStatus.PENDING);
    expect(relations[0].deletedAt).toBeNull();
  });
});

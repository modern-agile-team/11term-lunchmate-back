import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Friend, FriendStatus } from '../src/friends/entities/friend.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Friend Request Accept (e2e)', () => {
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

  async function signupUser(params: {
    email: string;
    nickname: string;
    gender?: 'MALE' | 'FEMALE';
    birthDate?: string;
    schoolInfo?: string;
  }) {
    return request(app.getHttpServer()).post('/auth/signup').send({
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

  it('친구 신청 수락 성공', async () => {
    const { requester, receiver, friendRequest } = await createPendingRequest();

    const response = await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(friendRequest.body.id);
    expect(response.body.requesterId).toBe(requester.body.user.id);
    expect(response.body.receiverId).toBe(receiver.body.user.id);
    expect(response.body.status).toBe(FriendStatus.ACCEPTED);

    const savedRelation = await dataSource.getRepository(Friend).findOne({
      where: { id: friendRequest.body.id },
    });

    expect(savedRelation?.status).toBe(FriendStatus.ACCEPTED);
  });

  it('요청 받은 사용자만 수락 가능', async () => {
    const { requester, friendRequest } = await createPendingRequest();
    const thirdUser = await signupUser({
      email: 'third@example.com',
      nickname: 'third-user',
    });

    const requesterResponse = await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${requester.body.accessToken}`);

    expect(requesterResponse.status).toBe(403);

    const thirdUserResponse = await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${thirdUser.body.accessToken}`);

    expect(thirdUserResponse.status).toBe(403);
  });

  it('존재하지 않는 친구 요청 수락 시 404', async () => {
    const receiver = await signupUser({
      email: 'missing-request@example.com',
      nickname: 'missing-request-receiver',
    });

    const response = await request(app.getHttpServer())
      .patch('/friends/requests/999999/accept')
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    expect(response.status).toBe(404);
  });

  it('이미 ACCEPTED 인 요청 재수락 시 409', async () => {
    const { receiver, friendRequest } = await createPendingRequest();

    await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    const response = await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    expect(response.status).toBe(409);
  });

  it('이미 REJECTED 인 요청 재수락 시 409', async () => {
    const { receiver, friendRequest } = await createPendingRequest();

    await dataSource.getRepository(Friend).update(friendRequest.body.id, {
      status: FriendStatus.REJECTED,
    });

    const response = await request(app.getHttpServer())
      .patch(`/friends/requests/${friendRequest.body.id}/accept`)
      .set('Authorization', `Bearer ${receiver.body.accessToken}`);

    expect(response.status).toBe(409);
  });

  it('인증 없이 친구 신청 수락 시 401', async () => {
    const { friendRequest } = await createPendingRequest();

    const response = await request(app.getHttpServer()).patch(
      `/friends/requests/${friendRequest.body.id}/accept`,
    );

    expect(response.status).toBe(401);
  });
});

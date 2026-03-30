import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Friend, FriendStatus } from '../src/friends/entities/friend.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Friend Request (e2e)', () => {
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

  it('친구 신청 성공', async () => {
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

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    expect(response.status).toBe(201);
    expect(response.body.requesterId).toBe(requester.body.user.id);
    expect(response.body.receiverId).toBe(receiver.body.user.id);
    expect(response.body.status).toBe(FriendStatus.PENDING);

    const createdRequest = await dataSource.getRepository(Friend).findOne({
      where: {
        id: response.body.id,
      },
      relations: {
        requester: true,
        receiver: true,
      },
    });

    expect(createdRequest).toBeDefined();
    expect(createdRequest?.status).toBe(FriendStatus.PENDING);
    expect(createdRequest?.requester.id).toBe(requester.body.user.id);
    expect(createdRequest?.receiver.id).toBe(receiver.body.user.id);
  });

  it('자기 자신에게 친구 신청 시 400', async () => {
    const user = await signupUser({
      email: 'self@example.com',
      nickname: 'self-user',
    });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${user.body.accessToken}`)
      .send({
        receiverId: user.body.user.id,
      });

    expect(response.status).toBe(400);
  });

  it('존재하지 않는 사용자에게 신청 시 404', async () => {
    const requester = await signupUser({
      email: 'missing-target@example.com',
      nickname: 'missing-target-requester',
    });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: 999999,
      });

    expect(response.status).toBe(404);
  });

  it('동일 방향 중복 신청 시 409', async () => {
    const requester = await signupUser({
      email: 'duplicate-requester@example.com',
      nickname: 'duplicate-requester',
    });
    const receiver = await signupUser({
      email: 'duplicate-receiver@example.com',
      nickname: 'duplicate-receiver',
    });

    await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    expect(response.status).toBe(409);
  });

  it('반대 방향 pending 관계가 있으면 409', async () => {
    const firstUser = await signupUser({
      email: 'reverse-first@example.com',
      nickname: 'reverse-first',
    });
    const secondUser = await signupUser({
      email: 'reverse-second@example.com',
      nickname: 'reverse-second',
    });

    await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${secondUser.body.accessToken}`)
      .send({
        receiverId: firstUser.body.user.id,
      });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${firstUser.body.accessToken}`)
      .send({
        receiverId: secondUser.body.user.id,
      });

    expect(response.status).toBe(409);
  });

  it('이미 친구인 경우 409', async () => {
    const requester = await signupUser({
      email: 'accepted-requester@example.com',
      nickname: 'accepted-requester',
    });
    const receiver = await signupUser({
      email: 'accepted-receiver@example.com',
      nickname: 'accepted-receiver',
    });

    await dataSource.getRepository(Friend).save({
      requester: { id: receiver.body.user.id } as User,
      receiver: { id: requester.body.user.id } as User,
      status: FriendStatus.ACCEPTED,
    });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .set('Authorization', `Bearer ${requester.body.accessToken}`)
      .send({
        receiverId: receiver.body.user.id,
      });

    expect(response.status).toBe(409);
  });

  it('인증 없이 친구 신청 시 401', async () => {
    const receiver = await signupUser({
      email: 'unauthorized-receiver@example.com',
      nickname: 'unauthorized-receiver',
    });

    const response = await request(app.getHttpServer())
      .post('/friends/requests')
      .send({
        receiverId: receiver.body.user.id,
      });

    expect(response.status).toBe(401);
  });
});

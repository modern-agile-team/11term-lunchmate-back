import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room } from '../src/rooms/entities/room.entity';
import { calculateAge } from '../src/commons/utils/age.util';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, futureLunchAt } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Create (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const httpApp = () => app.getHttpAdapter().getInstance();

  beforeAll(async () => {
    app = (await createAuthUserTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearRoomTables(dataSource);
  });

  it('POST /rooms 방 생성 성공', async () => {
    const lunchAt = futureLunchAt(1);

    const signupResponse = await request(httpApp()).post('/auth/signup').send({
      email: 'test123@gmail.com',
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname: '길동홍',
      schoolInfo: '인덕대학교',
    });

    const response = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '밥 같이 먹을 사람',
        description: '난 컴소과',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당 앞',
        lunchAt,
        minAge: 20,
        maxAge: 24,
      });

    expect(response.status).toBe(201);
    expect(response.body.title).toBe('밥 같이 먹을 사람');
    expect(response.body.description).toBe('난 컴소과');
    expect(response.body.hostUserId).toBe(signupResponse.body.user.id);
    expect(response.body.currentMembersCount).toBe(1);
    expect(response.body.roomMembers).toHaveLength(1);
    expect(response.body.roomMembers[0].id).toBe(signupResponse.body.user.id);
    expect(response.body.roomMembers[0].nickname).toBe('길동홍');
    expect(response.body.roomMembers[0].age).toBe(calculateAge('2000-01-01'));
    expect(response.body.roomMembers[0].gender).toBe('MALE');
    expect(response.body.roomMembers[0].schoolInfo).toBe('인덕대학교');
    expect(response.body.roomMembers[0].mbti).toBeNull();
    expect(response.body.lunchAt).toBe(lunchAt);

    const createdRoom = await dataSource.getRepository(Room).findOne({
      where: { id: response.body.id },
      relations: {
        hostUser: true,
      },
    });

    expect(createdRoom).not.toBeNull();
    expect(createdRoom?.hostUser.id).toBe(signupResponse.body.user.id);
    expect(response.body.createdAt).toBe(new Date(createdRoom!.createdAt).toISOString());
  });

  it('POST /rooms 이미 참여 중인 방이 있으면 생성 실패', async () => {
    const signupResponse = await request(httpApp()).post('/auth/signup').send({
      email: 'test123@gmail.com',
      password: '1q2w3e4r',
      birthDate: '2000-01-01',
      gender: 'MALE',
      nickname: '길동홍',
      schoolInfo: '인덕대',
    });

    const firstResponse = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '첫 번째 방',
        description: '첫 생성',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당',
        lunchAt: futureLunchAt(1),
        minAge: 20,
        maxAge: 24,
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(httpApp())
      .post('/rooms')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '두 번째 방',
        description: '중복 생성 시도',
        roomType: 'MALE',
        maxMembersCount: 4,
        place: '학식당 앞',
        lunchAt: futureLunchAt(2),
        minAge: 20,
        maxAge: 24,
      });

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body.message).toBe('이미 참여 중인 방이 있습니다.');

    const roomCount = await dataSource.getRepository(Room).count();

    expect(roomCount).toBe(1);
  });
});

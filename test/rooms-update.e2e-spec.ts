import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, futureLunchAt, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Update (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  const httpApp = () => app.getHttpServer();

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

  it('PATCH /rooms/:id 방장이 방 정보를 수정', async () => {
    const signupResponse = await signupUser(httpApp, 'host-update@gmail.com', '수정방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '수정 전 방 제목',
      description: '수정 전 설명',
      minAge: 20,
      maxAge: 24,
      lunchAt: futureLunchAt(1),
    });
    const updatedLunchAt = futureLunchAt(2);

    const response = await request(httpApp())
      .patch(`/rooms/${room.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '수정 후 방 제목',
        description: '수정 후 설명',
        minAge: 21,
        maxAge: 25,
        lunchAt: updatedLunchAt,
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(room.id);
    expect(response.body.title).toBe('수정 후 방 제목');
    expect(response.body.description).toBe('수정 후 설명');
    expect(response.body.minAge).toBe(21);
    expect(response.body.maxAge).toBe(25);
    expect(response.body.lunchAt).toBe(updatedLunchAt);

    const updatedRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: room.id,
    });

    expect(updatedRoom.title).toBe('수정 후 방 제목');
    expect(updatedRoom.description).toBe('수정 후 설명');
    expect(updatedRoom.minAge).toBe(21);
    expect(updatedRoom.maxAge).toBe(25);
    expect(new Date(updatedRoom.lunchAt).toISOString()).toBe(updatedLunchAt);
  });

  it('PATCH /rooms/:id 방장이 아닌 사용자가 수정하면 실패', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-forbidden@gmail.com', '방장');
    const otherSignupResponse = await signupUser(httpApp, 'guest-forbidden@gmail.com', '일반유저');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '권한 체크 방',
    });

    const response = await request(httpApp())
      .patch(`/rooms/${room.id}`)
      .set('Authorization', `Bearer ${otherSignupResponse.body.accessToken}`)
      .send({
        title: '권한 없는 수정',
      });

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('방장만 방을 수정할 수 있습니다.');
  });

  it('PATCH /rooms/:id 잘못된 수정값이면 실패', async () => {
    const signupResponse = await signupUser(httpApp, 'host-invalid@gmail.com', '검증방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      minAge: 20,
      maxAge: 24,
    });

    const response = await request(httpApp())
      .patch(`/rooms/${room.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        minAge: 30,
      });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('최소 나이와 최대 나이 옵션이 올바르지 않습니다.');
  });

  it('PATCH /rooms/:id 존재하지 않는 방을 수정하면 실패', async () => {
    const signupResponse = await signupUser(httpApp, 'host-notfound@gmail.com', '없는방수정');

    const response = await request(httpApp())
      .patch('/rooms/999999')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        title: '없는 방 수정 시도',
      });

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('존재하지 않는 방입니다.');
  });
});

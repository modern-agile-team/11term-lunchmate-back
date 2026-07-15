import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room, RoomStatus } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Complete (e2e)', () => {
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

  it('PATCH /rooms/:id/complete 방장이 방 상태를 COMPLETE로 변경한다', async () => {
    const signupResponse = await signupUser(httpApp, 'host-complete@gmail.com', '완료방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '완료 대상 방',
    });

    const response = await request(httpApp())
      .patch(`/api/v1/rooms/${room.id}/complete`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(room.id);
    expect(response.body.status).toBe(RoomStatus.COMPLETE);

    const completedRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: room.id,
    });

    expect(completedRoom.status).toBe(RoomStatus.COMPLETE);
  });

  it('PATCH /rooms/:id/complete 방장이 아닌 사용자가 완료 처리하면 실패한다', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-complete-forbidden@gmail.com', '방장');
    const otherSignupResponse = await signupUser(
      httpApp,
      'guest-complete-forbidden@gmail.com',
      '일반유저',
    );
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '완료 권한 체크 방',
    });

    const response = await request(httpApp())
      .patch(`/api/v1/rooms/${room.id}/complete`)
      .set('Authorization', `Bearer ${otherSignupResponse.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('방장만 방을 수정할 수 있습니다.');
  });

  it('PATCH /rooms/:id/complete 이미 COMPLETE 상태인 방이면 실패한다', async () => {
    const signupResponse = await signupUser(httpApp, 'host-complete-badrequest@gmail.com', '종료방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '이미 완료된 방',
      status: RoomStatus.COMPLETE,
    });

    const response = await request(httpApp())
      .patch(`/api/v1/rooms/${room.id}/complete`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('이미 종료된 방입니다.');
  });

  it('PATCH /rooms/:id/complete 존재하지 않는 방을 완료 처리하면 실패한다', async () => {
    const signupResponse = await signupUser(
      httpApp,
      'host-complete-notfound@gmail.com',
      '없는방완료',
    );

    const response = await request(httpApp())
      .patch('/api/v1/rooms/999999/complete')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('존재하지 않는 방입니다.');
  });
});

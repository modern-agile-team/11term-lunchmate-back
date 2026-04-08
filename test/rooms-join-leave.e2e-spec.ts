import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room } from '../src/rooms/entities/room.entity';
import { RoomMember } from '../src/rooms/entities/room-member.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Join/Leave (e2e)', () => {
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

  it('POST /rooms/:id/join 사용자가 방에 참여', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host@gmail.com', '방장');
    const guestSignupResponse = await signupUser(httpApp, 'user@gmail.com', '참여유저');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '참여 테스트 방',
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    const response = await request(httpApp())
      .post(`/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    expect(response.status).toBe(201);

    const joinedRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: room.id,
    });
    const roomMembersCount = await dataSource.getRepository(RoomMember).count({
      where: {
        room: { id: room.id },
      },
    });
    const joinedMember = await dataSource.getRepository(RoomMember).findOne({
      where: {
        room: { id: room.id },
        user: { id: guestSignupResponse.body.user.id },
      },
    });

    expect(joinedRoom.currentMembersCount).toBe(2);
    expect(roomMembersCount).toBe(2);
    expect(joinedMember).not.toBeNull();
  });

  it('POST /rooms/:id/join 이미 참여 중이면 실패', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host@gmail.com', '중복방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser);

    const response = await request(httpApp())
      .post(`/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('이미 참여 중인 방이 있습니다.');
  });

  it('DELETE /rooms/:id/leave 참여 중인 사용자가 방에서 나감', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host@gmail.com', '나가기방장');
    const guestSignupResponse = await signupUser(httpApp, 'user@gmail.com', '나가기유저');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    await request(httpApp())
      .post(`/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    expect(response.status).toBe(204);

    const leftRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: room.id,
    });
    const leftMember = await dataSource.getRepository(RoomMember).findOne({
      where: {
        room: { id: room.id },
        user: { id: guestSignupResponse.body.user.id },
      },
    });

    expect(leftRoom.currentMembersCount).toBe(1);
    expect(leftMember).toBeNull();
  });

  it('DELETE /rooms/:id/leave 방장이 나가면 다음 멤버에게 방장이 위임', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host@gmail.com', '기존방장');
    const guestSignupResponse = await signupUser(httpApp, 'user@gmail.com', '다음방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser);
    await dataSource.getRepository(Room).update(room.id, {
      minAge: 20,
      maxAge: 30,
    });

    await request(httpApp())
      .post(`/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/rooms/${room.id}/leave`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(204);

    const updatedRoom = await dataSource.getRepository(Room).findOne({
      where: { id: room.id },
      relations: {
        hostUser: true,
      },
    });

    expect(updatedRoom).not.toBeNull();
    expect(updatedRoom?.hostUser.id).toBe(guestSignupResponse.body.user.id);
    expect(updatedRoom?.currentMembersCount).toBe(1);
  });
});

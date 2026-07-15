import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room, RoomType } from '../src/rooms/entities/room.entity';
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
      .post(`/api/v1/rooms/${room.id}/join`)
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
      .post(`/api/v1/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('이미 참여 중인 방이 있습니다.');
  });

  it('POST /rooms/quick-join 조건에 맞는 방에 빠르게 참여', async () => {
    const hostOneSignupResponse = await signupUser(httpApp, 'quick-host-1@gmail.com', '빠른방장1');
    const hostTwoSignupResponse = await signupUser(httpApp, 'quick-host-2@gmail.com', '빠른방장2');
    const guestSignupResponse = await signupUser(httpApp, 'quick-user@gmail.com', '빠른참여자');
    const hostOne = await dataSource.getRepository(User).findOneByOrFail({
      id: hostOneSignupResponse.body.user.id,
    });
    const hostTwo = await dataSource.getRepository(User).findOneByOrFail({
      id: hostTwoSignupResponse.body.user.id,
    });
    const firstRoom = await createRoomFixture(dataSource, hostOne, {
      title: '빠른 참여 후보 1',
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });
    const secondRoom = await createRoomFixture(dataSource, hostTwo, {
      title: '빠른 참여 후보 2',
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    const response = await request(httpApp())
      .post('/api/v1/rooms/quick-join')
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    expect(response.status).toBe(201);

    const joinedMember = await dataSource.getRepository(RoomMember).findOne({
      where: {
        user: { id: guestSignupResponse.body.user.id },
      },
      relations: {
        room: true,
      },
    });

    expect(joinedMember).not.toBeNull();
    expect([firstRoom.id, secondRoom.id]).toContain(joinedMember!.room.id);

    const joinedRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: joinedMember!.room.id,
    });

    expect(joinedRoom.currentMembersCount).toBe(2);
  });

  it('POST /rooms/quick-join 참여 가능한 방이 없으면 실패', async () => {
    const hostSignupResponse = await signupUser(
      httpApp,
      'quick-no-room-host@gmail.com',
      '여성방장',
    );
    const guestSignupResponse = await signupUser(
      httpApp,
      'quick-no-room-user@gmail.com',
      '남성유저',
    );
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });

    await createRoomFixture(dataSource, hostUser, {
      roomType: RoomType.FEMALE,
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    const response = await request(httpApp())
      .post('/api/v1/rooms/quick-join')
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('현재 참여할 수 있는 방이 없습니다.');
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
      .post(`/api/v1/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/leave`)
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
      .post(`/api/v1/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/leave`)
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

  it('DELETE /rooms/:roomId/members/:userId 방장이 일반 멤버를 강제 퇴장', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-kick@gmail.com', '강퇴방장');
    const guestSignupResponse = await signupUser(httpApp, 'user-kick@gmail.com', '강퇴대상');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    await request(httpApp())
      .post(`/api/v1/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/members/${guestSignupResponse.body.user.id}`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(204);

    const updatedRoom = await dataSource.getRepository(Room).findOneByOrFail({
      id: room.id,
    });
    const kickedMember = await dataSource.getRepository(RoomMember).findOne({
      where: {
        room: { id: room.id },
        user: { id: guestSignupResponse.body.user.id },
      },
    });

    expect(updatedRoom.currentMembersCount).toBe(1);
    expect(kickedMember).toBeNull();
  });

  it('DELETE /rooms/:roomId/members/:userId 방장이 아닌 사용자가 강제 퇴장시키면 실패', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-kick-forbidden@gmail.com', '방장');
    const guestSignupResponse = await signupUser(
      httpApp,
      'user-kick-forbidden@gmail.com',
      '참여자',
    );
    const otherSignupResponse = await signupUser(
      httpApp,
      'other-kick-forbidden@gmail.com',
      '일반유저',
    );
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });

    await request(httpApp())
      .post(`/api/v1/rooms/${room.id}/join`)
      .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/members/${guestSignupResponse.body.user.id}`)
      .set('Authorization', `Bearer ${otherSignupResponse.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('강제퇴장은 방장만 할 수 있습니다.');
  });

  it('DELETE /rooms/:roomId/members/:userId 자기 자신을 강제 퇴장시키려 하면 실패', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-kick-self@gmail.com', '방장본인');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/members/${hostSignupResponse.body.user.id}`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('자기 자신을 강제퇴장 시킬 수 없습니다.');
  });

  it('DELETE /rooms/:roomId/members/:userId 참여하지 않은 사용자를 강제 퇴장시키려 하면 실패', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-kick-missing@gmail.com', '방장');
    const guestSignupResponse = await signupUser(
      httpApp,
      'user-kick-missing@gmail.com',
      '미참여유저',
    );
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser);

    const response = await request(httpApp())
      .delete(`/api/v1/rooms/${room.id}/members/${guestSignupResponse.body.user.id}`)
      .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('현재 방에 참여중인 사용자가 아닙니다.');
  });
});

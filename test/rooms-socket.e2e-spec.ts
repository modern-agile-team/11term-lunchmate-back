import { INestApplication } from '@nestjs/common';
import { AddressInfo } from 'net';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { io, Socket } from 'socket.io-client';
import { Room } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

type RoomSocketEventPayload = {
  roomId: number;
};

async function connectSocket(baseUrl: string, accessToken: string): Promise<Socket> {
  const socket = io(baseUrl, {
    auth: {
      token: accessToken,
    },
    transports: ['websocket'],
    forceNew: true,
    reconnection: false,
  });

  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', (error) => reject(error));
  });

  return socket;
}

function waitForSocketEvent(
  socket: Socket,
  eventName: 'room.members_updated' | 'room.deleted',
): Promise<RoomSocketEventPayload> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`${eventName} 이벤트를 받지 못했습니다.`));
    }, 5000);

    socket.once(eventName, (payload: RoomSocketEventPayload) => {
      clearTimeout(timeout);
      resolve(payload);
    });
  });
}

describe('Rooms Socket (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let baseUrl: string;

  beforeAll(async () => {
    app = (await createAuthUserTestApp()) as INestApplication<App>;
    await app.listen(0, '127.0.0.1');
    dataSource = app.get(DataSource);
    const server = app.getHttpServer() as unknown as { address(): AddressInfo };
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await clearRoomTables(dataSource);
  });

  it('방 참여가 발생하면 room.members_updated 이벤트를 받는다', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'socket-host@gmail.com', '소켓방장');
    const guestSignupResponse = await signupUser(httpApp, 'socket-guest@gmail.com', '소켓참여자');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '소켓 참여 테스트 방',
      currentMembersCount: 1,
      minAge: 20,
      maxAge: 30,
    });
    const socket = await connectSocket(baseUrl, hostSignupResponse.body.accessToken);

    try {
      socket.emit('room.join', { roomId: room.id });

      const membersUpdatedPromise = waitForSocketEvent(socket, 'room.members_updated');

      const response = await request(app.getHttpServer())
        .post(`/rooms/${room.id}/join`)
        .set('Authorization', `Bearer ${guestSignupResponse.body.accessToken}`);

      expect(response.status).toBe(201);

      const payload = await membersUpdatedPromise;

      expect(payload).toEqual({
        roomId: room.id,
      });
    } finally {
      socket.disconnect();
    }
  });

  it('방이 삭제되면 room.deleted 이벤트를 받는다', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'socket-delete-host@gmail.com', '삭제방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '소켓 삭제 테스트 방',
    });
    const socket = await connectSocket(baseUrl, hostSignupResponse.body.accessToken);

    try {
      socket.emit('room.join', { roomId: room.id });

      const roomDeletedPromise = waitForSocketEvent(socket, 'room.deleted');

      const response = await request(app.getHttpServer())
        .delete(`/rooms/${room.id}`)
        .set('Authorization', `Bearer ${hostSignupResponse.body.accessToken}`);

      expect(response.status).toBe(204);

      const payload = await roomDeletedPromise;

      expect(payload).toEqual({
        roomId: room.id,
      });

      const deletedRoom = await dataSource.getRepository(Room).findOne({
        where: { id: room.id },
        withDeleted: true,
      });

      expect(deletedRoom?.deletedAt).not.toBeNull();
    } finally {
      socket.disconnect();
    }
  });

  function httpApp(): App {
    return app.getHttpServer();
  }
});

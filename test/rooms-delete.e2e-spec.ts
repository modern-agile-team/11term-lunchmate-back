import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { Room } from '../src/rooms/entities/room.entity';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';
import { clearRoomTables, createRoomFixture, signupUser } from './rooms.e2e-helper';

jest.setTimeout(30000);

describe('Rooms Delete (e2e)', () => {
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

  it('DELETE /rooms/:id 방장이 방을 삭제한다', async () => {
    const signupResponse = await signupUser(httpApp, 'host-delete@gmail.com', '삭제방장');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: signupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '삭제 대상 방',
    });

    const response = await request(httpApp())
      .delete(`/rooms/${room.id}`)
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(204);

    const deletedRoom = await dataSource.getRepository(Room).findOneBy({
      id: room.id,
    });

    expect(deletedRoom).toBeNull();
  });

  it('DELETE /rooms/:id 방장이 아닌 사용자가 삭제하면 실패한다', async () => {
    const hostSignupResponse = await signupUser(httpApp, 'host-delete-forbidden@gmail.com', '방장');
    const otherSignupResponse = await signupUser(httpApp, 'guest-delete-forbidden@gmail.com', '일반유저');
    const hostUser = await dataSource.getRepository(User).findOneByOrFail({
      id: hostSignupResponse.body.user.id,
    });
    const room = await createRoomFixture(dataSource, hostUser, {
      title: '삭제 권한 체크 방',
    });

    const response = await request(httpApp())
      .delete(`/rooms/${room.id}`)
      .set('Authorization', `Bearer ${otherSignupResponse.body.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body.error.message).toBe('방장만 방을 삭제할 수 있습니다.');
  });

  it('DELETE /rooms/:id 존재하지 않는 방을 삭제하면 실패한다', async () => {
    const signupResponse = await signupUser(httpApp, 'host-delete-notfound@gmail.com', '없는방삭제');

    const response = await request(httpApp())
      .delete('/rooms/999999')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body.error.message).toBe('존재하지 않는 방입니다.');
  });
});

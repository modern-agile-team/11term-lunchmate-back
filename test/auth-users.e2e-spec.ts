import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { User } from '../src/users/entities/user.entity';
import { createAuthUserTestApp } from './test-app';

jest.setTimeout(30000);

describe('Auth and Users (e2e)', () => {
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
    await dataSource.createQueryBuilder().delete().from(User).execute();
  });

  it('회원가입 성공', async () => {
    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'alpha@example.com',
      password: 'password1234',
      name: '알파',
      nickname: 'alpha',
      profileImageUrl: 'https://example.com/a.png',
      bio: '점심 친구 구해요',
      mbti: 'INTJ',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('alpha@example.com');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.user.hashedPassword).toBeUndefined();

    const createdUser = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.hashedPassword')
      .where('user.email = :email', { email: 'alpha@example.com' })
      .getOne();

    expect(createdUser).toBeDefined();
    expect(createdUser?.hashedPassword).not.toBe('password1234');
  });

  it('이메일 중복 회원가입 실패', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'duplicate@example.com',
      password: 'password1234',
      name: '유저',
      nickname: 'dup-one',
    });

    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'duplicate@example.com',
      password: 'password1234',
      name: '다른유저',
      nickname: 'dup-two',
    });

    expect(response.status).toBe(409);
  });

  it('닉네임 중복 회원가입 실패', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'first@example.com',
      password: 'password1234',
      name: '유저',
      nickname: 'same-nickname',
    });

    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'second@example.com',
      password: 'password1234',
      name: '다른유저',
      nickname: 'same-nickname',
    });

    expect(response.status).toBe(409);
  });

  it('로그인 성공', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'login@example.com',
      password: 'password1234',
      name: '로그인유저',
      nickname: 'login-user',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'login@example.com',
      password: 'password1234',
    });

    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('login@example.com');
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
  });

  it('비밀번호 불일치 로그인 실패', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'wrong-password@example.com',
      password: 'password1234',
      name: '로그인유저',
      nickname: 'wrong-password-user',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'wrong-password@example.com',
      password: 'invalid-password',
    });

    expect(response.status).toBe(401);
  });

  it('존재하지 않는 사용자 로그인 실패', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'missing@example.com',
      password: 'password1234',
    });

    expect(response.status).toBe(401);
  });

  it('refresh 성공 및 새 access token 발급', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'refresh@example.com',
      password: 'password1234',
      name: '리프레시유저',
      nickname: 'refresh-user',
    });

    const response = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: signupResponse.body.refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).not.toBe(signupResponse.body.refreshToken);

    const reusedRefreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: signupResponse.body.refreshToken,
      });

    expect(reusedRefreshResponse.status).toBe(401);
  });

  it('잘못된 refresh token 거부', async () => {
    const response = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: 'invalid.refresh.token.value',
    });

    expect(response.status).toBe(401);
  });

  it('로그아웃 후 refresh 재사용 실패', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'logout@example.com',
      password: 'password1234',
      name: '로그아웃유저',
      nickname: 'logout-user',
    });

    const logoutResponse = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(logoutResponse.status).toBe(204);

    const refreshResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: signupResponse.body.refreshToken,
    });

    expect(refreshResponse.status).toBe(401);

    const logoutAgainResponse = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(logoutAgainResponse.status).toBe(401);
  });

  it('같은 refresh token 동시 요청 시 한 번만 성공', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'refresh-race@example.com',
      password: 'password1234',
      name: '리프레시경쟁유저',
      nickname: 'refresh-race-user',
    });

    const refreshToken = signupResponse.body.refreshToken;

    const [firstResponse, secondResponse] = await Promise.all([
      request(app.getHttpServer()).post('/auth/refresh').send({
        refreshToken,
      }),
      request(app.getHttpServer()).post('/auth/refresh').send({
        refreshToken,
      }),
    ]);

    const statuses = [firstResponse.status, secondResponse.status].sort();

    expect(statuses).toEqual([200, 401]);
  });

  it('GET /users/:userId 공개 프로필 조회 성공', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'public@example.com',
      password: 'password1234',
      name: '공개유저',
      nickname: 'public-user',
      bio: '안녕하세요',
      mbti: 'ENFP',
    });

    const response = await request(app.getHttpServer()).get(`/users/${signupResponse.body.user.id}`);

    expect(response.status).toBe(200);
    expect(response.body.email).toBeUndefined();
    expect(response.body.name).toBe('공개유저');
  });

  it('GET /users/me 인증 없이 접근 시 401', async () => {
    const response = await request(app.getHttpServer()).get('/users/me');

    expect(response.status).toBe(401);
  });

  it('PATCH /users/me 프로필 수정 성공', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'update@example.com',
      password: 'password1234',
      name: '수정전',
      nickname: 'update-user',
    });

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        name: '수정후',
        bio: '프로필 수정 완료',
        mbti: 'ISTP',
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('수정후');
    expect(response.body.bio).toBe('프로필 수정 완료');
    expect(response.body.mbti).toBe('ISTP');
  });

  it('PATCH /users/me 에서 중복 닉네임 거부', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'first-user@example.com',
      password: 'password1234',
      name: '첫번째',
      nickname: 'taken-nickname',
    });

    const secondUser = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'second-user@example.com',
      password: 'password1234',
      name: '두번째',
      nickname: 'second-user',
    });

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${secondUser.body.accessToken}`)
      .send({
        nickname: 'taken-nickname',
      });

    expect(response.status).toBe(409);
  });
});

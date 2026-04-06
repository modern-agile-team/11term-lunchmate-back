import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { AUTH_ERROR_MESSAGES } from '../src/auth/auth.constants';
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

  // Assert the error response shape produced by AllExceptionFilter.
  function expectExceptionFilterErrorResponse(
    response: request.Response,
    statusCode: number,
    message: string,
  ): void {
    expect(response.status).toBe(statusCode);
    expect(response.body.success).toBe(false);
    expect(response.body.error).toEqual({
      statusCode,
      message,
    });
  }

  it('회원가입 성공', async () => {
    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'alpha@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'alpha',
      schoolInfo: 'Hongik University',
      introduce: '점심 친구 구해요',
      mbti: 'INTJ',
    });

    expect(response.status).toBe(201);
    expect(response.body.user.email).toBe('alpha@example.com');
    expect(response.body.user.schoolInfo).toBe('Hongik University');
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
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'dup-one',
      schoolInfo: 'Hongik University',
    });

    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'duplicate@example.com',
      password: 'password1234',
      birthDate: '1998-02-02',
      gender: 'FEMALE',
      nickname: 'dup-two',
      schoolInfo: 'Yonsei University',
    });

    expectExceptionFilterErrorResponse(response, 409, 'Email already exists.');
  });

  it('닉네임 중복 회원가입 실패', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'first@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'same-nickname',
      schoolInfo: 'Hongik University',
    });

    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'second@example.com',
      password: 'password1234',
      birthDate: '1998-02-02',
      gender: 'FEMALE',
      nickname: 'same-nickname',
      schoolInfo: 'Yonsei University',
    });

    expectExceptionFilterErrorResponse(response, 409, 'Nickname already exists.');
  });

  it('로그인 성공', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'login@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'login-user',
      schoolInfo: 'Hongik University',
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
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'wrong-password-user',
      schoolInfo: 'Hongik University',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'wrong-password@example.com',
      password: 'invalid-password',
    });

    expectExceptionFilterErrorResponse(response, 401, AUTH_ERROR_MESSAGES.invalidCredentials);
  });

  it('존재하지 않는 사용자 로그인 실패', async () => {
    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'missing@example.com',
      password: 'password1234',
    });

    expectExceptionFilterErrorResponse(response, 401, AUTH_ERROR_MESSAGES.invalidCredentials);
  });

  it('refresh 성공 및 새 access token 발급', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'refresh@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'refresh-user',
      schoolInfo: 'Hongik University',
    });

    const response = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: signupResponse.body.refreshToken,
    });

    expect(response.status).toBe(200);
    expect(response.body.accessToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).toEqual(expect.any(String));
    expect(response.body.refreshToken).not.toBe(signupResponse.body.refreshToken);

    const reusedRefreshResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: signupResponse.body.refreshToken,
    });

    expectExceptionFilterErrorResponse(
      reusedRefreshResponse,
      401,
      AUTH_ERROR_MESSAGES.invalidRefreshToken,
    );
  });

  it('잘못된 refresh token 거부', async () => {
    const response = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: 'invalid.refresh.token.value',
    });

    expectExceptionFilterErrorResponse(response, 401, AUTH_ERROR_MESSAGES.invalidRefreshToken);
  });

  it('로그아웃 후 refresh 재사용 실패', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'logout@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'logout-user',
      schoolInfo: 'Hongik University',
    });

    const logoutResponse = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(logoutResponse.status).toBe(204);

    const refreshResponse = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken: signupResponse.body.refreshToken,
    });

    expectExceptionFilterErrorResponse(
      refreshResponse,
      401,
      AUTH_ERROR_MESSAGES.invalidRefreshToken,
    );

    const logoutAgainResponse = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expectExceptionFilterErrorResponse(logoutAgainResponse, 401, 'Unauthorized');
  });

  it('같은 refresh token 동시 요청 시 한 번만 성공', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'refresh-race@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'refresh-race-user',
      schoolInfo: 'Hongik University',
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
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'public-user',
      schoolInfo: 'Hongik University',
      introduce: '안녕하세요',
      mbti: 'ENFP',
    });

    const response = await request(app.getHttpServer()).get(
      `/users/${signupResponse.body.user.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body.email).toBeUndefined();
    expect(response.body.nickname).toBe('public-user');
    expect(response.body.introduce).toBe('안녕하세요');
  });

  it('GET /users/me 인증 없이 접근 시 401', async () => {
    const response = await request(app.getHttpServer()).get('/users/me');

    expectExceptionFilterErrorResponse(response, 401, 'Unauthorized');
  });

  it('PATCH /users/me 프로필 수정 성공', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'update@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'update-user',
      schoolInfo: 'Hongik University',
    });

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        schoolInfo: 'Yonsei University',
        introduce: '프로필 수정 완료',
        mbti: 'ISTP',
      });

    expect(response.status).toBe(200);
    expect(response.body.schoolInfo).toBe('Yonsei University');
    expect(response.body.introduce).toBe('프로필 수정 완료');
    expect(response.body.mbti).toBe('ISTP');
  });

  it('PATCH /users/me 변경이 없으면 저장 없이 현재 정보 반환', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'noop@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'noop-user',
      schoolInfo: 'Hongik University',
      introduce: '그대로 유지',
      mbti: 'INTJ',
    });

    const beforeUpdate = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.updatedAt')
      .where('user.id = :userId', { userId: signupResponse.body.user.id })
      .getOne();

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`)
      .send({
        schoolInfo: 'Hongik University',
        introduce: '그대로 유지',
        mbti: 'INTJ',
      });

    const afterUpdate = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.updatedAt')
      .where('user.id = :userId', { userId: signupResponse.body.user.id })
      .getOne();

    expect(response.status).toBe(200);
    expect(response.body.schoolInfo).toBe('Hongik University');
    expect(response.body.introduce).toBe('그대로 유지');
    expect(response.body.mbti).toBe('INTJ');
    expect(afterUpdate?.updatedAt).toBe(beforeUpdate?.updatedAt);
  });

  it('PATCH /users/me 에서 중복 닉네임 거부', async () => {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'first-user@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'taken-nickname',
      schoolInfo: 'Hongik University',
    });

    const secondUser = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'second-user@example.com',
      password: 'password1234',
      birthDate: '1998-02-02',
      gender: 'FEMALE',
      nickname: 'second-user',
      schoolInfo: 'Yonsei University',
    });

    const response = await request(app.getHttpServer())
      .patch('/users/me')
      .set('Authorization', `Bearer ${secondUser.body.accessToken}`)
      .send({
        nickname: 'taken-nickname',
      });

    expectExceptionFilterErrorResponse(response, 409, 'Nickname already exists.');
  });

  it('DELETE /users/me 후 soft delete 반영 및 재로그인 실패', async () => {
    const signupResponse = await request(app.getHttpServer()).post('/auth/signup').send({
      email: 'withdraw@example.com',
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname: 'withdraw-user',
      schoolInfo: 'Hongik University',
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${signupResponse.body.accessToken}`);

    expect(deleteResponse.status).toBe(204);

    const deletedUser = await dataSource
      .getRepository(User)
      .createQueryBuilder('user')
      .addSelect('user.deletedAt')
      .withDeleted()
      .where('user.id = :userId', { userId: signupResponse.body.user.id })
      .getOne();

    expect(deletedUser?.deletedAt).toBeInstanceOf(Date);

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'withdraw@example.com',
      password: 'password1234',
    });

    expectExceptionFilterErrorResponse(loginResponse, 401, AUTH_ERROR_MESSAGES.invalidCredentials);
  });
});

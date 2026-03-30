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

    expect(response.status).toBe(409);
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
});

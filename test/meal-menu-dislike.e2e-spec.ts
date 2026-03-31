import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { ActionType, MealMenuReaction } from '../src/meal-menus/entities/meal-menu-reaction.entity';
import { User } from '../src/users/entities/user.entity';
import { createMealMenuAuthTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menu Dislike (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createMealMenuAuthTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.createQueryBuilder().delete().from(MealMenuReaction).execute();
    await dataSource.createQueryBuilder().delete().from(MealMenu).execute();
    await dataSource.createQueryBuilder().delete().from(User).execute();
  });

  async function signupAndGetAccessToken(email: string, nickname: string): Promise<string> {
    const response = await request(app.getHttpServer()).post('/auth/signup').send({
      email,
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname,
      schoolInfo: 'Hongik University',
    });

    return response.body.accessToken as string;
  }

  async function createMealMenu(params?: {
    mealDate?: string;
    mealType?: MealType;
    menuName?: string;
    likeCount?: number;
    dislikeCount?: number;
  }): Promise<MealMenu> {
    return dataSource.getRepository(MealMenu).save({
      schoolInfo: 'Hongik University',
      mealDate: params?.mealDate ?? '2026-03-31',
      mealType: params?.mealType ?? MealType.LUNCH,
      menuName: params?.menuName ?? '돈까스',
      price: 5500,
      calorie: 800,
      likeCount: params?.likeCount ?? 0,
      dislikeCount: params?.dislikeCount ?? 0,
    });
  }

  it('학식 싫어요 성공', async () => {
    const accessToken = await signupAndGetAccessToken('dislike@example.com', 'dislike-user');
    const mealMenu = await createMealMenu();

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/dislike`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.DISLIKE,
      likeCount: 0,
      dislikeCount: 1,
    });

    const savedReaction = await dataSource.getRepository(MealMenuReaction).findOne({
      where: {
        mealMenu: { id: mealMenu.id },
      },
      relations: {
        user: true,
        mealMenu: true,
      },
    });

    expect(savedReaction?.actionType).toBe(ActionType.DISLIKE);
  });

  it('인증 없이 요청 시 401', async () => {
    const mealMenu = await createMealMenu();

    const response = await request(app.getHttpServer()).post(
      `/meal-menus/${mealMenu.id}/dislike`,
    );

    expect(response.status).toBe(401);
  });

  it('존재하지 않는 학식 싫어요 시 404', async () => {
    const accessToken = await signupAndGetAccessToken('missing-dislike@example.com', 'missing-dislike-user');

    const response = await request(app.getHttpServer())
      .post('/meal-menus/999999/dislike')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('기존 LIKE에서 싫어요 호출 시 DISLIKE로 전환되고 카운트가 교정됨', async () => {
    const accessToken = await signupAndGetAccessToken('switch-dislike@example.com', 'switch-dislike-user');
    const mealMenu = await createMealMenu({ likeCount: 1, dislikeCount: 0 });
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: 'switch-dislike@example.com' });

    await dataSource.getRepository(MealMenuReaction).save({
      actionType: ActionType.LIKE,
      user,
      mealMenu,
    });

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/dislike`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.DISLIKE,
      likeCount: 0,
      dislikeCount: 1,
    });

    const savedReaction = await dataSource.getRepository(MealMenuReaction).findOneByOrFail({
      user: { id: user.id },
      mealMenu: { id: mealMenu.id },
    });

    expect(savedReaction.actionType).toBe(ActionType.DISLIKE);
  });

  it('이미 DISLIKE인 상태에서 다시 호출 시 200 멱등 성공', async () => {
    const accessToken = await signupAndGetAccessToken('idempotent-dislike@example.com', 'idempotent-dislike-user');
    const mealMenu = await createMealMenu({ likeCount: 0, dislikeCount: 1 });
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: 'idempotent-dislike@example.com' });

    await dataSource.getRepository(MealMenuReaction).save({
      actionType: ActionType.DISLIKE,
      user,
      mealMenu,
    });

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/dislike`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.DISLIKE,
      likeCount: 0,
      dislikeCount: 1,
    });

    const reactions = await dataSource.getRepository(MealMenuReaction).find({
      where: {
        user: { id: user.id },
        mealMenu: { id: mealMenu.id },
      },
    });

    expect(reactions).toHaveLength(1);
  });

  it('목록/상세 응답의 카운트가 변경 후 값과 일치함', async () => {
    const accessToken = await signupAndGetAccessToken('counts-dislike@example.com', 'counts-dislike-user');
    const mealMenu = await createMealMenu();

    await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/dislike`)
      .set('Authorization', `Bearer ${accessToken}`);

    const listResponse = await request(app.getHttpServer()).get('/meal-menus');
    const detailResponse = await request(app.getHttpServer()).get(`/meal-menus/${mealMenu.id}`);

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(listResponse.body.items[0].likeCount).toBe(0);
    expect(listResponse.body.items[0].dislikeCount).toBe(1);
    expect(detailResponse.body.likeCount).toBe(0);
    expect(detailResponse.body.dislikeCount).toBe(1);
  });
});

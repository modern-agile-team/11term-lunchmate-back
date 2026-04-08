import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { ActionType, MealMenuReaction } from '../src/meal-menus/entities/meal-menu-reaction.entity';
import { User } from '../src/users/entities/user.entity';
import { createMealMenuAuthTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menu Like (e2e)', () => {
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

  it('학식 좋아요 성공', async () => {
    const accessToken = await signupAndGetAccessToken('like@example.com', 'like-user');
    const mealMenu = await createMealMenu();

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.LIKE,
      likeCount: 1,
      dislikeCount: 0,
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

    expect(savedReaction?.actionType).toBe(ActionType.LIKE);
  });

  it('인증 없이 요청 시 401', async () => {
    const mealMenu = await createMealMenu();

    const response = await request(app.getHttpServer()).post(`/meal-menus/${mealMenu.id}/like`);

    expect(response.status).toBe(401);
  });

  it('존재하지 않는 학식 좋아요 시 404', async () => {
    const accessToken = await signupAndGetAccessToken('missing@example.com', 'missing-user');

    const response = await request(app.getHttpServer())
      .post('/meal-menus/999999/like')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(404);
  });

  it('기존 DISLIKE에서 좋아요 호출 시 LIKE로 전환되고 카운트가 교정됨', async () => {
    const accessToken = await signupAndGetAccessToken('switch@example.com', 'switch-user');
    const mealMenu = await createMealMenu({ likeCount: 0, dislikeCount: 1 });
    const user = await dataSource.getRepository(User).findOneByOrFail({ email: 'switch@example.com' });

    await dataSource.getRepository(MealMenuReaction).save({
      actionType: ActionType.DISLIKE,
      user,
      mealMenu,
    });

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.LIKE,
      likeCount: 1,
      dislikeCount: 0,
    });

    const savedReaction = await dataSource.getRepository(MealMenuReaction).findOneByOrFail({
      user: { id: user.id },
      mealMenu: { id: mealMenu.id },
    });

    expect(savedReaction.actionType).toBe(ActionType.LIKE);
  });

  it('이미 LIKE인 상태에서 다시 호출 시 200 멱등 성공', async () => {
    const accessToken = await signupAndGetAccessToken('idempotent@example.com', 'idempotent-user');
    const mealMenu = await createMealMenu({ likeCount: 1, dislikeCount: 0 });
    const user = await dataSource
      .getRepository(User)
      .findOneByOrFail({ email: 'idempotent@example.com' });

    await dataSource.getRepository(MealMenuReaction).save({
      actionType: ActionType.LIKE,
      user,
      mealMenu,
    });

    const response = await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      actionType: ActionType.LIKE,
      likeCount: 1,
      dislikeCount: 0,
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
    const accessToken = await signupAndGetAccessToken('counts@example.com', 'counts-user');
    const mealMenu = await createMealMenu();

    await request(app.getHttpServer())
      .post(`/meal-menus/${mealMenu.id}/like`)
      .set('Authorization', `Bearer ${accessToken}`);

    const listResponse = await request(app.getHttpServer()).get('/meal-menus');
    const detailResponse = await request(app.getHttpServer()).get(`/meal-menus/${mealMenu.id}`);

    expect(listResponse.status).toBe(200);
    expect(detailResponse.status).toBe(200);
    expect(listResponse.body.items[0].likeCount).toBe(1);
    expect(listResponse.body.items[0].dislikeCount).toBe(0);
    expect(detailResponse.body.likeCount).toBe(1);
    expect(detailResponse.body.dislikeCount).toBe(0);
  });
});

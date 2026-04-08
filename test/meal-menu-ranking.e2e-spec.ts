import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { ActionType } from '../src/meal-menus/entities/meal-menu-reaction.entity';
import { createMealMenuTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menu Ranking (e2e)', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;

  beforeAll(async () => {
    app = (await createMealMenuTestApp()) as INestApplication<App>;
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await dataSource.createQueryBuilder().delete().from(MealMenu).execute();
  });

  async function createMealMenu(params: {
    mealDate: string;
    mealType: MealType;
    menuName: string;
    price?: number | null;
    calorie?: number | null;
    likeCount?: number;
    dislikeCount?: number;
  }): Promise<MealMenu> {
    return dataSource.getRepository(MealMenu).save({
      schoolInfo: 'Hongik University',
      mealDate: params.mealDate,
      mealType: params.mealType,
      menuName: params.menuName,
      price: params.price ?? null,
      calorie: params.calorie ?? null,
      likeCount: params.likeCount ?? 0,
      dislikeCount: params.dislikeCount ?? 0,
    });
  }

  it('actionType=LIKE 랭킹 조회 성공', async () => {
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'A',
      likeCount: 1,
      dislikeCount: 0,
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'B',
      likeCount: 5,
      dislikeCount: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.LIKE });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].menuName).toBe('B');
    expect(response.body.items[0].likeCount).toBe(5);
  });

  it('actionType=DISLIKE 랭킹 조회 성공', async () => {
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'A',
      likeCount: 1,
      dislikeCount: 2,
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'B',
      likeCount: 5,
      dislikeCount: 7,
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.DISLIKE });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items[0].menuName).toBe('B');
    expect(response.body.items[0].dislikeCount).toBe(7);
  });

  it('mealDate 필터 적용', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: 'A',
      likeCount: 3,
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'B',
      likeCount: 5,
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.LIKE, mealDate: '2026-03-31' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].mealDate).toBe('2026-03-31');
  });

  it('mealType 필터 적용', async () => {
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.BREAKFAST,
      menuName: 'A',
      dislikeCount: 2,
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.DINNER,
      menuName: 'B',
      dislikeCount: 5,
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.DISLIKE, mealType: MealType.DINNER });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].mealType).toBe(MealType.DINNER);
  });

  it('결과 없을 때 빈 배열 반환', async () => {
    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.LIKE });

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('인증 없이도 조회 가능', async () => {
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: 'A',
      likeCount: 1,
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: ActionType.LIKE });

    expect(response.status).toBe(200);
  });

  it('actionType 누락 시 400', async () => {
    const response = await request(app.getHttpServer()).get('/meal-menus/rankings');

    expect(response.status).toBe(400);
  });

  it('잘못된 actionType 값 시 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/meal-menus/rankings')
      .query({ actionType: 'INVALID' });

    expect(response.status).toBe(400);
  });
});

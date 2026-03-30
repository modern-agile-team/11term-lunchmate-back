import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { createMealMenuTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menu Detail (e2e)', () => {
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
    schoolInfo?: string;
    mealDate: string;
    mealType: MealType;
    menuName: string;
    price?: number | null;
    calorie?: number | null;
    likeCount?: number;
    dislikeCount?: number;
  }): Promise<MealMenu> {
    return dataSource.getRepository(MealMenu).save({
      schoolInfo: params.schoolInfo ?? 'Hongik University',
      mealDate: params.mealDate,
      mealType: params.mealType,
      menuName: params.menuName,
      price: params.price ?? null,
      calorie: params.calorie ?? null,
      likeCount: params.likeCount ?? 0,
      dislikeCount: params.dislikeCount ?? 0,
    });
  }

  it('학식 상세 조회 성공', async () => {
    const mealMenu = await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '제육볶음',
      price: 6000,
      calorie: 750,
      likeCount: 5,
      dislikeCount: 2,
    });

    const response = await request(app.getHttpServer()).get(
      `/meal-menus/${mealMenu.id}`,
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: mealMenu.id,
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '제육볶음',
      price: 6000,
      calorie: 750,
      likeCount: 5,
      dislikeCount: 2,
    });
  });

  it('존재하지 않는 학식 조회 시 404', async () => {
    const response = await request(app.getHttpServer()).get('/meal-menus/999999');

    expect(response.status).toBe(404);
  });

  it('soft delete 된 학식 조회 시 404', async () => {
    const mealMenu = await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.DINNER,
      menuName: '우동',
    });

    await dataSource.getRepository(MealMenu).softDelete(mealMenu.id);

    const response = await request(app.getHttpServer()).get(
      `/meal-menus/${mealMenu.id}`,
    );

    expect(response.status).toBe(404);
  });

  it('인증 없이도 조회 가능', async () => {
    const mealMenu = await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.BREAKFAST,
      menuName: '토스트',
    });

    const response = await request(app.getHttpServer()).get(
      `/meal-menus/${mealMenu.id}`,
    );

    expect(response.status).toBe(200);
  });
});

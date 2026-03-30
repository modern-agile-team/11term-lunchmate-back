import { INestApplication } from '@nestjs/common';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { createMealMenuTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menu List (e2e)', () => {
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

  it('학식 목록 조회 성공', async () => {
    const mealMenu = await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '돈까스',
      price: 5500,
      calorie: 820,
      likeCount: 3,
      dislikeCount: 1,
    });

    const response = await request(app.getHttpServer()).get('/meal-menus');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0]).toEqual({
      id: mealMenu.id,
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '돈까스',
      price: 5500,
      calorie: 820,
      likeCount: 3,
      dislikeCount: 1,
    });
  });

  it('조건 없이 전체 목록 조회', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.BREAKFAST,
      menuName: '토스트',
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: '비빔밥',
    });

    const response = await request(app.getHttpServer()).get('/meal-menus');

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
  });

  it('mealDate 필터 조회', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '제육볶음',
    });
    await createMealMenu({
      mealDate: '2026-03-31',
      mealType: MealType.LUNCH,
      menuName: '김치찌개',
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus')
      .query({ mealDate: '2026-03-30' });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].mealDate).toBe('2026-03-30');
  });

  it('mealType 필터 조회', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.BREAKFAST,
      menuName: '샌드위치',
    });
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.DINNER,
      menuName: '우동',
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus')
      .query({ mealType: MealType.DINNER });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].mealType).toBe(MealType.DINNER);
  });

  it('mealType=ALL 조회', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.BREAKFAST,
      menuName: '계란빵',
    });
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '카레라이스',
    });

    const response = await request(app.getHttpServer())
      .get('/meal-menus')
      .query({ mealType: MealType.ALL });

    expect(response.status).toBe(200);
    expect(response.body.items).toHaveLength(2);
  });

  it('soft delete 된 학식 미노출', async () => {
    const mealMenu = await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '소불고기',
    });

    await dataSource.getRepository(MealMenu).softDelete(mealMenu.id);

    const response = await request(app.getHttpServer()).get('/meal-menus');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('결과 없을 때 빈 배열 반환', async () => {
    const response = await request(app.getHttpServer()).get('/meal-menus');

    expect(response.status).toBe(200);
    expect(response.body.items).toEqual([]);
  });

  it('인증 없이도 조회 가능', async () => {
    await createMealMenu({
      mealDate: '2026-03-30',
      mealType: MealType.LUNCH,
      menuName: '치킨마요',
    });

    const response = await request(app.getHttpServer()).get('/meal-menus');

    expect(response.status).toBe(200);
  });

  it('잘못된 mealType 입력 시 400', async () => {
    const response = await request(app.getHttpServer())
      .get('/meal-menus')
      .query({ mealType: 'INVALID' });

    expect(response.status).toBe(400);
  });
});

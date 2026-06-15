import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AUTH_ERROR_MESSAGES } from '../src/auth/auth.constants';
import { MealMenuComponentMapping } from '../src/meal-menus/entities/meal-menu-component-mapping.entity';
import { MealMenuComponent } from '../src/meal-menus/entities/meal-menu-component.entity';
import { ActionType, MealMenuReaction } from '../src/meal-menus/entities/meal-menu-reaction.entity';
import { MealMenu, MealType } from '../src/meal-menus/entities/meal-menu.entity';
import { User, UserRole } from '../src/users/entities/user.entity';
import { createMealMenuAuthTestApp } from './test-app';

jest.setTimeout(30000);

describe('Meal Menus (e2e)', () => {
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
    await dataSource.createQueryBuilder().delete().from(MealMenuComponentMapping).execute();
    await dataSource.createQueryBuilder().delete().from(MealMenu).execute();
    await dataSource.createQueryBuilder().delete().from(MealMenuComponent).execute();
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

  async function signupAndGetAdminAccessToken(email: string, nickname: string): Promise<string> {
    await request(app.getHttpServer()).post('/auth/signup').send({
      email,
      password: 'password1234',
      birthDate: '1999-01-01',
      gender: 'MALE',
      nickname,
      schoolInfo: 'Hongik University',
    });

    await dataSource.getRepository(User).update({ email }, { role: UserRole.ADMIN });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password: 'password1234',
    });

    return response.body.accessToken as string;
  }

  async function createMealMenu(
    params: {
      schoolInfo?: string;
      mealType?: MealType;
      menuName?: string;
      price?: number | null;
      calorie?: number | null;
      likeCount?: number;
      dislikeCount?: number;
    } = {},
  ): Promise<MealMenu> {
    return dataSource.getRepository(MealMenu).save({
      schoolInfo: params.schoolInfo ?? 'Hongik University',
      mealType: params.mealType ?? MealType.LUNCH,
      menuName: params.menuName ?? '돈까스',
      price: params.price ?? 5500,
      calorie: params.calorie ?? 800,
      likeCount: params.likeCount ?? 0,
      dislikeCount: params.dislikeCount ?? 0,
    });
  }

  describe('Create', () => {
    it('ADMIN 사용자는 학식을 추가할 수 있다', async () => {
      const accessToken = await signupAndGetAdminAccessToken('admin@example.com', 'admin-user');

      const input = {
        schoolInfo: '인덕대학교 학생식당',
        mealType: MealType.LUNCH,
        menuName: '제육덮밥',
        price: 5000,
        calorie: 550,
        components: '밥 미역국 제육볶음 배추김치',
      };

      const response = await request(app.getHttpServer())
        .post('/meal-menus')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(input);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(Number),
        mealType: MealType.LUNCH,
        menuName: '제육덮밥',
        price: 5000,
        calorie: 550,
        likeCount: 0,
        dislikeCount: 0,
        components: ['밥', '미역국', '제육볶음', '배추김치'],
      });
    });

    it('인증 없이 학식 추가 요청 시 401', async () => {
      const response = await request(app.getHttpServer()).post('/meal-menus').send({
        schoolInfo: '인덕대학교 학생식당',
        mealType: MealType.LUNCH,
        menuName: '제육덮밥',
        price: 5000,
        calorie: 550,
        components: '밥 미역국 제육볶음 배추김치',
      });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('USER 사용자가 학식 추가 요청 시 403', async () => {
      const accessToken = await signupAndGetAccessToken('user@example.com', 'normal-user');

      const response = await request(app.getHttpServer())
        .post('/meal-menus')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          schoolInfo: '인덕대학교 학생식당',
          mealType: MealType.LUNCH,
          menuName: '제육덮밥',
          price: 5000,
          calorie: 550,
          components: '밥 미역국 제육볶음 배추김치',
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 403,
        message: AUTH_ERROR_MESSAGES.accessDenied,
      });
    });
  });

  describe('List', () => {
    it('학식 목록 조회 성공', async () => {
      const mealMenu = await createMealMenu({
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
        mealType: MealType.BREAKFAST,
        menuName: '토스트',
      });
      await createMealMenu({
        mealType: MealType.LUNCH,
        menuName: '비빔밥',
      });

      const response = await request(app.getHttpServer()).get('/meal-menus');

      expect(response.status).toBe(200);
      expect(response.body.items).toHaveLength(2);
    });

    it('mealType 필터 조회', async () => {
      await createMealMenu({
        mealType: MealType.BREAKFAST,
        menuName: '샌드위치',
      });
      await createMealMenu({
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
        mealType: MealType.BREAKFAST,
        menuName: '계란빵',
      });
      await createMealMenu({
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 400,
        message: [
          'mealType must be one of the following values: BREAKFAST, LUNCH, DINNER, ALL',
        ],
      });
    });
  });

  describe('Detail', () => {
    it('학식 상세 조회 성공', async () => {
      const mealMenu = await createMealMenu({
        mealType: MealType.LUNCH,
        menuName: '제육볶음',
        price: 6000,
        calorie: 750,
        likeCount: 5,
        dislikeCount: 2,
      });

      const response = await request(app.getHttpServer()).get(`/meal-menus/${mealMenu.id}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: mealMenu.id,
        mealType: MealType.LUNCH,
        menuName: '제육볶음',
        price: 6000,
        calorie: 750,
        likeCount: 5,
        dislikeCount: 2,
        components: [],
      });
    });

    it('존재하지 않는 학식 조회 시 404', async () => {
      const response = await request(app.getHttpServer()).get('/meal-menus/999999');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 404,
        message: 'Meal menu not found.',
      });
    });

    it('soft delete 된 학식 조회 시 404', async () => {
      const mealMenu = await createMealMenu({
        mealType: MealType.DINNER,
        menuName: '우동',
      });

      await dataSource.getRepository(MealMenu).softDelete(mealMenu.id);

      const response = await request(app.getHttpServer()).get(`/meal-menus/${mealMenu.id}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 404,
        message: 'Meal menu not found.',
      });
    });

    it('인증 없이도 조회 가능', async () => {
      const mealMenu = await createMealMenu({
        mealType: MealType.BREAKFAST,
        menuName: '토스트',
      });

      const response = await request(app.getHttpServer()).get(`/meal-menus/${mealMenu.id}`);

      expect(response.status).toBe(200);
    });
  });

  describe('Like', () => {
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('존재하지 않는 학식 좋아요 시 404', async () => {
      const accessToken = await signupAndGetAccessToken('missing@example.com', 'missing-user');

      const response = await request(app.getHttpServer())
        .post('/meal-menus/999999/like')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 404,
        message: 'Meal menu not found.',
      });
    });

    it('기존 DISLIKE에서 좋아요 호출 시 LIKE로 전환되고 카운트가 교정됨', async () => {
      const accessToken = await signupAndGetAccessToken('switch@example.com', 'switch-user');
      const mealMenu = await createMealMenu({ likeCount: 0, dislikeCount: 1 });
      const user = await dataSource
        .getRepository(User)
        .findOneByOrFail({ email: 'switch@example.com' });

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
      const accessToken = await signupAndGetAccessToken(
        'idempotent@example.com',
        'idempotent-user',
      );
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

  describe('Dislike', () => {
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 401,
        message: 'Unauthorized',
      });
    });

    it('존재하지 않는 학식 싫어요 시 404', async () => {
      const accessToken = await signupAndGetAccessToken(
        'missing-dislike@example.com',
        'missing-dislike-user',
      );

      const response = await request(app.getHttpServer())
        .post('/meal-menus/999999/dislike')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 404,
        message: 'Meal menu not found.',
      });
    });

    it('기존 LIKE에서 싫어요 호출 시 DISLIKE로 전환되고 카운트가 교정됨', async () => {
      const accessToken = await signupAndGetAccessToken(
        'switch-dislike@example.com',
        'switch-dislike-user',
      );
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
      const accessToken = await signupAndGetAccessToken(
        'idempotent-dislike@example.com',
        'idempotent-dislike-user',
      );
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
      const accessToken = await signupAndGetAccessToken(
        'counts-dislike@example.com',
        'counts-dislike-user',
      );
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

  describe('Ranking', () => {
    it('actionType=LIKE 랭킹 조회 성공', async () => {
      await createMealMenu({
        mealType: MealType.LUNCH,
        menuName: 'A',
        likeCount: 1,
        dislikeCount: 0,
      });
      await createMealMenu({
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
        mealType: MealType.LUNCH,
        menuName: 'A',
        likeCount: 1,
        dislikeCount: 2,
      });
      await createMealMenu({
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

    it('mealType 필터 적용', async () => {
      await createMealMenu({
        mealType: MealType.BREAKFAST,
        menuName: 'A',
        dislikeCount: 2,
      });
      await createMealMenu({
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
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 400,
        message: ['actionType must be one of the following values: LIKE, DISLIKE'],
      });
    });

    it('잘못된 actionType 값 시 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/meal-menus/rankings')
        .query({ actionType: 'INVALID' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toEqual({
        statusCode: 400,
        message: ['actionType must be one of the following values: LIKE, DISLIKE'],
      });
    });
  });
});

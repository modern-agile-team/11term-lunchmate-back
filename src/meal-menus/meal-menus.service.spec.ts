import { DataSource, EntityManager, InsertResult } from 'typeorm';
import { MealType } from './entities/meal-menu.entity';
import { MealMenuRepository } from './meal-menus.repository';
import { MealMenusService } from './meal-menus.service';
import { CreateMealMenuProps } from './types/meal-menu.type';

type Component = {
  id: number;
  name: string;
};

type SavedMealMenu = CreateMealMenuProps & {
  id: number;
  likeCount: number;
  dislikeCount: number;
};

type Mapping = {
  mealMenuId: number;
  componentId: number;
};

describe('MealMenusService', () => {
  let mealMenusService: MealMenusService;
  let fakeRepository: Pick<
    MealMenuRepository,
    | 'createMealMenu'
    | 'findExistingComponentsByName'
    | 'createMealMenuComponent'
    | 'createMealMenuComponentMapping'
    | 'findById'
  >;
  let components: Component[];
  let mealMenus: SavedMealMenu[];
  let mappings: Mapping[];

  const manager = {} as EntityManager;
  const dataSource = {
    transaction: async (callback: (manager: EntityManager) => Promise<number>) => callback(manager),
  } as DataSource;

  beforeEach(() => {
    components = [];
    mealMenus = [];
    mappings = [];

    fakeRepository = {
      createMealMenu: jest.fn(async (props: CreateMealMenuProps) => {
        const mealMenu = {
          id: mealMenus.length + 1,
          ...props,
          likeCount: 0,
          dislikeCount: 0,
        };

        mealMenus.push(mealMenu);

        return mealMenu as never;
      }),

      findExistingComponentsByName: jest.fn(async (names: string[]) => {
        return components.filter((component) => names.includes(component.name)) as never;
      }),

      createMealMenuComponent: jest.fn(async (newComponents: { name: string }[]) => {
        const identifiers = newComponents.map((component) => {
          const savedComponent = {
            id: components.length + 1,
            name: component.name,
          };

          components.push(savedComponent);

          return { id: savedComponent.id };
        });

        return { identifiers } as InsertResult;
      }),

      createMealMenuComponentMapping: jest.fn(
        async (mealMenuId: number, componentIds: number[]) => {
          mappings.push(
            ...componentIds.map((componentId) => ({
              mealMenuId,
              componentId,
            })),
          );
        },
      ),

      findById: jest.fn(async (mealMenuId: number) => {
        const mealMenu = mealMenus.find((item) => item.id === mealMenuId);

        if (!mealMenu) return null;

        return {
          ...mealMenu,
          mealMenuComponentMappings: mappings
            .filter((mapping) => mapping.mealMenuId === mealMenuId)
            .map((mapping) => ({
              mealMenuComponent: components.find(
                (component) => component.id === mapping.componentId,
              ),
            })),
        } as never;
      }),
    };

    mealMenusService = new MealMenusService(fakeRepository as MealMenuRepository, dataSource);
  });

  describe('createMealMenu', () => {
    it('새 구성 요소를 가진 학식을 생성한다', async () => {
      const input = {
        schoolInfo: '인덕대학교',
        mealType: MealType.LUNCH,
        menuName: '교직원식단',
        price: 6000,
        calorie: 820,
        components: '백미밥 맑은콩나물해장국 중화제육볶음 포기김치 그린샐러드',
      };

      const result = await mealMenusService.createMealMenu(input);

      expect(result).toMatchObject({
        id: 1,
        schoolInfo: '인덕대학교',
        mealType: MealType.LUNCH,
        menuName: '교직원식단',
        price: 6000,
        calorie: 820,
        likeCount: 0,
        dislikeCount: 0,
        mealMenuComponentMappings: [
          { mealMenuComponent: { id: 1, name: '백미밥' } },
          { mealMenuComponent: { id: 2, name: '맑은콩나물해장국' } },
          { mealMenuComponent: { id: 3, name: '중화제육볶음' } },
          { mealMenuComponent: { id: 4, name: '포기김치' } },
          { mealMenuComponent: { id: 5, name: '그린샐러드' } },
        ],
      });
    });

    it('이미 있는 구성 요소는 재사용하고 중복 입력은 한 번만 반영한다', async () => {
      components.push({ id: 1, name: '포기김치' });

      const input = {
        schoolInfo: '인덕대학교',
        mealType: MealType.DINNER,
        menuName: '저녁식단',
        price: 5500,
        calorie: 700,
        components: '백미밥 포기김치 포기김치',
      };

      const result = await mealMenusService.createMealMenu(input);

      expect(result).toMatchObject({
        id: 1,
        mealType: MealType.DINNER,
        menuName: '저녁식단',
        mealMenuComponentMappings: [
          { mealMenuComponent: { id: 1, name: '포기김치' } },
          { mealMenuComponent: { id: 2, name: '백미밥' } },
        ],
      });
    });
  });
});

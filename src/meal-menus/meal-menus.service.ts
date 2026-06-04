import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { ActionType } from './entities/meal-menu-reaction.entity';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuRepository } from './meal-menus.repository';
import { CreateMealMenuDto } from './dto/create-meal-menu.dto';
import { DataSource, EntityManager } from 'typeorm';
import { CreateMealMenuProps } from './types/meal-menu.type';

@Injectable()
export class MealMenusService {
  constructor(
    private readonly mealMenuRepository: MealMenuRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createMealMenu(createMealMenuDto: CreateMealMenuDto): Promise<MealMenu> {
    const { mealMenuProps, componentNames } = this.buildMealMenuProps(createMealMenuDto);

    const mealMenuId = await this.dataSource.transaction(async (manager) => {
      const newMealMenu = await this.mealMenuRepository.createMealMenu(mealMenuProps, manager);

      const mealMenuId = newMealMenu.id;

      const componentIds = await this.findOrCreateComponentIds(componentNames, manager);

      await this.mealMenuRepository.createMealMenuComponentMapping(
        mealMenuId,
        componentIds,
        manager,
      );

      return mealMenuId;
    });

    return this.findMealMenuById(mealMenuId);
  }

  async findMealMenus(query: GetMealMenuListQueryDto): Promise<MealMenu[]> {
    return this.mealMenuRepository.findMany({
      mealType: query.mealType,
    });
  }

  async findMealMenuRankings(query: GetMealMenuRankingQueryDto): Promise<MealMenu[]> {
    return this.mealMenuRepository.findRankings({
      mealType: query.mealType,
      actionType: query.actionType,
    });
  }

  async findMealMenuById(mealMenuId: number): Promise<MealMenu> {
    return this.findMealMenuOrFail(mealMenuId);
  }

  async likeMealMenu(userId: number, mealMenuId: number): Promise<MealMenu> {
    return this.applyReactionOrFail(userId, mealMenuId, ActionType.LIKE);
  }

  async dislikeMealMenu(userId: number, mealMenuId: number): Promise<MealMenu> {
    return this.applyReactionOrFail(userId, mealMenuId, ActionType.DISLIKE);
  }

  private async applyReactionOrFail(
    userId: number,
    mealMenuId: number,
    actionType: ActionType,
  ): Promise<MealMenu> {
    await this.findMealMenuOrFail(mealMenuId);

    return this.mealMenuRepository.applyReaction(userId, mealMenuId, actionType);
  }

  // Service owns MealMenu domain lookup and state transitions while controllers
  // choose how those domain results are exposed in HTTP responses.
  private async findMealMenuOrFail(mealMenuId: number): Promise<MealMenu> {
    const mealMenu = await this.mealMenuRepository.findById(mealMenuId);

    if (!mealMenu) {
      throw new NotFoundException('Meal menu not found.');
    }

    return mealMenu;
  }

  private buildMealMenuProps(createMealMenuDto: CreateMealMenuDto): {
    mealMenuProps: CreateMealMenuProps;
    componentNames: string[];
  } {
    const { components, ...mealMenuProps } = createMealMenuDto;

    const componentNames = components.split(' ').filter(Boolean);

    return { mealMenuProps, componentNames };
  }

  private async findOrCreateComponentIds(
    componentNames: string[],
    manager: EntityManager,
  ): Promise<number[]> {
    const uniqueComponents = [
      ...new Set(componentNames.map((component) => component.trim()).filter(Boolean)),
    ];

    const existingComponents = await this.mealMenuRepository.findExistingComponentsByName(
      uniqueComponents,
      manager,
    );

    const existingComponentSet = new Set(existingComponents.map((component) => component.name));

    const nonExistentComponentNames = uniqueComponents
      .filter((componentName) => !existingComponentSet.has(componentName))
      .map((componentName) => ({
        name: componentName,
      }));

    if (nonExistentComponentNames.length > 0) {
      const insertResult = await this.mealMenuRepository.createMealMenuComponent(
        nonExistentComponentNames,
        manager,
      );

      if (insertResult.identifiers.length !== nonExistentComponentNames.length)
        throw new InternalServerErrorException('일부 데이터가 삽입되지 않았습니다.');
    }

    const components = await this.mealMenuRepository.findExistingComponentsByName(
      uniqueComponents,
      manager,
    );

    const componentsMap = new Map(components.map((component) => [component.name, component.id]));

    return uniqueComponents.map((componentName) => componentsMap.get(componentName) as number);
  }
}

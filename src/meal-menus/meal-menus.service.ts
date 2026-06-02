import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { ActionType } from './entities/meal-menu-reaction.entity';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuRepository } from './meal-menus.repository';
import { CreateMealMenuDto } from './dto/create-meal-menu.dto';
import { DataSource } from 'typeorm';
import { CreateMealMenuProps } from './types/meal-menu.type';

@Injectable()
export class MealMenusService {
  constructor(
    private readonly mealMenuRepository: MealMenuRepository,
    private readonly dataSource: DataSource,
  ) {}

  async createMealMenu(createMealMenuDto: CreateMealMenuDto): Promise<MealMenu> {
    const [newNealMenuProps, components] = this.buildMealMenuProps(createMealMenuDto);

    const uniqueComponents = [
      ...new Set(components.map((component) => component.trim()).filter(Boolean)),
    ];

    const existingComponents =
      await this.mealMenuRepository.findExistingComponentsByName(uniqueComponents);
    const existingComponentsName = existingComponents.map((component) => component.name);

    const mealMenuId = await this.dataSource.transaction(async (manager) => {
      const newMealMenu = await this.mealMenuRepository.createMealMenu(newNealMenuProps, manager);

      const mealMenuId = newMealMenu.id;

      const nonExistentComponents = uniqueComponents
        .filter((component) => !existingComponentsName.includes(component))
        .map((component) => ({ name: component }));

      let newComponentIds: number[] = [];
      if (nonExistentComponents.length > 0) {
        const insertResult = await this.mealMenuRepository.createMealMenuComponent(
          nonExistentComponents,
          manager,
        );

        if (insertResult.identifiers.length !== nonExistentComponents.length)
          throw new InternalServerErrorException('일부 데이터가 삽입되지 않았습니다.');

        newComponentIds = insertResult.identifiers.map((component) => component.id as number);
      }

      const existingComponentsId = existingComponents.map((component) => component.id);
      const componentIds = [...existingComponentsId, ...newComponentIds];

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

  private buildMealMenuProps(
    createMealMenuDto: CreateMealMenuDto,
  ): [CreateMealMenuProps, string[]] {
    const { components, ...mealMenuProps } = createMealMenuDto;

    const splitComponents = components.split(' ').filter(Boolean);

    return [mealMenuProps, splitComponents];
  }
}

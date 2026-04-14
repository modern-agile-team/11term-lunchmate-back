import { Injectable, NotFoundException } from '@nestjs/common';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { ActionType } from './entities/meal-menu-reaction.entity';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuRepository } from './meal-menus.repository';

@Injectable()
export class MealMenusService {
  constructor(private readonly mealMenuRepository: MealMenuRepository) {}

  async findMealMenus(query: GetMealMenuListQueryDto): Promise<MealMenu[]> {
    return this.mealMenuRepository.findMany({
      mealDate: query.mealDate,
      mealType: query.mealType,
    });
  }

  async findMealMenuRankings(query: GetMealMenuRankingQueryDto): Promise<MealMenu[]> {
    return this.mealMenuRepository.findRankings({
      mealDate: query.mealDate,
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
}

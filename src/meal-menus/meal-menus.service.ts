import { Injectable, NotFoundException } from '@nestjs/common';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { GetMealMenuRankingQueryDto } from './dto/get-meal-menu-ranking-query.dto';
import { MealMenuDetailResponseDto } from './dto/meal-menu-detail-response.dto';
import { MealMenuListItemResponseDto } from './dto/meal-menu-list-item-response.dto';
import { MealMenuListResponseDto } from './dto/meal-menu-list-response.dto';
import { MealMenuReactionResponseDto } from './dto/meal-menu-reaction-response.dto';
import { ActionType } from './entities/meal-menu-reaction.entity';
import { MealMenu } from './entities/meal-menu.entity';
import { MealMenuRepository } from './meal-menus.repository';

@Injectable()
export class MealMenusService {
  constructor(private readonly mealMenuRepository: MealMenuRepository) {}

  async findMealMenus(query: GetMealMenuListQueryDto): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenuRepository.findMany({
      mealDate: query.mealDate,
      mealType: query.mealType,
    });

    return {
      items: mealMenus.map((mealMenu) => this.toListItem(mealMenu)),
    };
  }

  async findMealMenuRankings(query: GetMealMenuRankingQueryDto): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenuRepository.findRankings({
      mealDate: query.mealDate,
      mealType: query.mealType,
      actionType: query.actionType,
    });

    return {
      items: mealMenus.map((mealMenu) => this.toListItem(mealMenu)),
    };
  }

  async findMealMenuById(mealMenuId: number): Promise<MealMenuDetailResponseDto> {
    const mealMenu = await this.mealMenuRepository.findById(mealMenuId);

    if (!mealMenu) {
      throw new NotFoundException('Meal menu not found.');
    }

    return this.toDetailResponse(mealMenu);
  }

  async likeMealMenu(
    userId: number,
    mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    const mealMenu = await this.mealMenuRepository.findById(mealMenuId);

    if (!mealMenu) {
      throw new NotFoundException('Meal menu not found.');
    }

    const updatedMealMenu = await this.mealMenuRepository.applyLike(userId, mealMenuId);

    return {
      actionType: ActionType.LIKE,
      likeCount: updatedMealMenu.likeCount,
      dislikeCount: updatedMealMenu.dislikeCount,
    };
  }

  async dislikeMealMenu(
    userId: number,
    mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    const mealMenu = await this.mealMenuRepository.findById(mealMenuId);

    if (!mealMenu) {
      throw new NotFoundException('Meal menu not found.');
    }

    const updatedMealMenu = await this.mealMenuRepository.applyDislike(userId, mealMenuId);

    return {
      actionType: ActionType.DISLIKE,
      likeCount: updatedMealMenu.likeCount,
      dislikeCount: updatedMealMenu.dislikeCount,
    };
  }

  private toListItem(mealMenu: MealMenu): MealMenuListItemResponseDto {
    return {
      id: mealMenu.id,
      mealDate: this.formatMealDate(mealMenu.mealDate),
      mealType: mealMenu.mealType,
      menuName: mealMenu.menuName,
      price: mealMenu.price ?? null,
      calorie: mealMenu.calorie ?? null,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
    };
  }

  private toDetailResponse(mealMenu: MealMenu): MealMenuDetailResponseDto {
    return {
      id: mealMenu.id,
      mealDate: this.formatMealDate(mealMenu.mealDate),
      mealType: mealMenu.mealType,
      menuName: mealMenu.menuName,
      price: mealMenu.price ?? null,
      calorie: mealMenu.calorie ?? null,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
    };
  }

  private formatMealDate(mealDate: Date | string): string {
    if (mealDate instanceof Date) {
      return mealDate.toISOString().slice(0, 10);
    }

    return String(mealDate);
  }
}

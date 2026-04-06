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

    return this.toListResponse(mealMenus);
  }

  async findMealMenuRankings(query: GetMealMenuRankingQueryDto): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenuRepository.findRankings({
      mealDate: query.mealDate,
      mealType: query.mealType,
      actionType: query.actionType,
    });

    return this.toListResponse(mealMenus);
  }

  async findMealMenuById(mealMenuId: number): Promise<MealMenuDetailResponseDto> {
    const mealMenu = await this.findMealMenuOrFail(mealMenuId);
    return this.toDetailResponse(mealMenu);
  }

  async likeMealMenu(
    userId: number,
    mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    await this.findMealMenuOrFail(mealMenuId);

    const updatedMealMenu = await this.mealMenuRepository.applyLike(userId, mealMenuId);
    return this.toReactionResponse(ActionType.LIKE, updatedMealMenu);
  }

  async dislikeMealMenu(
    userId: number,
    mealMenuId: number,
  ): Promise<MealMenuReactionResponseDto> {
    await this.findMealMenuOrFail(mealMenuId);

    const updatedMealMenu = await this.mealMenuRepository.applyDislike(userId, mealMenuId);
    return this.toReactionResponse(ActionType.DISLIKE, updatedMealMenu);
  }

  // Keep controllers thin: service owns domain-level not-found handling and
  // chooses the response DTO shape for each MealMenu use case.
  private async findMealMenuOrFail(mealMenuId: number): Promise<MealMenu> {
    const mealMenu = await this.mealMenuRepository.findById(mealMenuId);

    if (!mealMenu) {
      throw new NotFoundException('Meal menu not found.');
    }

    return mealMenu;
  }

  private toListResponse(mealMenus: MealMenu[]): MealMenuListResponseDto {
    return {
      items: mealMenus.map((mealMenu) => this.toListItem(mealMenu)),
    };
  }

  private toReactionResponse(
    actionType: ActionType,
    mealMenu: MealMenu,
  ): MealMenuReactionResponseDto {
    return {
      actionType,
      likeCount: mealMenu.likeCount,
      dislikeCount: mealMenu.dislikeCount,
    };
  }

  // Keep list responses independent so later list-only fields can change without
  // coupling them to detail responses.
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

  // Keep detail responses mapped separately even while the current fields match
  // list items, so the detail contract can evolve on its own.
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

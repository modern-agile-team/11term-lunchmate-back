import { Injectable, NotFoundException } from '@nestjs/common';
import { GetMealMenuListQueryDto } from './dto/get-meal-menu-list-query.dto';
import { MealMenuDetailResponseDto } from './dto/meal-menu-detail-response.dto';
import { MealMenuListItemResponseDto } from './dto/meal-menu-list-item-response.dto';
import { MealMenuListResponseDto } from './dto/meal-menu-list-response.dto';
import { MealMenu } from './entities/meal-menu.entity';
import { MealType } from './entities/meal-menu.entity';
import { FindMealMenusParams, MealMenuRepository } from './meal-menus.repository';

@Injectable()
export class MealMenusService {
  constructor(private readonly mealMenuRepository: MealMenuRepository) {}

  async findMealMenus(query: GetMealMenuListQueryDto): Promise<MealMenuListResponseDto> {
    const mealMenus = await this.mealMenuRepository.findMany(this.toFindMealMenusParams(query));

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

  private toFindMealMenusParams(query: GetMealMenuListQueryDto): FindMealMenusParams {
    return {
      mealDate: query.mealDate,
      mealType: this.normalizeMealType(query.mealType),
    };
  }

  private normalizeMealType(mealType?: MealType): MealType | undefined {
    if (!mealType || mealType === MealType.ALL) {
      return undefined;
    }

    return mealType;
  }

  private toListItem(mealMenu: MealMenu): MealMenuListItemResponseDto {
    return this.toBaseResponse(mealMenu);
  }

  private toDetailResponse(mealMenu: MealMenu): MealMenuDetailResponseDto {
    return this.toBaseResponse(mealMenu);
  }

  private toBaseResponse(
    mealMenu: MealMenu,
  ): MealMenuListItemResponseDto | MealMenuDetailResponseDto {
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

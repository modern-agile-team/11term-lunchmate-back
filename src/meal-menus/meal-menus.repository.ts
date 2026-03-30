import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MealMenu, MealType } from './entities/meal-menu.entity';

export interface FindMealMenusParams {
  mealDate?: string;
  mealType?: MealType;
}

@Injectable()
export class MealMenuRepository {
  constructor(
    @InjectRepository(MealMenu)
    private readonly mealMenuRepository: Repository<MealMenu>,
  ) {}

  async findMany(params: FindMealMenusParams): Promise<MealMenu[]> {
    const query = this.mealMenuRepository
      .createQueryBuilder('mealMenu')
      .orderBy('mealMenu.meal_date', 'DESC')
      .addOrderBy('mealMenu.id', 'DESC');

    if (params.mealDate) {
      query.andWhere('mealMenu.meal_date = :mealDate', { mealDate: params.mealDate });
    }

    if (params.mealType) {
      query.andWhere('mealMenu.meal_type = :mealType', { mealType: params.mealType });
    }

    return query.getMany();
  }

  async findById(mealMenuId: number): Promise<MealMenu | null> {
    return this.mealMenuRepository
      .createQueryBuilder('mealMenu')
      .where('mealMenu.id = :mealMenuId', { mealMenuId })
      .getOne();
  }
}

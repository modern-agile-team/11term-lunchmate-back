import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MealMenu, MealType } from './entities/meal-menu.entity';
import { ActionType, MealMenuReaction } from './entities/meal-menu-reaction.entity';
import { User } from '../users/entities/user.entity';

export interface FindMealMenusParams {
  mealDate?: string;
  mealType?: MealType;
}

export interface FindMealMenuRankingsParams {
  mealDate?: string;
  mealType?: MealType;
  actionType: ActionType;
}

@Injectable()
export class MealMenuRepository {
  constructor(
    @InjectRepository(MealMenu)
    private readonly mealMenuRepository: Repository<MealMenu>,
    @InjectRepository(MealMenuReaction)
    private readonly mealMenuReactionRepository: Repository<MealMenuReaction>,
    private readonly dataSource: DataSource,
  ) {}

  async findMany(params: FindMealMenusParams): Promise<MealMenu[]> {
    const query = this.mealMenuRepository
      .createQueryBuilder('mealMenu')
      .orderBy('mealMenu.meal_date', 'DESC')
      .addOrderBy('mealMenu.id', 'DESC');

    if (params.mealDate) {
      query.andWhere('mealMenu.meal_date = :mealDate', { mealDate: params.mealDate });
    }

    if (params.mealType && params.mealType !== MealType.ALL) {
      query.andWhere('mealMenu.meal_type = :mealType', { mealType: params.mealType });
    }

    return query.getMany();
  }

  async findById(mealMenuId: number): Promise<MealMenu | null> {
    return this.mealMenuRepository.findOneBy({ id: mealMenuId });
  }

  async findRankings(params: FindMealMenuRankingsParams): Promise<MealMenu[]> {
    const query = this.mealMenuRepository.createQueryBuilder('mealMenu');

    if (params.mealDate) {
      query.andWhere('mealMenu.meal_date = :mealDate', { mealDate: params.mealDate });
    }

    if (params.mealType && params.mealType !== MealType.ALL) {
      query.andWhere('mealMenu.meal_type = :mealType', { mealType: params.mealType });
    }

    if (params.actionType === ActionType.LIKE) {
      query.orderBy('mealMenu.like_count', 'DESC');
    } else {
      query.orderBy('mealMenu.dislike_count', 'DESC');
    }

    query.addOrderBy('mealMenu.id', 'DESC');

    return query.getMany();
  }

  async findReactionByUserAndMealMenu(
    userId: number,
    mealMenuId: number,
  ): Promise<MealMenuReaction | null> {
    return this.mealMenuReactionRepository.findOne({
      where: {
        user: { id: userId },
        mealMenu: { id: mealMenuId },
      },
      relations: {
        user: false,
        mealMenu: false,
      },
    });
  }

  async applyLike(userId: number, mealMenuId: number): Promise<MealMenu> {
    return this.dataSource.transaction(async (manager) => {
      const mealMenuRepository = manager.getRepository(MealMenu);
      const mealMenuReactionRepository = manager.getRepository(MealMenuReaction);

      const mealMenu = await mealMenuRepository.findOneByOrFail({ id: mealMenuId });
      const existingReaction = await mealMenuReactionRepository.findOne({
        where: {
          user: { id: userId },
          mealMenu: { id: mealMenuId },
        },
      });

      if (!existingReaction) {
        await mealMenuReactionRepository.save(
          mealMenuReactionRepository.create({
            actionType: ActionType.LIKE,
            user: { id: userId } as User,
            mealMenu: { id: mealMenuId } as MealMenu,
          }),
        );

        mealMenu.likeCount += 1;
      } else if (existingReaction.actionType === ActionType.DISLIKE) {
        existingReaction.actionType = ActionType.LIKE;
        await mealMenuReactionRepository.save(existingReaction);

        mealMenu.likeCount += 1;
        mealMenu.dislikeCount = Math.max(0, mealMenu.dislikeCount - 1);
      }

      await mealMenuRepository.update(mealMenuId, {
        likeCount: mealMenu.likeCount,
        dislikeCount: mealMenu.dislikeCount,
      });

      return mealMenu;
    });
  }

  async applyDislike(userId: number, mealMenuId: number): Promise<MealMenu> {
    return this.dataSource.transaction(async (manager) => {
      const mealMenuRepository = manager.getRepository(MealMenu);
      const mealMenuReactionRepository = manager.getRepository(MealMenuReaction);

      const mealMenu = await mealMenuRepository.findOneByOrFail({ id: mealMenuId });
      const existingReaction = await mealMenuReactionRepository.findOne({
        where: {
          user: { id: userId },
          mealMenu: { id: mealMenuId },
        },
      });

      if (!existingReaction) {
        await mealMenuReactionRepository.save(
          mealMenuReactionRepository.create({
            actionType: ActionType.DISLIKE,
            user: { id: userId } as User,
            mealMenu: { id: mealMenuId } as MealMenu,
          }),
        );

        mealMenu.dislikeCount += 1;
      } else if (existingReaction.actionType === ActionType.LIKE) {
        existingReaction.actionType = ActionType.DISLIKE;
        await mealMenuReactionRepository.save(existingReaction);

        mealMenu.likeCount = Math.max(0, mealMenu.likeCount - 1);
        mealMenu.dislikeCount += 1;
      }

      await mealMenuRepository.update(mealMenuId, {
        likeCount: mealMenu.likeCount,
        dislikeCount: mealMenu.dislikeCount,
      });

      return mealMenu;
    });
  }
}

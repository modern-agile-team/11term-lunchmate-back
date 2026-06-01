import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { MealMenu, MealType } from './entities/meal-menu.entity';
import { ActionType, MealMenuReaction } from './entities/meal-menu-reaction.entity';
import { User } from '../users/entities/user.entity';

export interface FindMealMenusParams {
  mealType?: MealType;
}

export interface FindMealMenuRankingsParams {
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
    const query = this.applyReadFilters(
      this.mealMenuRepository.createQueryBuilder('mealMenu'),
      params,
    );

    query.orderBy('mealMenu.id', 'DESC');

    return query.getMany();
  }

  async findById(mealMenuId: number): Promise<MealMenu | null> {
    // Single-record lookups stay on repository helpers unless they need joins or
    // more complex query composition.
    return this.mealMenuRepository.findOneBy({ id: mealMenuId });
  }

  async findRankings(params: FindMealMenuRankingsParams): Promise<MealMenu[]> {
    const query = this.applyReadFilters(
      this.mealMenuRepository.createQueryBuilder('mealMenu'),
      params,
    );

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
    // Reaction lookup remains simple enough for a standard findOne query.
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

  async applyReaction(
    userId: number,
    mealMenuId: number,
    actionType: ActionType,
  ): Promise<MealMenu> {
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
      const previousActionType = existingReaction?.actionType;

      await this.persistReaction(
        mealMenuReactionRepository,
        existingReaction,
        userId,
        mealMenuId,
        actionType,
      );

      const didChangeCounts = this.applyReactionCounts(mealMenu, previousActionType, actionType);

      if (didChangeCounts) {
        await mealMenuRepository.update(mealMenuId, {
          likeCount: mealMenu.likeCount,
          dislikeCount: mealMenu.dislikeCount,
        });
      }

      return mealMenu;
    });
  }

  private async persistReaction(
    repository: Repository<MealMenuReaction>,
    existingReaction: MealMenuReaction | null,
    userId: number,
    mealMenuId: number,
    actionType: ActionType,
  ): Promise<void> {
    if (!existingReaction) {
      await repository.save(
        repository.create({
          actionType,
          user: { id: userId } as User,
          mealMenu: { id: mealMenuId } as MealMenu,
        }),
      );
      return;
    }

    if (existingReaction.actionType === actionType) {
      return;
    }

    existingReaction.actionType = actionType;
    await repository.save(existingReaction);
  }

  private applyReactionCounts(
    mealMenu: MealMenu,
    previousActionType: ActionType | undefined,
    nextActionType: ActionType,
  ): boolean {
    if (previousActionType === nextActionType) {
      return false;
    }

    if (previousActionType === ActionType.LIKE) {
      mealMenu.likeCount = Math.max(0, mealMenu.likeCount - 1);
    } else if (previousActionType === ActionType.DISLIKE) {
      mealMenu.dislikeCount = Math.max(0, mealMenu.dislikeCount - 1);
    }

    if (nextActionType === ActionType.LIKE) {
      mealMenu.likeCount += 1;
    } else {
      mealMenu.dislikeCount += 1;
    }

    return true;
  }

  private applyReadFilters(
    query: SelectQueryBuilder<MealMenu>,
    params: FindMealMenusParams | FindMealMenuRankingsParams,
  ): SelectQueryBuilder<MealMenu> {
    if (params.mealType && params.mealType !== MealType.ALL) {
      query.andWhere('mealMenu.meal_type = :mealType', { mealType: params.mealType });
    }

    return query;
  }
}

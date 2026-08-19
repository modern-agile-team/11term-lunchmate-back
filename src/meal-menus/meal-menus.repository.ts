import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  In,
  InsertResult,
  Repository,
  SelectQueryBuilder,
  DeleteResult,
  UpdateResult,
} from 'typeorm';
import { MealMenu, MealType } from './entities/meal-menu.entity';
import { ActionType, MealMenuReaction } from './entities/meal-menu-reaction.entity';
import { User } from '../users/entities/user.entity';
import { CreateMealMenuProps, UpdateMealMenuProps } from './types/meal-menu.type';
import { MealMenuComponent } from './entities/meal-menu-component.entity';
import { MealMenuComponentMapping } from './entities/meal-menu-component-mapping.entity';

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
    @InjectRepository(MealMenuComponent)
    private readonly mealMenuComponentRepository: Repository<MealMenuComponent>,

    private readonly dataSource: DataSource,
  ) {}

  async createMealMenu(
    newMealMenuProps: CreateMealMenuProps,
    manager: EntityManager,
  ): Promise<MealMenu> {
    return await manager.save(MealMenu, newMealMenuProps);
  }

  async findMany(params: FindMealMenusParams): Promise<MealMenu[]> {
    const query = this.applyReadFilters(
      this.applyComponentJoins(this.mealMenuRepository.createQueryBuilder('mealMenu')),
      params,
    );

    query.orderBy('mealMenu.id', 'DESC');

    return query.getMany();
  }

  async findById(mealMenuId: number): Promise<MealMenu | null> {
    // Single-record lookups stay on repository helpers unless they need joins or
    // more complex query composition.
    return this.mealMenuRepository.findOne({
      where: { id: mealMenuId },
      relations: {
        mealMenuComponentMappings: {
          mealMenuComponent: true,
        },
      },
    });
  }

  async findRankings(params: FindMealMenuRankingsParams): Promise<MealMenu[]> {
    const query = this.applyReadFilters(
      this.applyComponentJoins(this.mealMenuRepository.createQueryBuilder('mealMenu')),
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

  async findReactionsByUserAndMealMenuIds(
    userId: number,
    mealMenuIds: number[],
  ): Promise<MealMenuReaction[]> {
    if (mealMenuIds.length === 0) return [];

    return this.mealMenuReactionRepository.find({
      where: {
        user: { id: userId },
        mealMenu: { id: In(mealMenuIds) },
      },
      relations: {
        mealMenu: true,
      },
    });
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

  async createMealMenuComponent(
    components: { name: string }[],
    manager: EntityManager,
  ): Promise<InsertResult> {
    return await manager
      .createQueryBuilder(MealMenuComponent, 'meal_menu_components')
      .insert()
      .into(MealMenuComponent)
      .values(components)
      .returning(['id'])
      .execute();
  }

  async findExistingComponentsByName(
    names: string[],
    manager: EntityManager,
  ): Promise<MealMenuComponent[]> {
    return await manager.find(MealMenuComponent, {
      where: {
        name: In(names),
      },
    });
  }

  async createMealMenuComponentMapping(
    mealMenuId: number,
    componentIds: number[],
    manager: EntityManager,
  ): Promise<void> {
    if (!componentIds.length) return;

    await manager
      .createQueryBuilder()
      .insert()
      .into(MealMenuComponentMapping)
      .values(
        componentIds.map((componentId) => ({
          mealMenu: { id: mealMenuId },
          mealMenuComponent: { id: componentId },
        })),
      )
      .execute();
  }

  async updateMealMenu(
    mealMenuId: number,
    mealMenuProps: UpdateMealMenuProps,
    manager: EntityManager,
  ): Promise<UpdateResult> {
    return await manager.update(MealMenu, mealMenuId, mealMenuProps);
  }

  async deleteComponentMappingByMealMenuId(
    mealMenuId: number,
    manager: EntityManager,
  ): Promise<DeleteResult> {
    return await manager.delete(MealMenuComponentMapping, { mealMenu: { id: mealMenuId } });
  }

  async deleteMealMenu(mealMenuId: number): Promise<void> {
    await this.mealMenuRepository.delete(mealMenuId);
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

  private applyComponentJoins(query: SelectQueryBuilder<MealMenu>): SelectQueryBuilder<MealMenu> {
    return query
      .leftJoinAndSelect('mealMenu.mealMenuComponentMappings', 'mealMenuComponentMappings')
      .leftJoinAndSelect('mealMenuComponentMappings.mealMenuComponent', 'mealMenuComponent');
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

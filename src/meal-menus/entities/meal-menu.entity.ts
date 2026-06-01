import { MealMenuReaction } from './meal-menu-reaction.entity';
import { BaseTableEntity } from '../../commons/entities/base.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  ALL = 'ALL',
}

@Entity('meal_menus')
export class MealMenu extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
    name: 'school_info',
  })
  schoolInfo: string;

  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({
    length: 255,
    name: 'menu_name',
  })
  menuName: string;

  @Column({
    nullable: true,
  })
  price: number;

  @Column({
    nullable: true,
  })
  calorie: number;

  @Column({
    default: 0,
    name: 'like_count',
  })
  likeCount: number;

  @Column({
    default: 0,
    name: 'dislike_count',
  })
  dislikeCount: number;

  @OneToMany(() => MealMenuReaction, (MealMenuReaction) => MealMenuReaction.mealMenu)
  reactions: MealMenuReaction[];
}

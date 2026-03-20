import { LunchMenuReaction } from './lunch-menu-reaction.entity';
import { BaseTableEntity } from '../../commons/entities/base.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

export enum MealType {
  BREAKFAST = 'BREAKFAST',
  LUNCH = 'LUNCH',
  DINNER = 'DINNER',
  ALL = 'ALL',
}

@Entity('lunch_menus')
export class LunchMenu extends BaseTableEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
  })
  school: string;

  @Column({
    type: 'date',
    name: 'meal_date',
  })
  mealDate: Date;

  @Column({
    type: 'enum',
    enum: MealType,
    name: 'meal_type',
  })
  mealType: MealType;

  @Column({
    length: 255,
  })
  title: string;

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

  @OneToMany(() => LunchMenuReaction, (lunchMenuReaction) => lunchMenuReaction.lunchMenu)
  reactions: LunchMenuReaction[];
}

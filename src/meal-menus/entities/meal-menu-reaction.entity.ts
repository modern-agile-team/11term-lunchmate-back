import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MealMenu } from './meal-menu.entity';

export enum ActionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

@Entity('meal_menu_reactions')
@Unique(['user', 'mealMenu'])
export class MealMenuReaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'enum',
    enum: ActionType,
    name: 'action_type',
  })
  actionType: ActionType;

  @ManyToOne(() => User, (user) => user.reactions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @ManyToOne(() => MealMenu, (mealMenu) => mealMenu.reactions)
  @JoinColumn({ name: 'meal_menu_id' })
  mealMenu: MealMenu;
}

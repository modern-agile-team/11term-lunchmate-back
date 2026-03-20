import { User } from '../../users/entities/user.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { LunchMenu } from './lunch-menu.entity';

export enum ActionType {
  LIKE = 'LIKE',
  DISLIKE = 'DISLIKE',
}

@Entity('lunch_menu_reactions')
@Unique(['user', 'lunchMenu'])
export class LunchMenuReaction {
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

  @ManyToOne(() => LunchMenu, (lunchMenu) => lunchMenu.reactions)
  @JoinColumn({ name: 'lunch_menu_id' })
  lunchMenu: LunchMenu;
}

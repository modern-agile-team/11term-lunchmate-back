import { MealMenu } from './meal-menu.entity';
import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity('meal_menu_components')
export class MealMenuComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
  })
  name: string;

  @ManyToOne(() => MealMenu, (mealMenu) => mealMenu.components)
  @JoinColumn({ name: 'meal_menu_id' })
  mealMenu: MealMenu;
}

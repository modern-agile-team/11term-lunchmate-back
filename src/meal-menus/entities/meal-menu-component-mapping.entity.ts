import { Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { MealMenu } from './meal-menu.entity';
import { MealMenuComponent } from './meal-menu-component.entity';

@Entity('meal_menu_component_mappings')
@Unique(['mealMenu', 'mealMenuComponent'])
export class MealMenuComponentMapping {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => MealMenu, (mealMenu) => mealMenu.mealMenuComponentMappings, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'meal_menu_id' })
  mealMenu: MealMenu;

  @ManyToOne(
    () => MealMenuComponent,
    (mealMenuComponent) => mealMenuComponent.mealMenuComponentMappings,
  )
  @JoinColumn({ name: 'meal_menu_component_id' })
  mealMenuComponent: MealMenuComponent;
}

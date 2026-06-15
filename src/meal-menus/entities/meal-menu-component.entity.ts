import { MealMenuComponentMapping } from './meal-menu-component-mapping.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('meal_menu_components')
export class MealMenuComponent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 100,
  })
  name: string;

  @OneToMany(
    () => MealMenuComponentMapping,
    (mealMenuComponentMapping) => mealMenuComponentMapping.mealMenuComponent,
  )
  mealMenuComponentMappings: MealMenuComponentMapping[];
}

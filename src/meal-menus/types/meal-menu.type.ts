import { MealType } from '../entities/meal-menu.entity';

export type CreateMealMenuProps = {
  menuName: string;
  mealType: MealType;
  schoolInfo: string;
  price: number;
  calorie: number;
};

export type UpdateMealMenuProps = Partial<CreateMealMenuProps>;

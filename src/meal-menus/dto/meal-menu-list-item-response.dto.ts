import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../entities/meal-menu.entity';

export class MealMenuListItemResponseDto {
  id: number;

  mealDate: string;

  @ApiProperty({ enum: MealType })
  mealType: MealType;

  menuName: string;

  @ApiProperty({ nullable: true })
  price: number | null;

  @ApiProperty({ nullable: true })
  calorie: number | null;

  likeCount: number;

  dislikeCount: number;
}

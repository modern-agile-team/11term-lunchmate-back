import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../entities/meal-menu.entity';

export class MealMenuListItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  mealDate: string;

  @ApiProperty({ enum: MealType })
  mealType: MealType;

  @ApiProperty()
  menuName: string;

  @ApiProperty({ nullable: true })
  price: number | null;

  @ApiProperty({ nullable: true })
  calorie: number | null;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  dislikeCount: number;
}

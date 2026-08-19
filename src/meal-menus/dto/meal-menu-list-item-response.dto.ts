import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../entities/meal-menu.entity';
import { ActionType } from '../entities/meal-menu-reaction.entity';

export class MealMenuListItemResponseDto {
  id: number;

  @ApiProperty({ enum: MealType })
  mealType: MealType;

  menuName: string;

  @ApiProperty({ nullable: true })
  price: number | null;

  @ApiProperty({ nullable: true })
  calorie: number | null;

  likeCount: number;

  dislikeCount: number;

  schoolInfo: string;

  components: string[];

  @ApiProperty({ enum: ActionType, nullable: true })
  myReaction: ActionType | null;
}

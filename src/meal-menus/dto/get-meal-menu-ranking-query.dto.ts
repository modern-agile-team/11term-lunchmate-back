import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { ActionType } from '../entities/meal-menu-reaction.entity';
import { MealType } from '../entities/meal-menu.entity';

export class GetMealMenuRankingQueryDto {
  @ApiPropertyOptional({
    enum: MealType,
    example: MealType.LUNCH,
  })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiProperty({
    enum: ActionType,
    example: ActionType.LIKE,
  })
  @IsEnum(ActionType)
  actionType: ActionType;
}

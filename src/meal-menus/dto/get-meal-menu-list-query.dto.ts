import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { MealType } from '../entities/meal-menu.entity';

export class GetMealMenuListQueryDto {
  @ApiPropertyOptional({
    enum: MealType,
    example: MealType.LUNCH,
  })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;
}

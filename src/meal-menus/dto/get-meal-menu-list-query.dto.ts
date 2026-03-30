import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { MealType } from '../entities/meal-menu.entity';

export class GetMealMenuListQueryDto {
  @ApiPropertyOptional({
    example: '2026-03-30',
  })
  @IsOptional()
  @IsDateString()
  mealDate?: string;

  @ApiPropertyOptional({
    enum: MealType,
    example: MealType.LUNCH,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsEnum(MealType)
  mealType?: MealType;
}

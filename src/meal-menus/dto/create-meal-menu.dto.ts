import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../entities/meal-menu.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { MEAL_MENU_CONSTANT } from '../constants/meal-menu.constant';
import { Transform } from 'class-transformer';

export class CreateMealMenuDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '제육덮밥', description: '학식 메뉴 이름' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_NAME_LENGTH)
  menuName: string;

  @ApiProperty({ enum: MealType, example: MealType.LUNCH, description: '학식 식사 구분' })
  @IsEnum(MealType)
  @IsNotEmpty()
  mealType: MealType;

  @ApiProperty({ example: 5000, description: '학식 가격' })
  @IsNumber()
  @Min(MEAL_MENU_CONSTANT.MIN_PRICE)
  @Max(MEAL_MENU_CONSTANT.MAX_PRICE)
  price: number;

  @ApiProperty({ example: 550, description: '학식 칼로리' })
  @IsNumber()
  @Min(MEAL_MENU_CONSTANT.MIN_CALRORIE)
  @Max(MEAL_MENU_CONSTANT.MAX_CALRORIE)
  calorie: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '인덕대학교 학생식당', description: '학식 제공 학교 또는 식당 정보' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_SCHOOL_LENGTH)
  schoolInfo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({
    example: '밥 미역국 불고기 오뎅볶음 배추김치',
    description: '공백으로 구분된 학식 구성 요소 목록',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_COMPONENT_LENGTH)
  components: string;
}

import { ApiProperty, PickType } from '@nestjs/swagger';
import { MealMenu, MealType } from '../entities/meal-menu.entity';
import { IsEnum, IsNotEmpty, IsNumber, IsString, Max, MaxLength, Min } from 'class-validator';
import { MEAL_MENU_CONSTANT } from '../constants/meal-menu.constant';
import { Transform } from 'class-transformer';
import { MealMenuComponent } from '../entities/meal-menu-component.entity';

export class CreateMealMenuDto extends PickType(MealMenu, [
  'menuName',
  'mealType',
  'price',
  'calorie',
  'schoolInfo',
]) {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '제육덮밥' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_NAME_LENGTH)
  menuName: string;

  @ApiProperty({ example: MealType.LUNCH })
  @IsEnum(MealType)
  @IsNotEmpty()
  mealType: MealType;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(MEAL_MENU_CONSTANT.MIN_PRICE)
  @Max(MEAL_MENU_CONSTANT.MAX_PRICE)
  price: number;

  @ApiProperty({ example: 550 })
  @IsNumber()
  @Min(MEAL_MENU_CONSTANT.MIN_CALRORIE)
  @Max(MEAL_MENU_CONSTANT.MAX_CALRORIE)
  calorie: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '인덕대학교 학생식당' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_SCHOOL_LENGTH)
  schoolInfo: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '밥 미역국 불고기 오뎅볶음 배추김치' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(MEAL_MENU_CONSTANT.MAX_COMPONENT_LENGTH)
  components: string;
}

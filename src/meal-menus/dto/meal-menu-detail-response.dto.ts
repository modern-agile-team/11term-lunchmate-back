import { ApiProperty } from '@nestjs/swagger';
import { MealType } from '../entities/meal-menu.entity';

export class MealMenuDetailResponseDto {
  @ApiProperty({ example: 1, description: '학식 id' })
  id: number;

  @ApiProperty({ enum: MealType, example: MealType.LUNCH, description: '학식 식사 구분' })
  mealType: MealType;

  @ApiProperty({ example: '제육덮밥', description: '학식 메뉴 이름' })
  menuName: string;

  @ApiProperty({ example: 5000, nullable: true, description: '학식 가격' })
  price: number | null;

  @ApiProperty({ example: 550, nullable: true, description: '학식 칼로리' })
  calorie: number | null;

  @ApiProperty({ example: 0, description: '좋아요 수' })
  likeCount: number;

  @ApiProperty({ example: 0, description: '싫어요 수' })
  dislikeCount: number;

  @ApiProperty({ example: '학생식당', description: '식당 이름' })
  schoolInfo: string;

  @ApiProperty({
    example: ['밥', '미역국', '불고기', '오뎅볶음', '배추김치'],
    description: '학식 구성 요소 목록',
  })
  components: string[];
}

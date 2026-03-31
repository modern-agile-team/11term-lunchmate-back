import { ApiProperty } from '@nestjs/swagger';
import { MealMenuListItemResponseDto } from './meal-menu-list-item-response.dto';

export class MealMenuListResponseDto {
  @ApiProperty({ type: [MealMenuListItemResponseDto] })
  items: MealMenuListItemResponseDto[];
}

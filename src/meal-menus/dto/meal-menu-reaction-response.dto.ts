import { ApiProperty } from '@nestjs/swagger';
import { ActionType } from '../entities/meal-menu-reaction.entity';

export class MealMenuReactionResponseDto {
  @ApiProperty({ enum: ActionType })
  actionType: ActionType;

  @ApiProperty()
  likeCount: number;

  @ApiProperty()
  dislikeCount: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { ActionType } from '../entities/meal-menu-reaction.entity';

export class MealMenuReactionResponseDto {
  @ApiProperty({ enum: ActionType, nullable: true })
  actionType: ActionType | null;

  likeCount: number;

  dislikeCount: number;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';
import { PAGINATION_CONSTANTS } from '../constants/post.constant';

export class FindPostsQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(PAGINATION_CONSTANTS.MIN_CURSOR_ID)
  cursor?: number;

  @ApiPropertyOptional({
    minimum: PAGINATION_CONSTANTS.MIN_LIMIT,
    maximum: PAGINATION_CONSTANTS.MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @Min(PAGINATION_CONSTANTS.MIN_LIMIT)
  @Max(PAGINATION_CONSTANTS.MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;
}

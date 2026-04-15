import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, Max, Min } from 'class-validator';
import { PAGINATION_CONSTANTS } from '../constants/post.constant';

export class FindPostsQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  cursor?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: PAGINATION_CONSTANTS.MAX_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(PAGINATION_CONSTANTS.MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  categoryId?: number;
}

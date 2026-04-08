import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { RoomStatus, RoomType } from '../entities/room.entity';
import { PAGINATION_CONSTANTS, ROOM_CONSTANTS } from '../constants/room.constant';

export class FindRoomsQueryDto {
  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  cursor?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PAGINATION_CONSTANTS.MAX_LIMIT,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAGINATION_CONSTANTS.MAX_LIMIT)
  limit?: number;

  @ApiPropertyOptional({ enum: RoomType })
  @IsOptional()
  @IsEnum(RoomType)
  roomType?: RoomType;

  @ApiPropertyOptional({ enum: RoomStatus })
  @IsOptional()
  @IsEnum(RoomStatus)
  status?: RoomStatus;

  @ApiPropertyOptional({ minimum: ROOM_CONSTANTS.MIN_AGE, maximum: ROOM_CONSTANTS.MAX_AGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ROOM_CONSTANTS.MIN_AGE)
  @Max(ROOM_CONSTANTS.MAX_AGE)
  minAge?: number;

  @ApiPropertyOptional({ minimum: ROOM_CONSTANTS.MIN_AGE, maximum: ROOM_CONSTANTS.MAX_AGE })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(ROOM_CONSTANTS.MIN_AGE)
  @Max(ROOM_CONSTANTS.MAX_AGE)
  maxAge?: number;

  @ApiPropertyOptional({
    description: '조회 시작 식사 시간(이상)',
    example: '2026-03-31 12:00:00.00',
  })
  @IsOptional()
  @IsDateString()
  lunchAtFrom?: string;

  @ApiPropertyOptional({
    description: '조회 종료 식사 시간(이하)',
    example: '2026-03-31 14:00:00',
  })
  @IsOptional()
  @IsDateString()
  lunchAtTo?: string;
}

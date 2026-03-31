import { ApiProperty, ApiPropertyOptional, PickType } from '@nestjs/swagger';
import { Room, RoomType } from '../entities/room.entity';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ROOM_CONSTANTS } from '../constants/room.constant';
import { Transform } from 'class-transformer';

export class CreateRoomDto extends PickType(Room, [
  'title',
  'roomType',
  'maxMembersCount',
  'maxAge',
  'minAge',
  'place',
  'lunchAt',
  'description',
]) {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '밥 같이 먹을 사람' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_CONSTANTS.TITLE_MAX_LENGTH)
  title: string;

  @ApiProperty({ enum: RoomType, example: RoomType.MALE })
  @IsEnum(RoomType)
  @IsNotEmpty()
  roomType: RoomType;

  @ApiProperty({
    example: 4,
    minimum: ROOM_CONSTANTS.MIN_MEMBERS,
    maximum: ROOM_CONSTANTS.MAX_MEMBERS,
  })
  @IsNumber()
  @IsNotEmpty()
  @Min(ROOM_CONSTANTS.MIN_MEMBERS)
  @Max(ROOM_CONSTANTS.MAX_MEMBERS)
  maxMembersCount: number;

  @ApiProperty({
    example: 24,
    minimum: ROOM_CONSTANTS.MIN_AGE,
    maximum: ROOM_CONSTANTS.MAX_AGE,
  })
  @IsNumber()
  @IsNotEmpty()
  @Max(ROOM_CONSTANTS.MAX_AGE)
  @Min(ROOM_CONSTANTS.MIN_AGE)
  maxAge: number;

  @ApiProperty({
    example: 20,
    minimum: ROOM_CONSTANTS.MIN_AGE,
    maximum: ROOM_CONSTANTS.MAX_AGE,
  })
  @IsNumber()
  @IsNotEmpty()
  @Max(ROOM_CONSTANTS.MAX_AGE)
  @Min(ROOM_CONSTANTS.MIN_AGE)
  minAge: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiProperty({ example: '학식당 앞' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_CONSTANTS.PLACE_MAX_LENGTH)
  place: string;

  @ApiProperty({ example: '2026-03-30T12:30:00+09:00' })
  @IsDateString()
  @IsNotEmpty()
  lunchAt: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @ApiPropertyOptional({ example: '난 컴소과', nullable: true })
  @IsString()
  @IsOptional()
  description: string;
}

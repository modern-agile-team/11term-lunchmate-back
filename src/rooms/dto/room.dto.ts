import { PickType } from '@nestjs/swagger';
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_CONSTANTS.TITLE_MAX_LENGTH)
  title: string;

  @IsEnum(RoomType)
  @IsNotEmpty()
  roomType: RoomType;

  @IsNumber()
  @IsNotEmpty()
  @Min(ROOM_CONSTANTS.MIN_MEMBERS)
  @Max(ROOM_CONSTANTS.MAX_MEMBERS)
  maxMembersCount: number;

  @IsNumber()
  @IsNotEmpty()
  @Max(ROOM_CONSTANTS.MAX_AGE)
  maxAge: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(ROOM_CONSTANTS.MIN_AGE)
  minAge: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(ROOM_CONSTANTS.PLACE_MAX_LENGTH)
  place: string;

  @IsDateString()
  @IsNotEmpty()
  lunchAt: string;

  @IsString()
  @IsOptional()
  description: string;
}

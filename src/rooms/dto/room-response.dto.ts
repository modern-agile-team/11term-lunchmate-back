import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus, RoomType } from '../entities/room.entity';
import { ResponseRoomMemberDto } from './room-member.response.dto';

export class ResponseRoomItemDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  title: string;

  @ApiProperty({ nullable: true })
  description: string | null;

  @ApiProperty({ enum: RoomType })
  roomType: RoomType;

  @ApiProperty({ enum: RoomStatus })
  status: RoomStatus;

  @ApiProperty()
  maxMembersCount: number;

  @ApiProperty()
  currentMembersCount: number;

  @ApiProperty()
  minAge: number;

  @ApiProperty()
  maxAge: number;

  @ApiProperty()
  place: string;

  @ApiProperty()
  lunchAt: string;

  @ApiProperty()
  hostUserId: number;
}

export class ResponseRoomListDto {
  @ApiProperty({ type: () => [ResponseRoomItemDto] })
  items: ResponseRoomItemDto[];

  @ApiProperty({ nullable: true })
  nextCursor: number | null;

  @ApiProperty()
  hasNext: boolean;
}

export class ResponseRoomDetailDto extends ResponseRoomItemDto {
  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: () => [ResponseRoomMemberDto] })
  roomMembers: ResponseRoomMemberDto[];
}

export class ResponseOpenRoomsCountDto {
  @ApiProperty()
  openRoomsCount: number;
}

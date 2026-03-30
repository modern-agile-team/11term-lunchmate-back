import { ApiProperty } from '@nestjs/swagger';
import { RoomStatus, RoomType } from '../entities/room.entity';

export class ResponseRoomMemberDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  nickname: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  gender: 'MALE' | 'FEMALE';

  @ApiProperty()
  schoolInfo: string;
}

export class ResponseRoomDetailDto {
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
  createdAt: string;

  @ApiProperty()
  hostUserId: number;

  @ApiProperty({ type: () => [ResponseRoomMemberDto] })
  roomMembers: ResponseRoomMemberDto[];
}

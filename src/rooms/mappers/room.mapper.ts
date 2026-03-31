import {
  ResponseRoomDetailDto,
  ResponseRoomListDto,
  ResponseRoomItemDto,
} from '../dto/room-response.dto';
import { Room } from '../entities/room.entity';

export class RoomMapper {
  static toItemDto(room: Room): ResponseRoomItemDto {
    return {
      id: room.id,
      title: room.title,
      description: room.description,
      roomType: room.roomType,
      status: room.status,
      maxMembersCount: room.maxMembersCount,
      currentMembersCount: room.currentMembersCount,
      minAge: room.minAge,
      maxAge: room.maxAge,
      place: room.place,
      lunchAt: room.lunchAt,
      hostUserId: room.hostUser.id,
    };
  }

  static toListDto(
    rooms: Room[],
    nextCursor: number | null,
    hasNext: boolean,
  ): ResponseRoomListDto {
    return {
      items: rooms.map((room) => this.toItemDto(room)),
      nextCursor,
      hasNext,
    };
  }

  static toDetailDto(room: Room): ResponseRoomDetailDto {
    return {
      ...this.toItemDto(room),
      createdAt: room.createdAt,
      roomMembers: room.roomMembers.map((member) => ({
        id: member.user.id,
        nickname: member.user.nickname,
        gender: member.user.gender,
        schoolInfo: member.user.schoolInfo,
      })),
    };
  }
}

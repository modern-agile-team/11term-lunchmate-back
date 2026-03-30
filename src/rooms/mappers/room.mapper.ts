import { ResponseRoomDetailDto } from '../dto/room-response.dto';
import { Room } from '../entities/room.entity';

export class RoomMapper {
  static toDetailDto(room: Room): ResponseRoomDetailDto {
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
      createdAt: room.createdAt,
      hostUserId: room.hostUser.id,
      roomMembers: room.roomMembers.map((member) => ({
        id: member.user.id,
        nickname: member.user.nickname,
        gender: member.user.gender,
        schoolInfo: member.user.schoolInfo,
      })),
    };
  }
}
